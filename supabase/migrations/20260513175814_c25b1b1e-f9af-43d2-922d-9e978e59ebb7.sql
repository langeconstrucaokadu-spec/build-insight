
-- 1. Permissions table
CREATE TABLE public.project_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create_report boolean NOT NULL DEFAULT false,
  can_upload_photo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_permissions_user ON public.project_permissions(user_id);
CREATE INDEX idx_project_permissions_project ON public.project_permissions(project_id);

ALTER TABLE public.project_permissions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_project_permissions_updated
BEFORE UPDATE ON public.project_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Security definer helper
CREATE OR REPLACE FUNCTION public.has_project_permission(_user_id uuid, _project_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_permissions
    WHERE user_id = _user_id
      AND project_id = _project_id
      AND CASE _perm
        WHEN 'view' THEN can_view
        WHEN 'report' THEN can_create_report
        WHEN 'photo' THEN can_upload_photo
        ELSE false
      END
  );
$$;

-- 3. RLS for project_permissions (admin only manage; user can read own row)
CREATE POLICY "Admins manage project permissions"
ON public.project_permissions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own project permissions"
ON public.project_permissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 4. Extend SELECT policies on project-scoped tables to include permitted users

-- construction_projects
DROP POLICY IF EXISTS "Public can view public projects" ON public.construction_projects;
CREATE POLICY "Public can view public projects"
ON public.construction_projects FOR SELECT TO anon, authenticated
USING (
  is_public = true
  OR has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = client_id
  OR has_project_permission(auth.uid(), id, 'view')
);

-- project_categories
DROP POLICY IF EXISTS "Members can view categories" ON public.project_categories;
CREATE POLICY "Members can view categories"
ON public.project_categories FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM construction_projects p WHERE p.id = project_categories.project_id AND p.client_id = auth.uid())
  OR has_project_permission(auth.uid(), project_id, 'view')
);

-- project_subcategories
DROP POLICY IF EXISTS "Members can view subcategories" ON public.project_subcategories;
CREATE POLICY "Members can view subcategories"
ON public.project_subcategories FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM construction_projects p WHERE p.id = project_subcategories.project_id AND p.client_id = auth.uid())
  OR has_project_permission(auth.uid(), project_id, 'view')
);

-- project_items
DROP POLICY IF EXISTS "Members can view items" ON public.project_items;
CREATE POLICY "Members can view items"
ON public.project_items FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM construction_projects p WHERE p.id = project_items.project_id AND p.client_id = auth.uid())
  OR has_project_permission(auth.uid(), project_id, 'view')
);

-- project_schedule
DROP POLICY IF EXISTS "Project members can view schedule" ON public.project_schedule;
CREATE POLICY "Project members can view schedule"
ON public.project_schedule FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM construction_projects p WHERE p.id = project_schedule.project_id AND p.client_id = auth.uid())
  OR has_project_permission(auth.uid(), project_id, 'view')
);

-- project_reports SELECT
DROP POLICY IF EXISTS "Project members can view reports" ON public.project_reports;
CREATE POLICY "Project members can view reports"
ON public.project_reports FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM construction_projects p WHERE p.id = project_reports.project_id AND p.client_id = auth.uid())
  OR has_project_permission(auth.uid(), project_id, 'view')
);

-- project_reports INSERT: allow users with report permission
DROP POLICY IF EXISTS "Admins can create reports" ON public.project_reports;
CREATE POLICY "Permitted users can create reports"
ON public.project_reports FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_project_permission(auth.uid(), project_id, 'report')
  )
);

-- report_media SELECT
DROP POLICY IF EXISTS "Project members can view report media" ON public.report_media;
CREATE POLICY "Project members can view report media"
ON public.report_media FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (project_id IS NOT NULL AND has_project_permission(auth.uid(), project_id, 'view'))
  OR (report_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM project_reports r JOIN construction_projects p ON p.id = r.project_id
        WHERE r.id = report_media.report_id AND p.client_id = auth.uid()))
  OR (report_id IS NULL AND project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM construction_projects p WHERE p.id = report_media.project_id AND p.client_id = auth.uid()))
);

-- report_media INSERT: allow users with photo permission
DROP POLICY IF EXISTS "Admins can create report media" ON public.report_media;
CREATE POLICY "Permitted users can upload report media"
ON public.report_media FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (project_id IS NOT NULL AND has_project_permission(auth.uid(), project_id, 'photo'))
);

-- Note: DELETE/UPDATE policies remain admin-only on all project tables.
-- Storage bucket 'project-media' policies (if any) follow same admin/user split via RLS already in place.

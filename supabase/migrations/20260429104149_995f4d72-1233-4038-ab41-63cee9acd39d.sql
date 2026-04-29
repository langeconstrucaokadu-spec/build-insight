CREATE TYPE public.app_role AS ENUM ('admin', 'client');
CREATE TYPE public.project_status AS ENUM ('planning', 'in_progress', 'completed');
CREATE TYPE public.schedule_status AS ENUM ('pending', 'in_progress', 'completed', 'delayed');
CREATE TYPE public.media_type AS ENUM ('photo', 'video');

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.construction_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  status public.project_status NOT NULL DEFAULT 'planning',
  client_id UUID,
  start_date DATE,
  estimated_delivery_date DATE,
  progress INTEGER NOT NULL DEFAULT 0,
  cover_image_url TEXT,
  current_stage TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_portfolio BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT construction_projects_progress_range CHECK (progress >= 0 AND progress <= 100)
);

CREATE TABLE public.project_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  stage TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.report_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.project_reports(id) ON DELETE CASCADE,
  media_type public.media_type NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stage TEXT
);

CREATE TABLE public.project_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  planned_start_date DATE NOT NULL,
  planned_end_date DATE NOT NULL,
  status public.schedule_status NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_schedule_progress_range CHECK (progress >= 0 AND progress <= 100)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_schedule ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_construction_projects_updated_at
BEFORE UPDATE ON public.construction_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_reports_updated_at
BEFORE UPDATE ON public.project_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_schedule_updated_at
BEFORE UPDATE ON public.project_schedule
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view public projects"
ON public.construction_projects
FOR SELECT
TO anon, authenticated
USING (is_public = true OR public.has_role(auth.uid(), 'admin') OR auth.uid() = client_id);

CREATE POLICY "Admins can create projects"
ON public.construction_projects
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update projects"
ON public.construction_projects
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete projects"
ON public.construction_projects
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Project members can view reports"
ON public.project_reports
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.construction_projects p
    WHERE p.id = project_reports.project_id
      AND p.client_id = auth.uid()
  )
);

CREATE POLICY "Admins can create reports"
ON public.project_reports
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins can update reports"
ON public.project_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reports"
ON public.project_reports
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Project members can view report media"
ON public.report_media
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1
    FROM public.project_reports r
    JOIN public.construction_projects p ON p.id = r.project_id
    WHERE r.id = report_media.report_id
      AND p.client_id = auth.uid()
  )
);

CREATE POLICY "Admins can create report media"
ON public.report_media
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update report media"
ON public.report_media
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete report media"
ON public.report_media
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Project members can view schedule"
ON public.project_schedule
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.construction_projects p
    WHERE p.id = project_schedule.project_id
      AND p.client_id = auth.uid()
  )
);

CREATE POLICY "Admins can create schedule"
ON public.project_schedule
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update schedule"
ON public.project_schedule
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete schedule"
ON public.project_schedule
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_construction_projects_client_id ON public.construction_projects(client_id);
CREATE INDEX idx_construction_projects_public ON public.construction_projects(is_public, is_portfolio, status);
CREATE INDEX idx_project_reports_project_date ON public.project_reports(project_id, report_date DESC);
CREATE INDEX idx_report_media_report_id ON public.report_media(report_id);
CREATE INDEX idx_project_schedule_project_id ON public.project_schedule(project_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-media', 'project-media', false);

CREATE POLICY "Project members can view private media files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-media'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.construction_projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.client_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can upload private media files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update private media files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete private media files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'admin'));
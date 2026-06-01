-- Add new fields to construction_projects
ALTER TABLE public.construction_projects
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS observation text,
  ADD COLUMN IF NOT EXISTS filled_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone NOT NULL DEFAULT now();

-- Trigger function to bump last_activity_at on related tables
CREATE OR REPLACE FUNCTION public.trg_bump_project_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    pid := OLD.project_id;
  ELSE
    pid := NEW.project_id;
  END IF;
  IF pid IS NOT NULL THEN
    UPDATE public.construction_projects
       SET last_activity_at = now()
     WHERE id = pid;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bump_activity_reports ON public.project_reports;
CREATE TRIGGER bump_activity_reports
AFTER INSERT OR UPDATE OR DELETE ON public.project_reports
FOR EACH ROW EXECUTE FUNCTION public.trg_bump_project_activity();

DROP TRIGGER IF EXISTS bump_activity_items ON public.project_items;
CREATE TRIGGER bump_activity_items
AFTER INSERT OR UPDATE OR DELETE ON public.project_items
FOR EACH ROW EXECUTE FUNCTION public.trg_bump_project_activity();

DROP TRIGGER IF EXISTS bump_activity_schedule ON public.project_schedule;
CREATE TRIGGER bump_activity_schedule
AFTER INSERT OR UPDATE OR DELETE ON public.project_schedule
FOR EACH ROW EXECUTE FUNCTION public.trg_bump_project_activity();

DROP TRIGGER IF EXISTS bump_activity_media ON public.report_media;
CREATE TRIGGER bump_activity_media
AFTER INSERT OR UPDATE OR DELETE ON public.report_media
FOR EACH ROW EXECUTE FUNCTION public.trg_bump_project_activity();

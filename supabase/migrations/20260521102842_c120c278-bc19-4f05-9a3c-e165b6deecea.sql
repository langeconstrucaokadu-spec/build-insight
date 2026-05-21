-- 1) Garantir que toda foto da galeria esteja vinculada a uma obra
DELETE FROM public.report_media WHERE project_id IS NULL;
ALTER TABLE public.report_media ALTER COLUMN project_id SET NOT NULL;

-- 2) Atualizar etapa atual da obra com base na categoria do último relatório criado
CREATE OR REPLACE FUNCTION public.trg_report_sync_current_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat_name text;
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT name INTO cat_name FROM public.project_categories WHERE id = NEW.category_id;
  IF cat_name IS NOT NULL THEN
    UPDATE public.construction_projects
       SET current_stage = cat_name,
           updated_at = now()
     WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS report_sync_current_stage ON public.project_reports;
CREATE TRIGGER report_sync_current_stage
AFTER INSERT OR UPDATE OF category_id ON public.project_reports
FOR EACH ROW EXECUTE FUNCTION public.trg_report_sync_current_stage();
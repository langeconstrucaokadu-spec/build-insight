
-- Recalcula status e data de entrega de um item com base nos relatórios
CREATE OR REPLACE FUNCTION public.recalc_item_status(_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest RECORD;
  new_status public.item_status;
  new_delivered date;
BEGIN
  IF _item_id IS NULL THEN RETURN; END IF;

  SELECT execution_status, report_date
    INTO latest
  FROM public.project_reports
  WHERE item_id = _item_id AND execution_status IS NOT NULL
  ORDER BY report_date DESC, created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    new_status := 'pendente';
    new_delivered := NULL;
  ELSIF latest.execution_status = 'finalizando' THEN
    new_status := 'finalizada';
    new_delivered := latest.report_date;
  ELSE
    new_status := 'em_andamento';
    new_delivered := NULL;
  END IF;

  UPDATE public.project_items
     SET status = new_status,
         delivered_date = new_delivered,
         updated_at = now()
   WHERE id = _item_id;
END;
$$;

-- Recalcula progresso da obra com base nos itens finalizados
CREATE OR REPLACE FUNCTION public.recalc_project_progress(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
  done int;
  pct int;
BEGIN
  IF _project_id IS NULL THEN RETURN; END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'finalizada')
    INTO total, done
  FROM public.project_items
  WHERE project_id = _project_id;

  IF total = 0 THEN
    pct := 0;
  ELSE
    pct := ROUND((done::numeric / total::numeric) * 100);
  END IF;

  UPDATE public.construction_projects
     SET progress = pct,
         updated_at = now()
   WHERE id = _project_id;
END;
$$;

-- Trigger function: ao mudar um relatório, recalcula item(s) afetado(s) e projeto
CREATE OR REPLACE FUNCTION public.trg_report_sync_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_project uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_item_status(OLD.item_id);
    affected_project := OLD.project_id;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.recalc_item_status(NEW.item_id);
    affected_project := NEW.project_id;
  ELSE
    IF NEW.item_id IS DISTINCT FROM OLD.item_id THEN
      PERFORM public.recalc_item_status(OLD.item_id);
    END IF;
    PERFORM public.recalc_item_status(NEW.item_id);
    affected_project := NEW.project_id;
  END IF;

  PERFORM public.recalc_project_progress(affected_project);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS report_sync_item ON public.project_reports;
CREATE TRIGGER report_sync_item
AFTER INSERT OR UPDATE OR DELETE ON public.project_reports
FOR EACH ROW EXECUTE FUNCTION public.trg_report_sync_item();

-- Quando um item é criado/excluído, recalcula progresso da obra
CREATE OR REPLACE FUNCTION public.trg_item_recalc_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_project_progress(OLD.project_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_project_progress(NEW.project_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS item_recalc_project ON public.project_items;
CREATE TRIGGER item_recalc_project
AFTER INSERT OR DELETE OR UPDATE OF status, project_id ON public.project_items
FOR EACH ROW EXECUTE FUNCTION public.trg_item_recalc_project();

-- Recalcula tudo que já existe
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.project_items LOOP
    PERFORM public.recalc_item_status(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.construction_projects LOOP
    PERFORM public.recalc_project_progress(r.id);
  END LOOP;
END $$;

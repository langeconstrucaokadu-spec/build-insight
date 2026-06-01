CREATE OR REPLACE FUNCTION public.trg_report_autofill_actual_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.item_id IS NULL OR NEW.execution_status IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.execution_status = 'comecando' THEN
    UPDATE public.project_items
       SET actual_start_date = NEW.report_date,
           start_date = COALESCE(start_date, NEW.report_date),
           updated_at = now()
     WHERE id = NEW.item_id
       AND actual_start_date IS NULL;
  ELSIF NEW.execution_status = 'finalizando' THEN
    UPDATE public.project_items
       SET actual_end_date = NEW.report_date,
           updated_at = now()
     WHERE id = NEW.item_id
       AND actual_end_date IS NULL;
    -- Garante início real preenchido caso o primeiro relatório já seja de finalização
    UPDATE public.project_items
       SET actual_start_date = NEW.report_date,
           updated_at = now()
     WHERE id = NEW.item_id
       AND actual_start_date IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS report_autofill_actual_dates ON public.project_reports;
CREATE TRIGGER report_autofill_actual_dates
AFTER INSERT OR UPDATE OF execution_status, report_date, item_id
ON public.project_reports
FOR EACH ROW
EXECUTE FUNCTION public.trg_report_autofill_actual_dates();

-- Backfill para relatórios existentes (apenas onde itens ainda não têm datas reais)
WITH first_start AS (
  SELECT item_id, MIN(report_date) AS d
  FROM public.project_reports
  WHERE item_id IS NOT NULL AND execution_status = 'comecando'
  GROUP BY item_id
)
UPDATE public.project_items i
   SET actual_start_date = fs.d,
       updated_at = now()
  FROM first_start fs
 WHERE i.id = fs.item_id
   AND i.actual_start_date IS NULL;

WITH last_end AS (
  SELECT item_id, MAX(report_date) AS d
  FROM public.project_reports
  WHERE item_id IS NOT NULL AND execution_status = 'finalizando'
  GROUP BY item_id
)
UPDATE public.project_items i
   SET actual_end_date = le.d,
       updated_at = now()
  FROM last_end le
 WHERE i.id = le.item_id
   AND i.actual_end_date IS NULL;
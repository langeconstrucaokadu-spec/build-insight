ALTER TABLE public.project_items
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_start_date date,
  ADD COLUMN IF NOT EXISTS planned_end_date date,
  ADD COLUMN IF NOT EXISTS actual_start_date date,
  ADD COLUMN IF NOT EXISTS actual_end_date date,
  ADD COLUMN IF NOT EXISTS observation text,
  ADD COLUMN IF NOT EXISTS delay_justification text;

-- Backfill planned/actual from legacy columns when possible
UPDATE public.project_items
   SET planned_start_date = COALESCE(planned_start_date, start_date),
       planned_end_date   = COALESCE(planned_end_date, expected_date),
       actual_start_date  = COALESCE(actual_start_date, start_date),
       actual_end_date    = COALESCE(actual_end_date, delivered_date);

CREATE INDEX IF NOT EXISTS idx_project_items_order ON public.project_items(project_id, order_index);
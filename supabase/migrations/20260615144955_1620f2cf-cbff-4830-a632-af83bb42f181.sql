
-- ============== FINANCIAL CATEGORIES ==============
CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);
CREATE INDEX idx_financial_categories_project ON public.financial_categories(project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view financial categories"
  ON public.financial_categories FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.construction_projects p WHERE p.id = financial_categories.project_id AND p.client_id = auth.uid())
    OR has_project_permission(auth.uid(), project_id, 'view')
  );
CREATE POLICY "Admins insert financial categories"
  ON public.financial_categories FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update financial categories"
  ON public.financial_categories FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete financial categories"
  ON public.financial_categories FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_financial_categories_updated_at
  BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== FINANCIAL ITEMS ==============
CREATE TABLE public.financial_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.financial_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);
CREATE INDEX idx_financial_items_project ON public.financial_items(project_id);
CREATE INDEX idx_financial_items_category ON public.financial_items(category_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_items TO authenticated;
GRANT ALL ON public.financial_items TO service_role;
ALTER TABLE public.financial_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view financial items"
  ON public.financial_items FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.construction_projects p WHERE p.id = financial_items.project_id AND p.client_id = auth.uid())
    OR has_project_permission(auth.uid(), project_id, 'view')
  );
CREATE POLICY "Admins insert financial items"
  ON public.financial_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update financial items"
  ON public.financial_items FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete financial items"
  ON public.financial_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_financial_items_updated_at
  BEFORE UPDATE ON public.financial_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== PROJECT FINANCIAL COSTS ==============
CREATE TABLE public.project_financial_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  financial_category_id uuid NOT NULL REFERENCES public.financial_categories(id) ON DELETE RESTRICT,
  financial_item_id uuid NOT NULL REFERENCES public.financial_items(id) ON DELETE RESTRICT,
  date date NOT NULL,
  buyer text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_financial_costs_project ON public.project_financial_costs(project_id);
CREATE INDEX idx_project_financial_costs_category ON public.project_financial_costs(financial_category_id);
CREATE INDEX idx_project_financial_costs_item ON public.project_financial_costs(financial_item_id);
CREATE INDEX idx_project_financial_costs_date ON public.project_financial_costs(date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_financial_costs TO authenticated;
GRANT ALL ON public.project_financial_costs TO service_role;
ALTER TABLE public.project_financial_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view financial costs"
  ON public.project_financial_costs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.construction_projects p WHERE p.id = project_financial_costs.project_id AND p.client_id = auth.uid())
    OR has_project_permission(auth.uid(), project_id, 'view')
  );
CREATE POLICY "Authorized users insert financial costs"
  ON public.project_financial_costs FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_project_permission(auth.uid(), project_id, 'report')
  );
CREATE POLICY "Authorized users update financial costs"
  ON public.project_financial_costs FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_project_permission(auth.uid(), project_id, 'report')
  );
CREATE POLICY "Authorized users delete financial costs"
  ON public.project_financial_costs FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_project_permission(auth.uid(), project_id, 'report')
  );

CREATE TRIGGER trg_project_financial_costs_updated_at
  BEFORE UPDATE ON public.project_financial_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation: financial category and item must belong to same project
CREATE OR REPLACE FUNCTION public.trg_validate_financial_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat_project uuid;
  item_project uuid;
  item_category uuid;
BEGIN
  SELECT project_id INTO cat_project FROM public.financial_categories WHERE id = NEW.financial_category_id;
  SELECT project_id, category_id INTO item_project, item_category FROM public.financial_items WHERE id = NEW.financial_item_id;

  IF cat_project IS NULL OR item_project IS NULL THEN
    RAISE EXCEPTION 'Categoria/Item financeiro inválido.';
  END IF;
  IF cat_project <> NEW.project_id OR item_project <> NEW.project_id THEN
    RAISE EXCEPTION 'Categoria e item financeiros devem pertencer à mesma obra.';
  END IF;
  IF item_category <> NEW.financial_category_id THEN
    RAISE EXCEPTION 'O item financeiro não pertence à categoria informada.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_financial_cost_ins
  BEFORE INSERT OR UPDATE ON public.project_financial_costs
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_financial_cost();

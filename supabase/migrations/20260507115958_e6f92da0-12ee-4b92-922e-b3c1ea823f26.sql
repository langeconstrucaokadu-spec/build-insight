
-- Status enum para itens
DO $$ BEGIN
  CREATE TYPE public.item_status AS ENUM ('pendente', 'em_andamento', 'finalizada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Status de execução para relatórios
DO $$ BEGIN
  CREATE TYPE public.report_execution_status AS ENUM ('comecando', 'desenvolvendo', 'finalizando');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ CATEGORIAS ============
CREATE TABLE public.project_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories" ON public.project_categories
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
  SELECT 1 FROM construction_projects p WHERE p.id = project_categories.project_id AND p.client_id = auth.uid()
));
CREATE POLICY "Admins manage categories ins" ON public.project_categories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage categories upd" ON public.project_categories FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage categories del" ON public.project_categories FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_project_categories_updated BEFORE UPDATE ON public.project_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SUBCATEGORIAS ============
CREATE TABLE public.project_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.project_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subcategories" ON public.project_subcategories
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
  SELECT 1 FROM construction_projects p WHERE p.id = project_subcategories.project_id AND p.client_id = auth.uid()
));
CREATE POLICY "Admins manage subcat ins" ON public.project_subcategories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage subcat upd" ON public.project_subcategories FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage subcat del" ON public.project_subcategories FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_project_subcategories_updated BEFORE UPDATE ON public.project_subcategories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ITENS ============
CREATE TABLE public.project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.project_categories(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES public.project_subcategories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  expected_date DATE,
  delivered_date DATE,
  status public.item_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view items" ON public.project_items
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
  SELECT 1 FROM construction_projects p WHERE p.id = project_items.project_id AND p.client_id = auth.uid()
));
CREATE POLICY "Admins manage items ins" ON public.project_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage items upd" ON public.project_items FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage items del" ON public.project_items FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_project_items_updated BEFORE UPDATE ON public.project_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_items_project ON public.project_items(project_id);
CREATE INDEX idx_items_category ON public.project_items(category_id);
CREATE INDEX idx_items_subcategory ON public.project_items(subcategory_id);
CREATE INDEX idx_subcat_category ON public.project_subcategories(category_id);
CREATE INDEX idx_categories_project ON public.project_categories(project_id);

-- ============ AJUSTES EM TABELAS EXISTENTES ============

-- project_reports: vínculo com hierarquia + status de execução
ALTER TABLE public.project_reports
  ADD COLUMN category_id UUID REFERENCES public.project_categories(id) ON DELETE SET NULL,
  ADD COLUMN subcategory_id UUID REFERENCES public.project_subcategories(id) ON DELETE SET NULL,
  ADD COLUMN item_id UUID REFERENCES public.project_items(id) ON DELETE SET NULL,
  ADD COLUMN execution_status public.report_execution_status;

-- report_media: vínculo direto com obra/categoria/subcategoria/item + descrição
ALTER TABLE public.report_media
  ADD COLUMN project_id UUID REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  ADD COLUMN category_id UUID REFERENCES public.project_categories(id) ON DELETE SET NULL,
  ADD COLUMN subcategory_id UUID REFERENCES public.project_subcategories(id) ON DELETE SET NULL,
  ADD COLUMN item_id UUID REFERENCES public.project_items(id) ON DELETE SET NULL,
  ADD COLUMN description TEXT,
  ADD COLUMN captured_at DATE;

-- project_schedule: vínculo opcional com item
ALTER TABLE public.project_schedule
  ADD COLUMN item_id UUID REFERENCES public.project_items(id) ON DELETE SET NULL,
  ADD COLUMN category_id UUID REFERENCES public.project_categories(id) ON DELETE SET NULL,
  ADD COLUMN subcategory_id UUID REFERENCES public.project_subcategories(id) ON DELETE SET NULL;

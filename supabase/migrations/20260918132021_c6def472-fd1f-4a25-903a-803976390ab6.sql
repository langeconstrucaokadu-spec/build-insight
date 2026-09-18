CREATE TYPE public.inventory_item_type AS ENUM ('material','ferramenta','equipamento','epi','outros');
CREATE TYPE public.inventory_owner AS ENUM ('lange','contratante');
CREATE TYPE public.inventory_unit AS ENUM ('unidade','saco','caixa','litro','metro','kg','m2','m3','outro');
CREATE TYPE public.inventory_location_type AS ENUM ('galpao','obra');

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.inventory_item_type NOT NULL DEFAULT 'material',
  owner public.inventory_owner NOT NULL DEFAULT 'lange',
  quantity numeric NOT NULL DEFAULT 0,
  unit public.inventory_unit NOT NULL DEFAULT 'unidade',
  unit_other text,
  location_type public.inventory_location_type NOT NULL DEFAULT 'galpao',
  project_id uuid REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  observation text,
  -- preparado para o futuro (nao exibido na interface hoje)
  is_individually_tracked boolean NOT NULL DEFAULT false,
  identifier text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam inventario"
ON public.inventory_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuarios veem galpao e obras permitidas"
ON public.inventory_items FOR SELECT TO authenticated
USING (
  location_type = 'galpao'
  OR (project_id IS NOT NULL AND public.has_project_permission(auth.uid(), project_id, 'view'))
);

CREATE POLICY "Usuarios com permissao criam itens da obra"
ON public.inventory_items FOR INSERT TO authenticated
WITH CHECK (
  project_id IS NOT NULL AND public.has_project_permission(auth.uid(), project_id, 'report')
);

CREATE POLICY "Usuarios com permissao editam itens da obra"
ON public.inventory_items FOR UPDATE TO authenticated
USING (project_id IS NOT NULL AND public.has_project_permission(auth.uid(), project_id, 'report'))
WITH CHECK (project_id IS NOT NULL AND public.has_project_permission(auth.uid(), project_id, 'report'));

CREATE OR REPLACE FUNCTION public.trg_validate_inventory_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.location_type = 'galpao' THEN
    NEW.project_id := NULL;
  ELSIF NEW.project_id IS NULL THEN
    RAISE EXCEPTION 'Selecione a obra para itens localizados em obra.';
  END IF;
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Quantidade nao pode ser negativa.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_validate_location
BEFORE INSERT OR UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_inventory_location();

CREATE TRIGGER trg_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_inventory_items_project ON public.inventory_items(project_id);
CREATE INDEX idx_inventory_items_location ON public.inventory_items(location_type);
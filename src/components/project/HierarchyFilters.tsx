import { useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["project_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["project_subcategories"]["Row"];
type Item = Database["public"]["Tables"]["project_items"]["Row"];

export type HierarchyFilterValue = {
  categoryId: string;
  subcategoryId: string;
  itemId: string;
  status: string;
  date: string;
};

export const emptyHierarchyFilter: HierarchyFilterValue = {
  categoryId: "all",
  subcategoryId: "all",
  itemId: "all",
  status: "all",
  date: "",
};

type StatusOption = { value: string; label: string };

type Props = {
  categories: Category[];
  subcategories: Subcategory[];
  items: Item[];
  value: HierarchyFilterValue;
  onChange: (next: HierarchyFilterValue) => void;
  statusOptions?: StatusOption[];
  dateLabel?: string;
};

const HierarchyFilters = ({ categories, subcategories, items, value, onChange, statusOptions, dateLabel = "A partir de" }: Props) => {
  const visibleSubs = useMemo(
    () => (value.categoryId === "all" ? subcategories : subcategories.filter((s) => s.category_id === value.categoryId)),
    [subcategories, value.categoryId],
  );
  const visibleItems = useMemo(() => {
    let list = items;
    if (value.categoryId !== "all") list = list.filter((i) => i.category_id === value.categoryId);
    if (value.subcategoryId !== "all") list = list.filter((i) => i.subcategory_id === value.subcategoryId);
    return list;
  }, [items, value.categoryId, value.subcategoryId]);

  const update = (patch: Partial<HierarchyFilterValue>) => {
    const next = { ...value, ...patch };
    if (patch.categoryId !== undefined) {
      next.subcategoryId = "all";
      next.itemId = "all";
    } else if (patch.subcategoryId !== undefined) {
      next.itemId = "all";
    }
    onChange(next);
  };

  const hasActive = value.categoryId !== "all" || value.subcategoryId !== "all" || value.itemId !== "all" || value.status !== "all" || value.date !== "";

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
      <select className="auth-field" value={value.categoryId} onChange={(e) => update({ categoryId: e.target.value })}>
        <option value="all">Todas as categorias</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="auth-field" value={value.subcategoryId} onChange={(e) => update({ subcategoryId: e.target.value })}>
        <option value="all">Todas as subcategorias</option>
        {visibleSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select className="auth-field" value={value.itemId} onChange={(e) => update({ itemId: e.target.value })}>
        <option value="all">Todos os itens</option>
        {visibleItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select>
      {statusOptions && (
        <select className="auth-field" value={value.status} onChange={(e) => update({ status: e.target.value })}>
          <option value="all">Todos os status</option>
          {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      )}
      <input className="auth-field" type="date" value={value.date} onChange={(e) => update({ date: e.target.value })} aria-label={dateLabel} placeholder={dateLabel} />
      {hasActive && (
        <button type="button" onClick={() => onChange(emptyHierarchyFilter)} className="text-xs text-muted-foreground underline justify-self-start">
          Limpar filtros
        </button>
      )}
    </div>
  );
};

export default HierarchyFilters;
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import ItemFormDialog from "@/components/modals/ItemFormDialog";
import MediaViewerDialog, { type MediaFilter } from "@/components/modals/MediaViewerDialog";
import HierarchyFilters, { emptyHierarchyFilter, type HierarchyFilterValue } from "@/components/project/HierarchyFilters";

type Category = Database["public"]["Tables"]["project_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["project_subcategories"]["Row"];
type Item = Database["public"]["Tables"]["project_items"]["Row"];

const statusLabels: Record<Item["status"], string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
};

const ScheduleHierarchy = ({ projectId, isAdmin, refreshKey = 0 }: { projectId: string; isAdmin: boolean; refreshKey?: number }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewer, setViewer] = useState<{ title: string; filter: MediaFilter } | null>(null);
  const [filters, setFilters] = useState<HierarchyFilterValue>(emptyHierarchyFilter);

  const filtersActive = filters.categoryId !== "all" || filters.subcategoryId !== "all" || filters.itemId !== "all" || filters.status !== "all" || filters.date !== "";

  const openMedia = (e: React.MouseEvent, title: string, filter: MediaFilter) => {
    e.stopPropagation();
    setViewer({ title, filter });
  };

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: s }, { data: i }] = await Promise.all([
        supabase.from("project_categories").select("*").eq("project_id", projectId).order("name"),
        supabase.from("project_subcategories").select("*").eq("project_id", projectId).order("name"),
        supabase.from("project_items").select("*").eq("project_id", projectId).order("name"),
      ]);
      setCategories(c ?? []);
      setSubcategories(s ?? []);
      setItems(i ?? []);
    })();
  }, [projectId, refreshKey]);

  const visibleSubs = useMemo(() => subcategories.filter((s) => s.category_id === selectedCategory), [subcategories, selectedCategory]);
  const visibleItems = useMemo(() => items.filter((i) => i.subcategory_id === selectedSub), [items, selectedSub]);

  const filteredFlatItems = useMemo(() => items.filter((i) => {
    if (filters.categoryId !== "all" && i.category_id !== filters.categoryId) return false;
    if (filters.subcategoryId !== "all" && i.subcategory_id !== filters.subcategoryId) return false;
    if (filters.itemId !== "all" && i.id !== filters.itemId) return false;
    if (filters.status !== "all" && i.status !== filters.status) return false;
    if (filters.date && i.expected_date && i.expected_date < filters.date) return false;
    return true;
  }), [items, filters]);

  const back = () => {
    if (selectedSub) setSelectedSub(null);
    else if (selectedCategory) setSelectedCategory(null);
  };

  return (
    <div>
      <div className="panel-head">
        <div className="flex items-center gap-2">
          {!filtersActive && (selectedCategory || selectedSub) && (
            <Button size="sm" variant="outline" onClick={back}><ChevronLeft className="size-4" /> Voltar</Button>
          )}
          <h2>
            {filtersActive && `Itens filtrados (${filteredFlatItems.length})`}
            {!filtersActive && !selectedCategory && "Categorias"}
            {!filtersActive && selectedCategory && !selectedSub && `Subcategorias · ${categories.find((c) => c.id === selectedCategory)?.name}`}
            {!filtersActive && selectedSub && `Itens · ${subcategories.find((s) => s.id === selectedSub)?.name}`}
          </h2>
        </div>
        {isAdmin && (
          <Button variant="construction" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Adicionar novo item
          </Button>
        )}
      </div>

      <HierarchyFilters
        categories={categories}
        subcategories={subcategories}
        items={items}
        value={filters}
        onChange={setFilters}
        statusOptions={[
          { value: "pendente", label: "Pendente" },
          { value: "em_andamento", label: "Em andamento" },
          { value: "finalizada", label: "Finalizada" },
        ]}
        dateLabel="Prevista a partir de"
      />

      {filtersActive ? (
        <div className="mt-6 grid gap-3">
          {filteredFlatItems.map((i) => (
            <div key={i.id} className="schedule-row">
              <div>
                <strong>{i.name}</strong>
                <p>
                  {categories.find((c) => c.id === i.category_id)?.name} · {subcategories.find((s) => s.id === i.subcategory_id)?.name}
                </p>
                <p>Prevista: {i.expected_date ?? "—"} · Entregue: {i.delivered_date ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="status-pill">{statusLabels[i.status]}</span>
                <Button size="sm" variant="outline" onClick={(e) => openMedia(e, `Fotos · ${i.name}`, { projectId, itemId: i.id })}>
                  <ImageIcon className="size-3" /> Ver fotos
                </Button>
              </div>
            </div>
          ))}
          {!filteredFlatItems.length && <p className="text-sm text-muted-foreground">Nenhum item encontrado para os filtros.</p>}
        </div>
      ) : (
      <div className="mt-6 grid gap-3">
        {!selectedCategory && categories.map((c) => {
          const count = subcategories.filter((s) => s.category_id === c.id).length;
          return (
            <button key={c.id} onClick={() => setSelectedCategory(c.id)} className="schedule-row text-left hover:bg-secondary/40 transition">
              <div><strong>{c.name}</strong><p>{count} subcategoria(s)</p></div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={(e) => openMedia(e, `Fotos · ${c.name}`, { projectId, categoryId: c.id })}>
                  <ImageIcon className="size-3" /> Ver fotos
                </Button>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
        {!categories.length && !selectedCategory && (
          <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada para esta obra.</p>
        )}

        {selectedCategory && !selectedSub && visibleSubs.map((s) => {
          const count = items.filter((i) => i.subcategory_id === s.id).length;
          return (
            <button key={s.id} onClick={() => setSelectedSub(s.id)} className="schedule-row text-left hover:bg-secondary/40 transition">
              <div><strong>{s.name}</strong><p>{count} item(ns)</p></div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={(e) => openMedia(e, `Fotos · ${s.name}`, { projectId, subcategoryId: s.id })}>
                  <ImageIcon className="size-3" /> Ver fotos
                </Button>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
        {selectedCategory && !selectedSub && !visibleSubs.length && (
          <p className="text-sm text-muted-foreground">Nenhuma subcategoria nesta categoria.</p>
        )}

        {selectedSub && visibleItems.map((i) => (
          <div key={i.id} className="schedule-row">
            <div>
              <strong>{i.name}</strong>
              <p>Prevista: {i.expected_date ?? "—"} · Entregue: {i.delivered_date ?? "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-pill">{statusLabels[i.status]}</span>
              <Button size="sm" variant="outline" onClick={(e) => openMedia(e, `Fotos · ${i.name}`, { projectId, itemId: i.id })}>
                <ImageIcon className="size-3" /> Ver fotos
              </Button>
            </div>
          </div>
        ))}
        {selectedSub && !visibleItems.length && (
          <p className="text-sm text-muted-foreground">Nenhum item cadastrado nesta subcategoria.</p>
        )}
      </div>
      )}

      <ItemFormDialog
        open={creating}
        onOpenChange={setCreating}
        projectId={projectId}
        categories={categories}
        subcategories={subcategories}
        defaultCategoryId={selectedCategory}
        defaultSubcategoryId={selectedSub}
        onSaved={(item) => {
          setItems((prev) => [...prev, item]);
          setSelectedCategory(item.category_id);
          setSelectedSub(item.subcategory_id);
        }}
      />

      <MediaViewerDialog
        open={!!viewer}
        onOpenChange={(o) => !o && setViewer(null)}
        title={viewer?.title ?? "Fotos"}
        filter={viewer?.filter ?? null}
      />
    </div>
  );
};

export default ScheduleHierarchy;
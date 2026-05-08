import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import ItemFormDialog from "@/components/modals/ItemFormDialog";
import MediaViewerDialog, { type MediaFilter } from "@/components/modals/MediaViewerDialog";

type Category = Database["public"]["Tables"]["project_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["project_subcategories"]["Row"];
type Item = Database["public"]["Tables"]["project_items"]["Row"];

const statusLabels: Record<Item["status"], string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
};

const ScheduleHierarchy = ({ projectId, isAdmin }: { projectId: string; isAdmin: boolean }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewer, setViewer] = useState<{ title: string; filter: MediaFilter } | null>(null);

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
  }, [projectId]);

  const visibleSubs = useMemo(() => subcategories.filter((s) => s.category_id === selectedCategory), [subcategories, selectedCategory]);
  const visibleItems = useMemo(() => items.filter((i) => i.subcategory_id === selectedSub), [items, selectedSub]);

  const back = () => {
    if (selectedSub) setSelectedSub(null);
    else if (selectedCategory) setSelectedCategory(null);
  };

  return (
    <div>
      <div className="panel-head">
        <div className="flex items-center gap-2">
          {(selectedCategory || selectedSub) && (
            <Button size="sm" variant="outline" onClick={back}><ChevronLeft className="size-4" /> Voltar</Button>
          )}
          <h2>
            {!selectedCategory && "Categorias"}
            {selectedCategory && !selectedSub && `Subcategorias · ${categories.find((c) => c.id === selectedCategory)?.name}`}
            {selectedSub && `Itens · ${subcategories.find((s) => s.id === selectedSub)?.name}`}
          </h2>
        </div>
        {isAdmin && (
          <Button variant="construction" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Adicionar novo item
          </Button>
        )}
      </div>

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
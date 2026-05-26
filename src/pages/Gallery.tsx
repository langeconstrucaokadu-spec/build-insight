import { useEffect, useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type Media = Database["public"]["Tables"]["report_media"]["Row"];
type Report = Pick<Database["public"]["Tables"]["project_reports"]["Row"], "id" | "title" | "report_date" | "project_id">;
type Project = Pick<Database["public"]["Tables"]["construction_projects"]["Row"], "id" | "name">;
type Category = Database["public"]["Tables"]["project_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["project_subcategories"]["Row"];
type ItemRow = Database["public"]["Tables"]["project_items"]["Row"];

type Enriched = Media & { resolvedUrl: string; reportTitle?: string };

const BUCKET = "project-media";
const PLACEHOLDER = "/placeholder.svg";

const resolveUrl = (file_url: string) => {
  if (!file_url) return PLACEHOLDER;
  if (/^https?:\/\//i.test(file_url)) return file_url;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(file_url);
  return data.publicUrl;
};

const Gallery = () => {
  const [items, setItems] = useState<Enriched[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [projectItems, setProjectItems] = useState<ItemRow[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [itemFilter, setItemFilter] = useState("all");
  const [date, setDate] = useState("");
  const [active, setActive] = useState<Enriched | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: media }, { data: reports }, { data: projs }, { data: cats }, { data: subs }, { data: itms }] = await Promise.all([
        supabase.from("report_media").select("*").order("uploaded_at", { ascending: false }).limit(500),
        supabase.from("project_reports").select("id,title,report_date,project_id"),
        supabase.from("construction_projects").select("id,name"),
        supabase.from("project_categories").select("*").order("name"),
        supabase.from("project_subcategories").select("*").order("name"),
        supabase.from("project_items").select("*").order("name"),
      ]);
      setProjects(projs ?? []);
      setCategories(cats ?? []);
      setSubcategories(subs ?? []);
      setProjectItems(itms ?? []);
      const reportsList = (reports ?? []) as Report[];
      const enriched: Enriched[] = (media ?? []).map((m) => {
        const r = reportsList.find((x) => x.id === m.report_id);
        return { ...m, resolvedUrl: resolveUrl(m.file_url), reportTitle: r?.title };
      });
      setItems(enriched);
    })();
  }, []);

  const projectName = (id?: string | null) => projects.find((p) => p.id === id)?.name ?? "Obra";
  const categoryName = (id?: string | null) => categories.find((c) => c.id === id)?.name ?? "Geral";
  const subcategoryName = (id?: string | null) => subcategories.find((s) => s.id === id)?.name ?? "";
  const itemName = (id?: string | null) => projectItems.find((i) => i.id === id)?.name ?? "";

  const visibleCats = useMemo(
    () => projectFilter === "all" ? categories : categories.filter((c) => c.project_id === projectFilter),
    [categories, projectFilter],
  );
  const visibleSubs = useMemo(
    () => categoryFilter === "all" ? subcategories.filter((s) => projectFilter === "all" || s.project_id === projectFilter) : subcategories.filter((s) => s.category_id === categoryFilter),
    [subcategories, categoryFilter, projectFilter],
  );
  const visibleItems = useMemo(() => {
    let list = projectItems;
    if (projectFilter !== "all") list = list.filter((i) => i.project_id === projectFilter);
    if (categoryFilter !== "all") list = list.filter((i) => i.category_id === categoryFilter);
    if (subcategoryFilter !== "all") list = list.filter((i) => i.subcategory_id === subcategoryFilter);
    return list;
  }, [projectItems, projectFilter, categoryFilter, subcategoryFilter]);

  const onProject = (v: string) => { setProjectFilter(v); setCategoryFilter("all"); setSubcategoryFilter("all"); setItemFilter("all"); };
  const onCategory = (v: string) => { setCategoryFilter(v); setSubcategoryFilter("all"); setItemFilter("all"); };
  const onSubcategory = (v: string) => { setSubcategoryFilter(v); setItemFilter("all"); };

  const filtered = useMemo(() => items.filter((it) => {
    if (projectFilter !== "all" && it.project_id !== projectFilter) return false;
    if (categoryFilter !== "all" && it.category_id !== categoryFilter) return false;
    if (subcategoryFilter !== "all" && it.subcategory_id !== subcategoryFilter) return false;
    if (itemFilter !== "all" && it.item_id !== itemFilter) return false;
    if (date) {
      const d = it.captured_at ?? new Date(it.uploaded_at).toISOString().slice(0, 10);
      if (d < date) return false;
    }
    return true;
  }), [items, projectFilter, categoryFilter, subcategoryFilter, itemFilter, date]);

  return (
    <DashboardLayout title="Galeria" kicker="Fotos e vídeos das obras">
      <section className="dashboard-panel">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <select className="auth-field" value={projectFilter} onChange={(e) => onProject(e.target.value)}>
            <option value="all">Todas as obras</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="auth-field" value={categoryFilter} onChange={(e) => onCategory(e.target.value)}>
            <option value="all">Todas as categorias</option>
            {visibleCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="auth-field" value={subcategoryFilter} onChange={(e) => onSubcategory(e.target.value)}>
            <option value="all">Todas as subcategorias</option>
            {visibleSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="auth-field" value={itemFilter} onChange={(e) => setItemFilter(e.target.value)}>
            <option value="all">Todos os itens</option>
            {visibleItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <input className="auth-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="A partir de" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((item) => {
          const sub = subcategoryName(item.subcategory_id);
          const itm = itemName(item.item_id);
          const detail = [sub, itm].filter(Boolean).join(" · ") || "Geral";
          const dateStr = item.captured_at ?? new Date(item.uploaded_at).toISOString().slice(0, 10);
          const alt = item.reportTitle || item.description || itm || "Mídia da obra";
          return (
            <button key={item.id} onClick={() => setActive(item)} className="media-preview-card group text-left">
              {item.media_type === "video" ? (
                <video src={item.resolvedUrl} muted className="aspect-[4/3] w-full bg-muted object-cover" />
              ) : (
                <img
                  src={item.resolvedUrl}
                  alt={alt}
                  loading="lazy"
                  className="aspect-[4/3] w-full bg-muted object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src.endsWith(PLACEHOLDER)) return;
                    img.src = PLACEHOLDER;
                    img.classList.add("opacity-60");
                  }}
                />
              )}
              <div>
                <strong>{item.reportTitle ?? itm ?? "Sem título"}</strong>
                <p>{projectName(item.project_id)} · {categoryName(item.category_id)} · {detail} · {dateStr}</p>
              </div>
            </button>
          );
        })}
        {!filtered.length && (
          <div className="dashboard-panel sm:col-span-2 lg:col-span-3 xl:col-span-4 grid place-items-center gap-2 py-10 text-muted-foreground">
            <ImageIcon className="size-8" />
            <p>Nenhuma mídia encontrada.</p>
          </div>
        )}
      </section>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl">
          {active && (
            <div className="grid gap-4">
              {active.media_type === "video"
                ? <video controls src={active.resolvedUrl} className="w-full rounded-lg bg-black" />
                : <img src={active.resolvedUrl} alt={active.reportTitle ?? "Mídia ampliada"} className="w-full rounded-lg" onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} />}
              <div>
                <p className="section-kicker">{projectName(active.project_id)}</p>
                <h2 className="font-display text-xl font-bold">{active.reportTitle ?? itemName(active.item_id) ?? "Sem título"}</h2>
                <p className="text-sm text-muted-foreground">{categoryName(active.category_id)} · {[subcategoryName(active.subcategory_id), itemName(active.item_id)].filter(Boolean).join(" · ") || "Geral"} · {active.captured_at ?? new Date(active.uploaded_at).toISOString().slice(0, 10)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Gallery;
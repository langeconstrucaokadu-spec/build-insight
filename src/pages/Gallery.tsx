import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type Media = Database["public"]["Tables"]["report_media"]["Row"];
type Report = Pick<Database["public"]["Tables"]["project_reports"]["Row"], "id" | "title" | "report_date" | "project_id">;
type Project = Pick<Database["public"]["Tables"]["construction_projects"]["Row"], "id" | "name">;

type Item = Media & { signedUrl?: string; reportTitle?: string; reportDate?: string; projectId?: string };

const Gallery = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Item | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: media }, { data: reports }, { data: projs }] = await Promise.all([
        supabase.from("report_media").select("*").order("uploaded_at", { ascending: false }).limit(500),
        supabase.from("project_reports").select("id,title,report_date,project_id"),
        supabase.from("construction_projects").select("id,name"),
      ]);
      setProjects(projs ?? []);
      const reportsList = (reports ?? []) as Report[];
      const enriched = await Promise.all((media ?? []).map(async (m) => {
        const { data: signed } = await supabase.storage.from("project-media").createSignedUrl(m.file_url, 60 * 60);
        const r = reportsList.find((x) => x.id === m.report_id);
        return { ...m, signedUrl: signed?.signedUrl, reportTitle: r?.title, reportDate: r?.report_date, projectId: r?.project_id };
      }));
      setItems(enriched);
    })();
  }, []);

  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name ?? "Obra";

  const filtered = useMemo(() => items.filter((it) => {
    if (projectFilter !== "all" && it.projectId !== projectFilter) return false;
    if (from && (it.reportDate ?? "") < from) return false;
    if (to && (it.reportDate ?? "") > to) return false;
    if (search && !`${it.reportTitle ?? ""} ${it.stage ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, projectFilter, from, to, search]);

  return (
    <DashboardLayout title="Galeria" kicker="Fotos e vídeos das obras">
      <section className="dashboard-panel">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="auth-field pl-10" placeholder="Buscar por relatório ou etapa" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select className="auth-field" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">Todas as obras</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="auth-field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="auth-field" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((item) => (
          <button key={item.id} onClick={() => setActive(item)} className="media-preview-card group text-left">
            {item.media_type === "video"
              ? <video src={item.signedUrl} muted className="aspect-[4/3] w-full bg-muted object-cover" />
              : <img src={item.signedUrl} alt={item.reportTitle ?? "Mídia da obra"} loading="lazy" />}
            <div>
              <strong>{item.reportTitle ?? "Sem título"}</strong>
              <p>{projectName(item.projectId)} · {item.stage || "Geral"} · {item.reportDate ?? ""}</p>
            </div>
          </button>
        ))}
        {!filtered.length && <p className="dashboard-panel sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center text-muted-foreground">Nenhuma mídia encontrada.</p>}
      </section>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl">
          {active && (
            <div className="grid gap-4">
              {active.media_type === "video"
                ? <video controls src={active.signedUrl} className="w-full rounded-lg bg-black" />
                : <img src={active.signedUrl} alt={active.reportTitle ?? "Mídia ampliada"} className="w-full rounded-lg" />}
              <div>
                <p className="section-kicker">{projectName(active.projectId)}</p>
                <h2 className="font-display text-xl font-bold">{active.reportTitle}</h2>
                <p className="text-sm text-muted-foreground">{active.stage || "Geral"} · {active.reportDate}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Gallery;
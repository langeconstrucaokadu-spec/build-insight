import { useEffect, useMemo, useState } from "react";
import { Edit, List, Trash2, GanttChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { scheduleLabels } from "@/data/demo";
import DashboardLayout, { useDashboardRole } from "@/components/dashboard/DashboardLayout";
import ScheduleFormDialog from "@/components/modals/ScheduleFormDialog";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { toast } from "sonner";

type Schedule = Database["public"]["Tables"]["project_schedule"]["Row"];
type Project = Pick<Database["public"]["Tables"]["construction_projects"]["Row"], "id" | "name">;

const SchedulePage = () => {
  const { isAdmin } = useDashboardRole();
  const [items, setItems] = useState<Schedule[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<"list" | "timeline">("list");
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState<Schedule | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from("project_schedule").select("*").order("planned_start_date"),
        supabase.from("construction_projects").select("id,name"),
      ]);
      setItems(s ?? []);
      setProjects(p ?? []);
    })();
  }, []);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Obra";

  const filtered = useMemo(() => items.filter((it) => {
    if (projectFilter !== "all" && it.project_id !== projectFilter) return false;
    if (statusFilter !== "all" && it.status !== statusFilter) return false;
    if (from && it.planned_end_date < from) return false;
    if (to && it.planned_start_date > to) return false;
    return true;
  }), [items, projectFilter, statusFilter, from, to]);

  const onSaved = (item: Schedule) => setItems((prev) => {
    const exists = prev.find((p) => p.id === item.id);
    return (exists ? prev.map((p) => p.id === item.id ? item : p) : [...prev, item]).sort((a, b) => a.planned_start_date.localeCompare(b.planned_start_date));
  });

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("project_schedule").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((it) => it.id !== deleting.id));
    toast.success("Etapa excluída.");
    setDeleting(null);
  };

  return (
    <DashboardLayout
      title="Cronograma"
      kicker="Etapas planejadas"
    >
      <section className="dashboard-panel">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
          <select className="auth-field" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">Todas as obras</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="auth-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos status</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em andamento</option>
            <option value="completed">Concluída</option>
            <option value="delayed">Atrasada</option>
          </select>
          <input className="auth-field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="auth-field" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
            <Button type="button" size="sm" variant={view === "list" ? "construction" : "outline"} onClick={() => setView("list")} aria-label="Visualizar como lista"><List className="size-4" /></Button>
            <Button type="button" size="sm" variant={view === "timeline" ? "construction" : "outline"} onClick={() => setView("timeline")} aria-label="Visualizar como timeline"><GanttChart className="size-4" /></Button>
          </div>
        </div>
      </section>

      {view === "list" ? (
        <section className="grid gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="schedule-row">
              <div className="min-w-0">
                <strong>{item.stage}</strong>
                <p>{projectName(item.project_id)} · {item.planned_start_date} → {item.planned_end_date}</p>
              </div>
              <span className="status-pill shrink-0">{scheduleLabels[item.status]}</span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="min-w-[120px] flex-1"><div className="h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${item.progress}%` }} /></div><p className="mt-1 text-right text-xs font-bold text-muted-foreground">{item.progress}%</p></div>
                {isAdmin && <>
                  <Button size="icon" variant="outline" onClick={() => setEditing(item)} aria-label="Editar etapa"><Edit className="size-3" /></Button>
                  <Button size="icon" variant="outline" onClick={() => setDeleting(item)} aria-label="Excluir etapa"><Trash2 className="size-3" /></Button>
                </>}
              </div>
            </div>
          ))}
          {!filtered.length && <p className="dashboard-panel text-center text-muted-foreground">Nenhuma etapa encontrada.</p>}
        </section>
      ) : (
        <section className="dashboard-panel overflow-x-auto">
          <Timeline items={filtered} projectName={projectName} />
        </section>
      )}

      <ScheduleFormDialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }} schedule={editing} projects={projects} onSaved={onSaved} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Excluir etapa?" description={`"${deleting?.stage}" será removida.`} onConfirm={remove} />
    </DashboardLayout>
  );
};

const Timeline = ({ items, projectName }: { items: Schedule[]; projectName: (id: string) => string }) => {
  if (!items.length) return <p className="text-center text-muted-foreground">Sem etapas para exibir.</p>;
  const dates = items.flatMap((it) => [new Date(it.planned_start_date).getTime(), new Date(it.planned_end_date).getTime()]);
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const span = Math.max(max - min, 1);
  return (
    <div className="min-w-[600px] space-y-3">
      {items.map((it) => {
        const start = new Date(it.planned_start_date).getTime();
        const end = new Date(it.planned_end_date).getTime();
        const left = ((start - min) / span) * 100;
        const width = Math.max(((end - start) / span) * 100, 2);
        return (
          <div key={it.id} className="grid grid-cols-[200px_1fr] items-center gap-3">
            <div><strong className="block font-display text-sm">{it.stage}</strong><small className="text-xs text-muted-foreground">{projectName(it.project_id)}</small></div>
            <div className="relative h-7 rounded-full bg-muted">
              <div className="absolute top-0 h-full rounded-full bg-primary/80" style={{ left: `${left}%`, width: `${width}%` }}>
                <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(90deg, hsl(var(--primary)) ${it.progress}%, transparent ${it.progress}%)` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SchedulePage;
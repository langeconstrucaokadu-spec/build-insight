import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Edit, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { statusLabels } from "@/data/demo";
import DashboardLayout, { useDashboardRole } from "@/components/dashboard/DashboardLayout";
import ProjectFormDialog from "@/components/modals/ProjectFormDialog";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { toast } from "sonner";

type Project = Database["public"]["Tables"]["construction_projects"]["Row"];

const Works = () => {
  const { isAdmin } = useDashboardRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [editing, setEditing] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const load = async () => {
    const { data } = await supabase.from("construction_projects").select("*").order("created_at", { ascending: false });
    setProjects(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (dateFilter && (!p.start_date || p.start_date < dateFilter)) return false;
    if (search && !`${p.name} ${p.location} ${p.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [projects, search, statusFilter, dateFilter]);

  const onSaved = (project: Project) => {
    setProjects((prev) => {
      const exists = prev.find((p) => p.id === project.id);
      return exists ? prev.map((p) => p.id === project.id ? project : p) : [project, ...prev];
    });
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("construction_projects").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    setProjects((prev) => prev.filter((p) => p.id !== deleting.id));
    toast.success("Obra excluída.");
    setDeleting(null);
  };

  return (
    <DashboardLayout
      title="Obras"
      kicker="Lista de obras"
      actions={isAdmin ? <Button variant="construction" onClick={() => setCreating(true)} aria-label="Nova obra"><Plus className="size-4" /> <span className="btn-label">Nova obra</span></Button> : null}
    >
      <section className="dashboard-panel">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="auth-field pl-10" placeholder="Buscar por nome, local, descrição" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select className="auth-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="planning">Planejamento</option>
            <option value="in_progress">Em andamento</option>
            <option value="completed">Finalizada</option>
          </select>
          <input className="auth-field" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} placeholder="Início a partir de" />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((project) => (
          <article key={project.id} className="dashboard-panel flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="section-kicker">{statusLabels[project.status]}</p>
                <Link to={`/obras/${project.id}`} className="block font-display text-xl font-bold hover:text-primary break-words">{project.name}</Link>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground break-words"><MapPin className="size-3 shrink-0" /> <span className="break-words">{project.location}</span></p>
              </div>
              <span className="status-pill shrink-0">{project.progress}%</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
            <div className="h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${project.progress}%` }} /></div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary"><Link to={`/obras/${project.id}`}>Abrir</Link></Button>
              {isAdmin && <>
                <Button size="sm" variant="outline" onClick={() => setEditing(project)} aria-label="Editar obra"><Edit className="size-3" /> <span className="btn-label">Editar</span></Button>
                <Button size="sm" variant="outline" onClick={() => setDeleting(project)} aria-label="Excluir obra"><Trash2 className="size-3" /> <span className="btn-label">Excluir</span></Button>
              </>}
            </div>
          </article>
        ))}
        {!filtered.length && <p className="dashboard-panel md:col-span-2 xl:col-span-3 text-center text-muted-foreground">Nenhuma obra encontrada.</p>}
      </section>

      <ProjectFormDialog open={creating || !!editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }} project={editing} onSaved={onSaved} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Excluir obra?" description={`Esta ação removerá "${deleting?.name}" e dados relacionados.`} onConfirm={remove} />
    </DashboardLayout>
  );
};

export default Works;
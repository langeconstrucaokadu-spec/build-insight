import { useEffect, useMemo, useState } from "react";
import { Edit, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import DashboardLayout, { useDashboardRole } from "@/components/dashboard/DashboardLayout";
import ReportEditDialog from "@/components/modals/ReportEditDialog";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { toast } from "sonner";

type Report = Database["public"]["Tables"]["project_reports"]["Row"];
type Project = Pick<Database["public"]["Tables"]["construction_projects"]["Row"], "id" | "name">;

const Reports = () => {
  const { isAdmin } = useDashboardRole();
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const [editing, setEditing] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState<Report | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("project_reports").select("*"),
        supabase.from("construction_projects").select("id,name"),
      ]);
      setReports(r ?? []);
      setProjects(p ?? []);
    })();
  }, []);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Obra";

  const filtered = useMemo(() => {
    let list = reports.filter((r) => {
      if (projectFilter !== "all" && r.project_id !== projectFilter) return false;
      if (dateFilter && r.report_date < dateFilter) return false;
      if (search && !`${r.title} ${r.description} ${r.stage ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list = list.sort((a, b) => order === "desc" ? b.report_date.localeCompare(a.report_date) : a.report_date.localeCompare(b.report_date));
    return list;
  }, [reports, search, projectFilter, dateFilter, order]);

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("project_reports").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    setReports((prev) => prev.filter((r) => r.id !== deleting.id));
    toast.success("Relatório excluído.");
    setDeleting(null);
  };

  return (
    <DashboardLayout
      title="Relatórios"
      kicker="Histórico técnico"
    >
      <section className="dashboard-panel">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_140px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="auth-field pl-10" placeholder="Buscar relatório" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select className="auth-field" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">Todas as obras</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="auth-field" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <select className="auth-field" value={order} onChange={(e) => setOrder(e.target.value as "asc" | "desc")}>
            <option value="desc">Mais recentes</option>
            <option value="asc">Mais antigos</option>
          </select>
        </div>
      </section>

      <section className="grid gap-4">
        {filtered.map((report) => (
          <article key={report.id} className="timeline-item">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span>{report.report_date}{report.stage ? ` · ${report.stage}` : ""}</span>
                <h3>{report.title}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{projectName(report.project_id)}</p>
                <p>{report.description}</p>
              </div>
              {isAdmin && (
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(report)}><Edit className="size-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleting(report)}><Trash2 className="size-3" /></Button>
                </div>
              )}
            </div>
          </article>
        ))}
        {!filtered.length && <p className="dashboard-panel text-center text-muted-foreground">Nenhum relatório encontrado.</p>}
      </section>

      <ReportEditDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} report={editing} onSaved={(updated) => setReports((prev) => prev.map((r) => r.id === updated.id ? updated : r))} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Excluir relatório?" description={`"${deleting?.title}" será removido permanentemente.`} onConfirm={remove} />
    </DashboardLayout>
  );
};

export default Reports;
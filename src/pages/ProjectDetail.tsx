import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Edit, FileText, ImageIcon, Info, Loader2, MapPin, Plus, Trash2, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { readUserRole } from "@/lib/permissions";
import { demoProjects, demoReports, demoSchedule, scheduleLabels, statusLabels } from "@/data/demo";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProjectFormDialog from "@/components/modals/ProjectFormDialog";
import ScheduleFormDialog from "@/components/modals/ScheduleFormDialog";
import ReportEditDialog from "@/components/modals/ReportEditDialog";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { toast } from "sonner";

type Project = Database["public"]["Tables"]["construction_projects"]["Row"];
type Report = Database["public"]["Tables"]["project_reports"]["Row"];
type Schedule = Database["public"]["Tables"]["project_schedule"]["Row"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reportDateFilter, setReportDateFilter] = useState("");
  const [reportStageFilter, setReportStageFilter] = useState("all");
  const [editProject, setEditProject] = useState(false);
  const [deleteProject, setDeleteProject] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return navigate("/login");
      if (!id) return navigate("/dashboard");
      const roleResult = await readUserRole(session.user.id, "project-detail");
      console.info("[project-detail] permissão aplicada", roleResult);
      setIsAdmin(roleResult.isAdmin);

      if (uuidPattern.test(id)) {
        const { data: loadedProject } = await supabase.from("construction_projects").select("*").eq("id", id).maybeSingle();
        const { data: loadedReports } = await supabase.from("project_reports").select("*").eq("project_id", id).order("report_date", { ascending: false });
        const { data: loadedSchedule } = await supabase.from("project_schedule").select("*").eq("project_id", id).order("planned_start_date");
        setProject(loadedProject);
        setReports(loadedReports ?? []);
        setSchedule(loadedSchedule ?? []);
      }
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const currentProject = project ?? demoProjects.find((item) => item.id === id) ?? demoProjects[0];
  const progress = "progress" in currentProject ? currentProject.progress : 0;
  const reportStages = useMemo(() => Array.from(new Set(reports.map((r) => r.stage).filter(Boolean) as string[])), [reports]);
  const filteredReports = useMemo(() => reports.filter((r) => {
    if (reportDateFilter && r.report_date < reportDateFilter) return false;
    if (reportStageFilter !== "all" && r.stage !== reportStageFilter) return false;
    return true;
  }), [reports, reportDateFilter, reportStageFilter]);

  const removeProject = async () => {
    if (!project) return;
    const { error } = await supabase.from("construction_projects").delete().eq("id", project.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Obra excluída.");
    navigate("/obras");
  };

  const removeReport = async () => {
    if (!deletingReport) return;
    const { error } = await supabase.from("project_reports").delete().eq("id", deletingReport.id);
    if (error) { toast.error(error.message); return; }
    setReports((prev) => prev.filter((r) => r.id !== deletingReport.id));
    toast.success("Relatório excluído.");
    setDeletingReport(null);
  };

  const removeSchedule = async () => {
    if (!deletingSchedule) return;
    const { error } = await supabase.from("project_schedule").delete().eq("id", deletingSchedule.id);
    if (error) { toast.error(error.message); return; }
    setSchedule((prev) => prev.filter((s) => s.id !== deletingSchedule.id));
    toast.success("Etapa excluída.");
    setDeletingSchedule(null);
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-dashboard"><Loader2 className="size-8 animate-spin text-primary" /></main>;

  return (
    <DashboardLayout
      title={currentProject.name}
      kicker="Página da obra"
      actions={isAdmin && project ? (
        <>
          <Button variant="outline" onClick={() => setEditProject(true)}><Edit className="size-4" /> Editar</Button>
          <Button variant="outline" onClick={() => setDeleteProject(true)}><Trash2 className="size-4" /> Excluir</Button>
        </>
      ) : null}
    >
        <section className="rounded-lg border border-border bg-card p-6 shadow-elevated lg:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div><p className="section-kicker">Página individual da obra</p><h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">{currentProject.name}</h1><p className="mt-3 flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" /> {currentProject.location}</p></div>
            <div className="flex flex-wrap items-center gap-3"><span className="status-pill w-fit">{statusLabels[currentProject.status]}</span>{isAdmin && <Button asChild variant="construction"><Link to={`/obra/${currentProject.id}/relatorios/novo`}><Upload className="size-4" /> Enviar relatório</Link></Button>}</div>
          </div>
          <p className="mt-6 max-w-3xl leading-7 text-muted-foreground">{currentProject.description}</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3"><div className="metric-card"><span>Status atual</span><strong className="text-2xl">{statusLabels[currentProject.status]}</strong><p>{"current_stage" in currentProject ? currentProject.current_stage : currentProject.currentStage}</p></div><div className="metric-card"><span>Progresso</span><strong className="text-2xl">{progress}%</strong><p>percentual concluído</p></div><div className="metric-card"><span>Relatórios</span><strong className="text-2xl">{reports.length || demoReports.length}</strong><p>atualizações registradas</p></div></div>
          <div className="mt-6 h-3 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${progress}%` }} /></div>
        </section>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:grid-cols-4">
            <TabsTrigger className="tab-trigger" value="overview"><Info className="size-4" /> Visão geral</TabsTrigger>
            <TabsTrigger className="tab-trigger" value="reports"><FileText className="size-4" /> Relatórios</TabsTrigger>
            <TabsTrigger className="tab-trigger" value="schedule"><CalendarDays className="size-4" /> Cronograma</TabsTrigger>
            <TabsTrigger className="tab-trigger" value="media"><ImageIcon className="size-4" /> Galeria</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="dashboard-panel mt-5"><h2>Informações da obra</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><p><strong>Etapa atual:</strong> {"current_stage" in currentProject ? currentProject.current_stage : currentProject.currentStage}</p><p><strong>Localização:</strong> {currentProject.location}</p><p><strong>Início:</strong> {"start_date" in currentProject ? currentProject.start_date || "A definir" : "2026-01-10"}</p><p><strong>Entrega prevista:</strong> {"estimated_delivery_date" in currentProject ? currentProject.estimated_delivery_date || "A definir" : "2026-10-15"}</p></div></TabsContent>
          <TabsContent value="reports" className="dashboard-panel mt-5">
            <div className="panel-head"><h2>Relatórios cronológicos</h2>{isAdmin && project && <Button asChild variant="construction" size="sm"><Link to={`/obras/${project.id}/relatorios/novo`}><Plus className="size-4" /> Novo</Link></Button>}</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="auth-field" type="date" value={reportDateFilter} onChange={(e) => setReportDateFilter(e.target.value)} />
              <select className="auth-field" value={reportStageFilter} onChange={(e) => setReportStageFilter(e.target.value)}>
                <option value="all">Todas as etapas</option>
                {reportStages.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="mt-6 grid gap-4">{(reports.length ? filteredReports : demoReports).map((report) => (
              <div key={report.id} className="timeline-item">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span>{"report_date" in report ? report.report_date : report.date}{"stage" in report && report.stage ? ` · ${report.stage}` : ""}</span>
                    <h3>{report.title}</h3>
                    <p>{report.description}</p>
                  </div>
                  {isAdmin && "project_id" in report && (
                    <div className="flex flex-col gap-2">
                      <Button size="icon" variant="outline" onClick={() => setEditingReport(report as Report)}><Edit className="size-3" /></Button>
                      <Button size="icon" variant="outline" onClick={() => setDeletingReport(report as Report)}><Trash2 className="size-3" /></Button>
                    </div>
                  )}
                </div>
              </div>
            ))}</div>
          </TabsContent>
          <TabsContent value="schedule" className="dashboard-panel mt-5">
            <div className="panel-head"><h2>Cronograma da obra</h2>{isAdmin && <Button variant="construction" size="sm" onClick={() => setCreatingSchedule(true)}><Plus className="size-4" /> Nova etapa</Button>}</div>
            <div className="mt-6 grid gap-4">{(schedule.length ? schedule : demoSchedule).map((item) => (
              <div key={"id" in item ? item.id : item.stage} className="schedule-row">
                <div><strong>{item.stage}</strong><p>{"planned_start_date" in item ? item.planned_start_date : item.start} → {"planned_end_date" in item ? item.planned_end_date : item.end}</p></div>
                <span className="status-pill">{scheduleLabels[item.status]}</span>
                <div className="flex items-center gap-3">
                  <div className="min-w-28 flex-1"><div className="h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${item.progress}%` }} /></div></div>
                  {isAdmin && "id" in item && <>
                    <Button size="icon" variant="outline" onClick={() => setEditingSchedule(item as Schedule)}><Edit className="size-3" /></Button>
                    <Button size="icon" variant="outline" onClick={() => setDeletingSchedule(item as Schedule)}><Trash2 className="size-3" /></Button>
                  </>}
                </div>
              </div>
            ))}</div>
          </TabsContent>
          <TabsContent value="media" className="dashboard-panel mt-5"><h2>Biblioteca de fotos e vídeos</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{["Fundação", "Estrutura", "Instalações", "Acabamento"].map((stage) => <div key={stage} className="media-tile"><ImageIcon className="size-7" /><span>{stage}</span><small>Filtro por etapa</small></div>)}</div></TabsContent>
        </Tabs>

      {project && <ProjectFormDialog open={editProject} onOpenChange={setEditProject} project={project} onSaved={(p) => setProject(p)} />}
      <ConfirmDialog open={deleteProject} onOpenChange={setDeleteProject} title="Excluir obra?" description="Esta ação remove a obra e dados relacionados." onConfirm={removeProject} />
      <ReportEditDialog open={!!editingReport} onOpenChange={(o) => !o && setEditingReport(null)} report={editingReport} onSaved={(r) => setReports((prev) => prev.map((x) => x.id === r.id ? r : x))} />
      <ConfirmDialog open={!!deletingReport} onOpenChange={(o) => !o && setDeletingReport(null)} title="Excluir relatório?" onConfirm={removeReport} />
      {project && <ScheduleFormDialog open={creatingSchedule || !!editingSchedule} onOpenChange={(o) => { if (!o) { setCreatingSchedule(false); setEditingSchedule(null); } }} schedule={editingSchedule} projects={[{ id: project.id, name: project.name }]} defaultProjectId={project.id} onSaved={(s) => setSchedule((prev) => { const ex = prev.find((p) => p.id === s.id); return (ex ? prev.map((p) => p.id === s.id ? s : p) : [...prev, s]).sort((a, b) => a.planned_start_date.localeCompare(b.planned_start_date)); })} />}
      <ConfirmDialog open={!!deletingSchedule} onOpenChange={(o) => !o && setDeletingSchedule(null)} title="Excluir etapa?" onConfirm={removeSchedule} />
    </DashboardLayout>
  );
};

export default ProjectDetail;

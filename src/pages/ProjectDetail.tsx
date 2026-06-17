import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Download, Edit, FileText, ImageIcon, Info, Loader2, MapPin, Plus, Trash2, Upload, Wallet } from "lucide-react";
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
import ReportFormDialog from "@/components/modals/ReportFormDialog";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import ScheduleHierarchy from "@/components/project/ScheduleHierarchy";
import MediaViewerDialog, { type MediaFilter } from "@/components/modals/MediaViewerDialog";
import MediaUploadDialog from "@/components/modals/MediaUploadDialog";
import ProjectMediaGrid from "@/components/project/ProjectMediaGrid";
import HierarchyFilters, { emptyHierarchyFilter, type HierarchyFilterValue } from "@/components/project/HierarchyFilters";
import FinancialPanel from "@/components/project/FinancialPanel";
import { exportScheduleXlsx } from "@/lib/exportSchedule";
import { toast } from "sonner";

type Project = Database["public"]["Tables"]["construction_projects"]["Row"];
type Report = Database["public"]["Tables"]["project_reports"]["Row"];
type Schedule = Database["public"]["Tables"]["project_schedule"]["Row"];
type Category = Database["public"]["Tables"]["project_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["project_subcategories"]["Row"];
type Item = Database["public"]["Tables"]["project_items"]["Row"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [reportFilters, setReportFilters] = useState<HierarchyFilterValue>(emptyHierarchyFilter);
  const [galleryFilters, setGalleryFilters] = useState<HierarchyFilterValue>(emptyHierarchyFilter);
  const [editProject, setEditProject] = useState(false);
  const [deleteProject, setDeleteProject] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [creatingReport, setCreatingReport] = useState(false);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
  const [reportMedia, setReportMedia] = useState<{ title: string; filter: MediaFilter } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [galleryRefresh, setGalleryRefresh] = useState(0);
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
  const [uploadForReport, setUploadForReport] = useState<Report | null>(null);

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
        const [{ data: cats }, { data: subs }, { data: its }] = await Promise.all([
          supabase.from("project_categories").select("*").eq("project_id", id).order("name"),
          supabase.from("project_subcategories").select("*").eq("project_id", id).order("name"),
          supabase.from("project_items").select("*").eq("project_id", id).order("name"),
        ]);
        setProject(loadedProject);
        setReports(loadedReports ?? []);
        setSchedule(loadedSchedule ?? []);
        setCategories(cats ?? []);
        setSubcategories(subs ?? []);
        setItems(its ?? []);
      }
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const currentProject = project ?? demoProjects.find((item) => item.id === id) ?? demoProjects[0];

  // Métricas calculadas a partir dos dados reais (itens + relatórios).
  const computed = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === "finalizada").length;
    const inProgress = items.filter((i) => i.status === "em_andamento").length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    let derivedStatus: Project["status"] = "planning";
    if (total > 0 && done === total) derivedStatus = "completed";
    else if (inProgress > 0 || done > 0) derivedStatus = "in_progress";

    // Etapa atual = categoria do relatório mais recente; fallback para categoria
    // de um item em andamento; fallback final para current_stage do projeto.
    let stageName: string | null = null;
    const latestReport = reports.find((r) => r.category_id);
    if (latestReport?.category_id) {
      stageName = categories.find((c) => c.id === latestReport.category_id)?.name ?? null;
    }
    if (!stageName) {
      const activeItem = items.find((i) => i.status === "em_andamento") ?? items.find((i) => i.status === "finalizada");
      if (activeItem) stageName = categories.find((c) => c.id === activeItem.category_id)?.name ?? null;
    }
    return { total, done, pct, derivedStatus, stageName };
  }, [items, reports, categories]);

  const progress = project ? computed.pct : ("progress" in currentProject ? currentProject.progress : 0);
  const displayStatus = project ? computed.derivedStatus : currentProject.status;
  const displayStage = project
    ? (computed.stageName ?? project.current_stage ?? "—")
    : ("current_stage" in currentProject ? currentProject.current_stage : currentProject.currentStage);
  const reportCount = project ? reports.length : demoReports.length;

  const filteredReports = useMemo(() => reports.filter((r) => {
    if (reportFilters.categoryId !== "all" && r.category_id !== reportFilters.categoryId) return false;
    if (reportFilters.subcategoryId !== "all" && r.subcategory_id !== reportFilters.subcategoryId) return false;
    if (reportFilters.itemId !== "all" && r.item_id !== reportFilters.itemId) return false;
    if (reportFilters.status !== "all" && r.execution_status !== reportFilters.status) return false;
    if (reportFilters.date && r.report_date < reportFilters.date) return false;
    return true;
  }), [reports, reportFilters]);

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
    refreshAfterReport();
  };

  const removeSchedule = async () => {
    if (!deletingSchedule) return;
    const { error } = await supabase.from("project_schedule").delete().eq("id", deletingSchedule.id);
    if (error) { toast.error(error.message); return; }
    setSchedule((prev) => prev.filter((s) => s.id !== deletingSchedule.id));
    toast.success("Etapa excluída.");
    setDeletingSchedule(null);
  };

  // Após salvar/excluir relatório: refetch itens (status recalculado pelo trigger),
  // refetch projeto (progresso/etapa) e refresh do cronograma.
  const refreshAfterReport = async () => {
    if (!project) return;
    const [{ data: its }, { data: p }] = await Promise.all([
      supabase.from("project_items").select("*").eq("project_id", project.id).order("name"),
      supabase.from("construction_projects").select("*").eq("id", project.id).maybeSingle(),
    ]);
    if (its) setItems(its);
    if (p) setProject(p);
    setScheduleRefresh((k) => k + 1);
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
          <div className="flex flex-wrap items-center gap-3"><span className="status-pill w-fit">{statusLabels[displayStatus]}</span>{isAdmin && <Button asChild variant="construction"><Link to={`/obra/${currentProject.id}/relatorios/novo`}><Upload className="size-4" /> Enviar relatório</Link></Button>}</div>
          </div>
          <p className="mt-6 max-w-3xl leading-7 text-muted-foreground">{currentProject.description}</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3"><div className="metric-card"><span>Status atual</span><strong className="text-2xl">{statusLabels[displayStatus]}</strong><p>{displayStage}</p></div><div className="metric-card"><span>Progresso</span><strong className="text-2xl">{progress}%</strong><p>{computed.done}/{computed.total} itens finalizados</p></div><div className="metric-card"><span>Relatórios</span><strong className="text-2xl">{reportCount}</strong><p>atualizações registradas</p></div></div>
          <div className="mt-6 h-3 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${progress}%` }} /></div>
        </section>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:grid-cols-5">
            <TabsTrigger className="tab-trigger" value="overview"><Info className="size-4" /> Visão geral</TabsTrigger>
            <TabsTrigger className="tab-trigger" value="reports"><FileText className="size-4" /> Relatórios</TabsTrigger>
            <TabsTrigger className="tab-trigger" value="schedule"><CalendarDays className="size-4" /> Cronograma</TabsTrigger>
            <TabsTrigger className="tab-trigger" value="media"><ImageIcon className="size-4" /> Galeria</TabsTrigger>
            <TabsTrigger className="tab-trigger" value="financial"><Wallet className="size-4" /> Financeiro</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="dashboard-panel mt-5"><h2>Informações da obra</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><p><strong>Etapa atual:</strong> {"current_stage" in currentProject ? currentProject.current_stage : currentProject.currentStage}</p><p><strong>Localização:</strong> {currentProject.location}</p><p><strong>Início:</strong> {"start_date" in currentProject ? currentProject.start_date || "A definir" : "2026-01-10"}</p><p><strong>Entrega prevista:</strong> {"estimated_delivery_date" in currentProject ? currentProject.estimated_delivery_date || "A definir" : "2026-10-15"}</p></div></TabsContent>
          <TabsContent value="reports" className="dashboard-panel mt-5">
            <div className="panel-head"><h2>Relatórios cronológicos</h2>{isAdmin && project && <Button variant="construction" size="sm" onClick={() => setCreatingReport(true)}><Plus className="size-4" /> Criar relatório</Button>}</div>
            {project && (
              <HierarchyFilters
                categories={categories}
                subcategories={subcategories}
                items={items}
                value={reportFilters}
                onChange={setReportFilters}
                statusOptions={[
                  { value: "comecando", label: "Começando" },
                  { value: "desenvolvendo", label: "Desenvolvendo" },
                  { value: "finalizando", label: "Finalizando" },
                ]}
                dateLabel="Relatórios a partir de"
              />
            )}
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
                {"project_id" in report && (report as Report).item_id && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        const r = report as Report;
                        setReportMedia({ title: `Fotos · ${r.title}`, filter: { projectId: r.project_id, reportId: r.id, itemId: r.item_id, categoryId: r.category_id, subcategoryId: r.subcategory_id } });
                      }}>
                        <ImageIcon className="size-3" /> Ver fotos do relatório
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="construction" onClick={() => setUploadForReport(report as Report)}>
                          <Upload className="size-3" /> Subir foto
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}</div>
          </TabsContent>
          <TabsContent value="schedule" className="dashboard-panel mt-5">
            {project && (
              <div className="panel-head">
                <h2>Cronograma da obra</h2>
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    await exportScheduleXlsx(project, categories, subcategories, items);
                    toast.success("Cronograma exportado.");
                  } catch (e) {
                    toast.error((e as Error).message ?? "Falha ao exportar.");
                  }
                }}>
                  <Download className="size-4" /> Exportar Xoxota
                </Button>
              </div>
            )}
            {project ? (
                <ScheduleHierarchy projectId={project.id} isAdmin={isAdmin} refreshKey={scheduleRefresh} />
            ) : (
              <p className="text-sm text-muted-foreground">Carregue uma obra real para visualizar o cronograma hierárquico.</p>
            )}
          </TabsContent>
          <TabsContent value="media" className="dashboard-panel mt-5">
            <div className="panel-head"><h2>Biblioteca de fotos e vídeos</h2>{isAdmin && project && <Button variant="construction" size="sm" onClick={() => setUploadingMedia(true)}><Upload className="size-4" /> Subir fotos</Button>}</div>
            {project && (
              <HierarchyFilters
                categories={categories}
                subcategories={subcategories}
                items={items}
                value={galleryFilters}
                onChange={setGalleryFilters}
                dateLabel="Fotos a partir de"
              />
            )}
            {project ? (
              <ProjectMediaGrid projectId={project.id} refreshKey={galleryRefresh} filter={{ categoryId: galleryFilters.categoryId, subcategoryId: galleryFilters.subcategoryId, itemId: galleryFilters.itemId, date: galleryFilters.date }} />
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{["Fundação", "Estrutura", "Instalações", "Acabamento"].map((stage) => <div key={stage} className="media-tile"><ImageIcon className="size-7" /><span>{stage}</span><small>Filtro por etapa</small></div>)}</div>
            )}
          </TabsContent>
          <TabsContent value="financial" className="dashboard-panel mt-5">
            {project ? (
              <FinancialPanel projectId={project.id} canManage={isAdmin} />
            ) : (
              <p className="text-sm text-muted-foreground">Carregue uma obra real para gerenciar o controle financeiro.</p>
            )}
          </TabsContent>
        </Tabs>

      {project && <ProjectFormDialog open={editProject} onOpenChange={setEditProject} project={project} onSaved={(p) => setProject(p)} />}
      <ConfirmDialog open={deleteProject} onOpenChange={setDeleteProject} title="Excluir obra?" description="Esta ação remove a obra e dados relacionados." onConfirm={removeProject} />
      <ReportEditDialog open={!!editingReport} onOpenChange={(o) => !o && setEditingReport(null)} report={editingReport} onSaved={(r) => { setReports((prev) => prev.map((x) => x.id === r.id ? r : x)); refreshAfterReport(); }} />
      <ConfirmDialog open={!!deletingReport} onOpenChange={(o) => !o && setDeletingReport(null)} title="Excluir relatório?" onConfirm={removeReport} />
      {project && <ReportFormDialog open={creatingReport} onOpenChange={setCreatingReport} projectId={project.id} onSaved={(r) => { setReports((prev) => [r, ...prev]); refreshAfterReport(); }} />}
      <MediaViewerDialog open={!!reportMedia} onOpenChange={(o) => !o && setReportMedia(null)} title={reportMedia?.title ?? "Fotos"} filter={reportMedia?.filter ?? null} />
      {project && <MediaUploadDialog open={uploadingMedia} onOpenChange={setUploadingMedia} projectId={project.id} onSaved={() => setGalleryRefresh((k) => k + 1)} />}
      {project && (
        <MediaUploadDialog
          open={!!uploadForReport}
          onOpenChange={(o) => !o && setUploadForReport(null)}
          projectId={project.id}
          defaults={uploadForReport ? {
            categoryId: uploadForReport.category_id,
            subcategoryId: uploadForReport.subcategory_id,
            itemId: uploadForReport.item_id,
            reportId: uploadForReport.id,
          } : undefined}
          lockHierarchy
          onSaved={() => { setGalleryRefresh((k) => k + 1); setUploadForReport(null); }}
        />
      )}
      {project && <ScheduleFormDialog open={creatingSchedule || !!editingSchedule} onOpenChange={(o) => { if (!o) { setCreatingSchedule(false); setEditingSchedule(null); } }} schedule={editingSchedule} projects={[{ id: project.id, name: project.name }]} defaultProjectId={project.id} onSaved={(s) => setSchedule((prev) => { const ex = prev.find((p) => p.id === s.id); return (ex ? prev.map((p) => p.id === s.id ? s : p) : [...prev, s]).sort((a, b) => a.planned_start_date.localeCompare(b.planned_start_date)); })} />}
      <ConfirmDialog open={!!deletingSchedule} onOpenChange={(o) => !o && setDeletingSchedule(null)} title="Excluir etapa?" onConfirm={removeSchedule} />
    </DashboardLayout>
  );
};

export default ProjectDetail;

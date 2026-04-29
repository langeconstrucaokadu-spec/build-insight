import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, FileText, ImageIcon, Info, Loader2, MapPin, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { demoProjects, demoReports, demoSchedule, scheduleLabels, statusLabels } from "@/data/demo";

type Project = Database["public"]["Tables"]["construction_projects"]["Row"];
type Report = Database["public"]["Tables"]["project_reports"]["Row"];
type Schedule = Database["public"]["Tables"]["project_schedule"]["Row"];

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return navigate("/login");
      if (!id) return navigate("/dashboard");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const { data: loadedProject } = await supabase.from("construction_projects").select("*").eq("id", id).maybeSingle();
      const { data: loadedReports } = await supabase.from("project_reports").select("*").eq("project_id", id).order("report_date", { ascending: false });
      const { data: loadedSchedule } = await supabase.from("project_schedule").select("*").eq("project_id", id).order("planned_start_date");
      setIsAdmin(roles?.some((item) => item.role === "admin") ?? false);
      setProject(loadedProject);
      setReports(loadedReports ?? []);
      setSchedule(loadedSchedule ?? []);
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const currentProject = project ?? demoProjects.find((item) => item.id === id) ?? demoProjects[0];
  const progress = "progress" in currentProject ? currentProject.progress : 0;

  if (loading) return <main className="grid min-h-screen place-items-center bg-dashboard"><Loader2 className="size-8 animate-spin text-primary" /></main>;

  return (
    <main className="min-h-screen bg-dashboard px-5 py-6 text-foreground lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="size-4" /> Voltar ao dashboard</Link></Button>
        <section className="mt-6 rounded-lg border border-border bg-card p-6 shadow-elevated lg:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div><p className="section-kicker">Página individual da obra</p><h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">{currentProject.name}</h1><p className="mt-3 flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" /> {currentProject.location}</p></div>
            <div className="flex flex-wrap items-center gap-3"><span className="status-pill w-fit">{statusLabels[currentProject.status]}</span>{isAdmin && <Button asChild variant="construction"><Link to={`/obra/${currentProject.id}/relatorios/novo`}><Upload className="size-4" /> Enviar relatório</Link></Button>}</div>
          </div>
          <p className="mt-6 max-w-3xl leading-7 text-muted-foreground">{currentProject.description}</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3"><div className="metric-card"><span>Status atual</span><strong className="text-2xl">{statusLabels[currentProject.status]}</strong><p>{"current_stage" in currentProject ? currentProject.current_stage : currentProject.currentStage}</p></div><div className="metric-card"><span>Progresso</span><strong className="text-2xl">{progress}%</strong><p>percentual concluído</p></div><div className="metric-card"><span>Relatórios</span><strong className="text-2xl">{reports.length || demoReports.length}</strong><p>atualizações registradas</p></div></div>
          <div className="mt-6 h-3 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${progress}%` }} /></div>
        </section>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:grid-cols-4">
            <TabsTrigger className="tab-trigger" value="overview"><Info className="size-4" /> Visão geral</TabsTrigger>
            <TabsTrigger className="tab-trigger" value="reports"><FileText className="size-4" /> Relatórios</TabsTrigger>
            <TabsTrigger className="tab-trigger" value="schedule"><CalendarDays className="size-4" /> Cronograma</TabsTrigger>
            <TabsTrigger className="tab-trigger" value="media"><ImageIcon className="size-4" /> Galeria</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="dashboard-panel mt-5"><h2>Informações da obra</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><p><strong>Etapa atual:</strong> {"current_stage" in currentProject ? currentProject.current_stage : currentProject.currentStage}</p><p><strong>Localização:</strong> {currentProject.location}</p><p><strong>Início:</strong> {"start_date" in currentProject ? currentProject.start_date || "A definir" : "2026-01-10"}</p><p><strong>Entrega prevista:</strong> {"estimated_delivery_date" in currentProject ? currentProject.estimated_delivery_date || "A definir" : "2026-10-15"}</p></div></TabsContent>
          <TabsContent value="reports" className="dashboard-panel mt-5"><h2>Relatórios cronológicos</h2><div className="mt-6 grid gap-4">{(reports.length ? reports : demoReports).map((report) => <div key={report.id} className="timeline-item"><span>{"report_date" in report ? report.report_date : report.date}</span><h3>{report.title}</h3><p>{report.description}</p></div>)}</div></TabsContent>
          <TabsContent value="schedule" className="dashboard-panel mt-5"><h2>Cronograma da obra</h2><div className="mt-6 grid gap-4">{(schedule.length ? schedule : demoSchedule).map((item) => <div key={"id" in item ? item.id : item.stage} className="schedule-row"><div><strong>{item.stage}</strong><p>{"planned_start_date" in item ? item.planned_start_date : item.start} → {"planned_end_date" in item ? item.planned_end_date : item.end}</p></div><span className="status-pill">{scheduleLabels[item.status]}</span><div className="min-w-36"><div className="h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${item.progress}%` }} /></div></div></div>)}</div></TabsContent>
          <TabsContent value="media" className="dashboard-panel mt-5"><h2>Biblioteca de fotos e vídeos</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{["Fundação", "Estrutura", "Instalações", "Acabamento"].map((stage) => <div key={stage} className="media-tile"><ImageIcon className="size-7" /><span>{stage}</span><small>Filtro por etapa</small></div>)}</div></TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default ProjectDetail;

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Building2, CalendarDays, FilePlus2, FolderOpen, ImageIcon, Loader2, LogOut, Plus, Upload } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { demoProjects, demoReports, demoSchedule, scheduleLabels, statusLabels } from "@/data/demo";
import { toast } from "sonner";

type Project = Database["public"]["Tables"]["construction_projects"]["Row"];
type Role = Database["public"]["Enums"]["app_role"];

type Report = Database["public"]["Tables"]["project_reports"]["Row"];
type Schedule = Database["public"]["Tables"]["project_schedule"]["Row"];

const emptyProject = { name: "", description: "", location: "", status: "planning" as const, progress: 0, current_stage: "", start_date: "", estimated_delivery_date: "", is_public: true, is_portfolio: false };

const DashboardShell = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>("client");
  const [userId, setUserId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [reportForm, setReportForm] = useState({ project_id: "", title: "", description: "", stage: "", report_date: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return navigate("/login");
      setUserId(session.user.id);

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const currentRole = roles?.some((item) => item.role === "admin") ? "admin" : "client";
      setRole(currentRole);

      const { data: loadedProjects } = await supabase.from("construction_projects").select("*").order("created_at", { ascending: false });
      setProjects(loadedProjects ?? []);
      const { data: loadedReports } = await supabase.from("project_reports").select("*").order("report_date", { ascending: false });
      setReports(loadedReports ?? []);
      const { data: loadedSchedule } = await supabase.from("project_schedule").select("*").order("planned_start_date", { ascending: true });
      setSchedule(loadedSchedule ?? []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const visibleProjects = projects.length ? projects : demoProjects.map((project) => ({ id: project.id, name: project.name, description: project.description, location: project.location, status: project.status, progress: project.progress, current_stage: project.currentStage, cover_image_url: null, client_id: null, start_date: null, estimated_delivery_date: null, is_public: true, is_portfolio: project.status === "completed", created_at: "", updated_at: "" }));
  const activeProject = visibleProjects[0];
  const chartData = useMemo(() => visibleProjects.map((project) => ({ name: project.name.split(" ")[0], progresso: project.progress })), [visibleProjects]);

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    const { error, data } = await supabase.from("construction_projects").insert({ ...projectForm, progress: Number(projectForm.progress), start_date: projectForm.start_date || null, estimated_delivery_date: projectForm.estimated_delivery_date || null }).select().single();
    if (error) return toast.error(error.message);
    setProjects([data, ...projects]);
    setProjectForm(emptyProject);
    toast.success("Obra criada com sucesso.");
  };

  const createReport = async (event: React.FormEvent) => {
    event.preventDefault();
    const { error, data } = await supabase.from("project_reports").insert({ ...reportForm, created_by: userId }).select().single();
    if (error) return toast.error(error.message);
    setReports([data, ...reports]);
    setReportForm({ ...reportForm, title: "", description: "", stage: "" });
    toast.success("Relatório registrado.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-dashboard"><Loader2 className="size-8 animate-spin text-primary" /></main>;

  return (
    <main className="min-h-screen bg-dashboard text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-card px-5 py-6 lg:flex lg:flex-col">
        <Link to="/" className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Building2 className="size-5" /></span><span className="font-display text-xl font-bold">Arco Forte</span></Link>
        <nav className="mt-10 grid gap-2 text-sm font-semibold"><a className="nav-active" href="#overview"><BarChart3 className="size-4" /> Dashboard</a><a className="nav-item" href="#obras"><FolderOpen className="size-4" /> Obras</a><a className="nav-item" href="#relatorios"><FilePlus2 className="size-4" /> Relatórios</a><a className="nav-item" href="#cronograma"><CalendarDays className="size-4" /> Cronograma</a><a className="nav-item" href="#galeria"><ImageIcon className="size-4" /> Galeria</a></nav>
        <Button className="mt-auto" variant="outline" onClick={signOut}><LogOut className="size-4" /> Sair</Button>
      </aside>

      <section className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-dashboard/90 px-5 py-4 backdrop-blur-xl lg:px-8"><div className="flex items-center justify-between gap-4"><div><p className="section-kicker">{role === "admin" ? "Dashboard Administrativo" : "Dashboard do Cliente"}</p><h1 className="font-display text-3xl font-bold">Gestão de obras</h1></div><Button variant="outline" onClick={signOut} className="lg:hidden"><LogOut className="size-4" /></Button></div></header>

        <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 lg:px-8">
          <section id="overview" className="grid gap-5 md:grid-cols-3">
            <div className="metric-card"><span>Obras</span><strong>{visibleProjects.length}</strong><p>{role === "admin" ? "em gestão" : "vinculadas ao seu acesso"}</p></div>
            <div className="metric-card"><span>Progresso médio</span><strong>{Math.round(visibleProjects.reduce((acc, item) => acc + item.progress, 0) / visibleProjects.length)}%</strong><p>atualizado pelos relatórios</p></div>
            <div className="metric-card"><span>Últimos relatórios</span><strong>{reports.length || demoReports.length}</strong><p>organizados por data</p></div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
            <article className="dashboard-panel"><div className="panel-head"><div><p className="section-kicker">Progresso</p><h2>Visão geral das obras</h2></div></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="progresso" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
            <article className="dashboard-panel"><div className="panel-head"><div><p className="section-kicker">Obra principal</p><h2>{activeProject?.name}</h2></div><span className="status-pill">{activeProject && statusLabels[activeProject.status]}</span></div><p className="mt-4 text-muted-foreground">{activeProject?.description}</p><div className="mt-6 h-3 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${activeProject?.progress ?? 0}%` }} /></div><Button asChild className="mt-6" variant="construction"><Link to={`/obra/${activeProject?.id}`}>Abrir página da obra</Link></Button></article>
          </section>

          {role === "admin" && (
            <section id="obras" className="dashboard-panel">
              <div className="panel-head"><div><p className="section-kicker">Gerenciar obras</p><h2>Criar nova obra</h2></div><Plus className="size-5 text-primary" /></div>
              <form onSubmit={createProject} className="mt-6 grid gap-4 md:grid-cols-2"><input className="auth-field" required placeholder="Nome da obra" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} /><input className="auth-field" required placeholder="Localização" value={projectForm.location} onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })} /><select className="auth-field" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as typeof projectForm.status })}><option value="planning">Planejamento</option><option value="in_progress">Em andamento</option><option value="completed">Finalizada</option></select><input className="auth-field" type="number" min="0" max="100" placeholder="Progresso" value={projectForm.progress} onChange={(e) => setProjectForm({ ...projectForm, progress: Number(e.target.value) })} /><input className="auth-field" type="date" value={projectForm.start_date} onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })} /><input className="auth-field" type="date" value={projectForm.estimated_delivery_date} onChange={(e) => setProjectForm({ ...projectForm, estimated_delivery_date: e.target.value })} /><textarea className="auth-field md:col-span-2" required placeholder="Descrição" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} /><Button className="md:col-span-2" variant="construction"><Plus className="size-4" /> Criar obra</Button></form>
            </section>
          )}

          <section id="relatorios" className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            {role === "admin" && <article className="dashboard-panel"><div className="panel-head"><div><p className="section-kicker">Upload de relatórios</p><h2>Novo relatório</h2></div><Upload className="size-5 text-primary" /></div><form onSubmit={createReport} className="mt-6 grid gap-4"><select className="auth-field" required value={reportForm.project_id} onChange={(e) => setReportForm({ ...reportForm, project_id: e.target.value })}><option value="">Selecionar obra</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><input className="auth-field" required placeholder="Título" value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} /><input className="auth-field" placeholder="Etapa" value={reportForm.stage} onChange={(e) => setReportForm({ ...reportForm, stage: e.target.value })} /><input className="auth-field" type="date" value={reportForm.report_date} onChange={(e) => setReportForm({ ...reportForm, report_date: e.target.value })} /><textarea className="auth-field" required placeholder="Descrição da atividade" value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} /><Button variant="construction"><FilePlus2 className="size-4" /> Registrar relatório</Button></form></article>}
            <article className="dashboard-panel"><div className="panel-head"><div><p className="section-kicker">Linha do tempo</p><h2>Relatórios recentes</h2></div></div><div className="mt-6 grid gap-4">{(reports.length ? reports : demoReports).map((report) => <div key={report.id} className="timeline-item"><span>{"report_date" in report ? report.report_date : report.date}</span><h3>{report.title}</h3><p>{report.description}</p></div>)}</div></article>
          </section>

          <section id="cronograma" className="dashboard-panel"><div className="panel-head"><div><p className="section-kicker">Cronograma</p><h2>Etapas da obra</h2></div></div><div className="mt-6 grid gap-4">{(schedule.length ? schedule : demoSchedule).map((item) => <div key={"id" in item ? item.id : item.stage} className="schedule-row"><div><strong>{item.stage}</strong><p>{"planned_start_date" in item ? item.planned_start_date : item.start} → {"planned_end_date" in item ? item.planned_end_date : item.end}</p></div><span className="status-pill">{scheduleLabels[item.status]}</span><div className="min-w-36"><div className="h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${item.progress}%` }} /></div><p className="mt-1 text-right text-xs font-bold text-muted-foreground">{item.progress}%</p></div></div>)}</div></section>

          <section id="galeria" className="dashboard-panel"><div className="panel-head"><div><p className="section-kicker">Galeria de mídia</p><h2>Fotos e vídeos da obra</h2></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{["Fundação", "Estrutura", "Instalações", "Acabamento"].map((stage) => <div key={stage} className="media-tile"><ImageIcon className="size-7" /><span>{stage}</span></div>)}</div></section>
        </div>
      </section>
    </main>
  );
};

export default DashboardShell;

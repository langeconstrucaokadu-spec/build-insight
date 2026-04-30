import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { demoProjects, demoReports, statusLabels } from "@/data/demo";
import DashboardLayout, { useDashboardRole } from "./DashboardLayout";

type Project = Database["public"]["Tables"]["construction_projects"]["Row"];
type Report = Database["public"]["Tables"]["project_reports"]["Row"];

const DashboardShell = () => {
  const { role, isAdmin } = useDashboardRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("construction_projects").select("*").order("created_at", { ascending: false });
      setProjects(p ?? []);
      const { data: r } = await supabase.from("project_reports").select("*").order("report_date", { ascending: false }).limit(10);
      setReports(r ?? []);
    })();
  }, []);

  const visibleProjects = projects.length ? projects : demoProjects.map((project) => ({ id: project.id, name: project.name, description: project.description, location: project.location, status: project.status, progress: project.progress, current_stage: project.currentStage, cover_image_url: null, client_id: null, start_date: null, estimated_delivery_date: null, is_public: true, is_portfolio: project.status === "completed", created_at: "", updated_at: "" } as Project));
  const activeProject = visibleProjects[0];
  const chartData = useMemo(() => visibleProjects.map((project) => ({ name: project.name.split(" ")[0], progresso: project.progress })), [visibleProjects]);
  const avg = visibleProjects.length ? Math.round(visibleProjects.reduce((acc, item) => acc + item.progress, 0) / visibleProjects.length) : 0;

  return (
    <DashboardLayout title="Gestão de obras" kicker={isAdmin ? "Dashboard Administrativo" : "Dashboard do Cliente"}>
      <section className="grid gap-5 md:grid-cols-3">
        <div className="metric-card"><span>Obras</span><strong>{visibleProjects.length}</strong><p>{isAdmin ? "em gestão" : "vinculadas ao seu acesso"}</p></div>
        <div className="metric-card"><span>Progresso médio</span><strong>{avg}%</strong><p>atualizado pelos relatórios</p></div>
        <div className="metric-card"><span>Últimos relatórios</span><strong>{reports.length || demoReports.length}</strong><p>organizados por data</p></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <article className="dashboard-panel">
          <div className="panel-head"><div><p className="section-kicker">Progresso</p><h2>Visão geral das obras</h2></div></div>
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="progresso" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </article>
        {activeProject && (
          <article className="dashboard-panel">
            <div className="panel-head"><div><p className="section-kicker">Obra principal</p><h2>{activeProject.name}</h2></div><span className="status-pill">{statusLabels[activeProject.status]}</span></div>
            <p className="mt-4 text-muted-foreground">{activeProject.description}</p>
            <div className="mt-6 h-3 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${activeProject.progress}%` }} /></div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="construction"><Link to={`/obras/${activeProject.id}`}>Abrir página da obra</Link></Button>
              <Button asChild variant="secondary"><Link to="/obras">Ver todas as obras</Link></Button>
            </div>
          </article>
        )}
      </section>

      <section className="dashboard-panel">
        <div className="panel-head"><div><p className="section-kicker">Linha do tempo</p><h2>Relatórios recentes</h2></div><Button asChild variant="outline"><Link to="/relatorios">Ver todos</Link></Button></div>
        <div className="mt-6 grid gap-4">
          {(reports.length ? reports : demoReports).slice(0, 4).map((report) => (
            <div key={report.id} className="timeline-item">
              <span>{"report_date" in report ? report.report_date : report.date}</span>
              <h3>{report.title}</h3>
              <p>{report.description}</p>
            </div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
};

export default DashboardShell;

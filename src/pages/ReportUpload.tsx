import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, FilePlus2, ImageIcon, Loader2, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { readUserRole } from "@/lib/permissions";
import { statusLabels } from "@/data/demo";
import { toast } from "sonner";

type Project = Database["public"]["Tables"]["construction_projects"]["Row"];
type Report = Database["public"]["Tables"]["project_reports"]["Row"];
type Media = Database["public"]["Tables"]["report_media"]["Row"];

type MediaPreview = Media & { signedUrl?: string; reportTitle?: string; reportDate?: string };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ReportUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [media, setMedia] = useState<MediaPreview[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [form, setForm] = useState({ title: "", stage: "", report_date: new Date().toISOString().slice(0, 10), description: "" });

  const selectedFiles = useMemo(() => Array.from(files ?? []), [files]);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return navigate("/login");
      if (!id) return navigate("/dashboard");
      if (!uuidPattern.test(id)) {
        toast.error("Crie uma obra real antes de enviar relatórios.");
        return navigate("/dashboard");
      }

      setUserId(session.user.id);
      const [roleResult, { data: loadedProject }, { data: loadedReports }] = await Promise.all([
        readUserRole(session.user.id, "report-upload"),
        supabase.from("construction_projects").select("*").eq("id", id).maybeSingle(),
        supabase.from("project_reports").select("*").eq("project_id", id).order("report_date", { ascending: false }),
      ]);

      console.info("[report-upload] permissão aplicada", roleResult);
      setIsAdmin(roleResult.isAdmin);
      setProject(loadedProject);
      setReports(loadedReports ?? []);

      const reportIds = (loadedReports ?? []).map((report) => report.id);
      if (reportIds.length) {
        const { data: loadedMedia } = await supabase.from("report_media").select("*").in("report_id", reportIds).order("uploaded_at", { ascending: false });
        const previews = await Promise.all((loadedMedia ?? []).map(async (item) => {
          const { data } = await supabase.storage.from("project-media").createSignedUrl(item.file_url, 60 * 30);
          const parentReport = (loadedReports ?? []).find((report) => report.id === item.report_id);
          return { ...item, signedUrl: data?.signedUrl, reportTitle: parentReport?.title, reportDate: parentReport?.report_date };
        }));
        setMedia(previews);
      }

      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !userId || !isAdmin) return;
    setSubmitting(true);

    try {
      const { data: report, error: reportError } = await supabase.from("project_reports").insert({ ...form, project_id: id, created_by: userId }).select().single();
      if (reportError) throw reportError;

      const uploadedMedia: MediaPreview[] = [];
      for (const file of selectedFiles) {
        const mediaType = file.type.startsWith("video/") ? "video" : "photo";
        const extension = file.name.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
        const safeStage = form.stage.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "geral";
        const path = `${id}/${report.id}/${safeStage}-${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage.from("project-media").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;

        const { data: mediaRow, error: mediaError } = await supabase.from("report_media").insert({ report_id: report.id, file_url: path, media_type: mediaType, stage: form.stage || null }).select().single();
        if (mediaError) throw mediaError;

        const { data: signed } = await supabase.storage.from("project-media").createSignedUrl(path, 60 * 30);
        uploadedMedia.push({ ...mediaRow, signedUrl: signed?.signedUrl, reportTitle: report.title, reportDate: report.report_date });
      }

      setReports([report, ...reports]);
      setMedia([...uploadedMedia, ...media]);
      setForm({ title: "", stage: "", report_date: new Date().toISOString().slice(0, 10), description: "" });
      setFiles(null);
      toast.success("Relatório e mídias enviados com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o relatório.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-dashboard"><Loader2 className="size-8 animate-spin text-primary" /></main>;

  return (
    <main className="min-h-screen bg-dashboard px-5 py-6 text-foreground lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="size-4" /> Dashboard</Link></Button>
          {project && <Button asChild variant="secondary"><Link to={`/obra/${project.id}`}>Ver obra</Link></Button>}
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
          <article className="dashboard-panel">
            <div className="panel-head"><div><p className="section-kicker">Responsável técnico</p><h1 className="font-display text-3xl font-bold">Enviar relatório da obra</h1></div><FilePlus2 className="size-6 text-primary" /></div>
            {project && <div className="mt-5 rounded-lg bg-muted p-4"><strong>{project.name}</strong><p className="mt-1 text-sm text-muted-foreground">{project.location} · {statusLabels[project.status]}</p></div>}
            {!isAdmin ? <div className="mt-6 rounded-lg border border-border bg-background p-5 text-muted-foreground">Seu acesso permite acompanhar a obra. O envio de relatórios fica disponível para responsáveis autorizados.</div> : (
              <form onSubmit={submitReport} className="mt-6 grid gap-4">
                <input className="auth-field" required placeholder="Título do relatório" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                <div className="grid gap-4 sm:grid-cols-2"><input className="auth-field" placeholder="Etapa da obra" value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })} /><input className="auth-field" required type="date" value={form.report_date} onChange={(event) => setForm({ ...form, report_date: event.target.value })} /></div>
                <textarea className="auth-field min-h-36" required placeholder="Descreva as atividades executadas, pendências e observações" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                <label className="upload-dropzone"><Upload className="size-7 text-primary" /><span>Selecionar fotos e vídeos</span><small>JPG, PNG, WEBP, MP4 ou MOV</small><input className="sr-only" multiple accept="image/*,video/*" type="file" onChange={(event) => setFiles(event.target.files)} /></label>
                {selectedFiles.length > 0 && <div className="grid gap-2">{selectedFiles.map((file) => <div key={`${file.name}-${file.size}`} className="selected-file-row">{file.type.startsWith("video/") ? <Video className="size-4" /> : <Camera className="size-4" />}<span>{file.name}</span><small>{Math.ceil(file.size / 1024)} KB</small></div>)}</div>}
                <Button disabled={submitting} variant="construction" size="lg"><Upload className="size-4" /> {submitting ? "Enviando..." : "Enviar relatório e mídias"}</Button>
              </form>
            )}
          </article>

          <article className="dashboard-panel">
            <div className="panel-head"><div><p className="section-kicker">Histórico</p><h2>Relatórios e arquivos enviados</h2></div><ImageIcon className="size-5 text-primary" /></div>
            <div className="mt-6 grid gap-4">{reports.map((report) => <div key={report.id} className="timeline-item"><span>{report.report_date}</span><h3>{report.title}</h3><p>{report.description}</p></div>)}</div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{media.map((item) => <div key={item.id} className="media-preview-card">{item.media_type === "video" ? <video controls src={item.signedUrl} /> : <img src={item.signedUrl} alt={`Mídia do relatório ${item.reportTitle ?? "da obra"}`} loading="lazy" />}<div><strong>{item.reportTitle}</strong><p>{item.stage || "Geral"} · {item.reportDate}</p></div></div>)}</div>
          </article>
        </section>
      </div>
    </main>
  );
};

export default ReportUpload;
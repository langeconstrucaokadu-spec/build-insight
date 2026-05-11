import { useEffect, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Media = Database["public"]["Tables"]["report_media"]["Row"];

type Props = { projectId: string; refreshKey?: number };

export const ProjectMediaGrid = ({ projectId, refreshKey = 0 }: Props) => {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("report_media")
        .select("*")
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false });
      setMedia(data ?? []);
      setLoading(false);
    })();
  }, [projectId, refreshKey]);

  if (loading) return <div className="grid place-items-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  if (media.length === 0) return (
    <div className="mt-6 grid place-items-center gap-2 rounded-lg border border-dashed border-border py-12 text-muted-foreground">
      <ImageIcon className="size-8" />
      <p className="text-sm">Nenhuma foto enviada ainda.</p>
    </div>
  );

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {media.map((m) => (
        <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg border border-border bg-secondary/40">
          {m.media_type === "video" ? (
            <video src={m.file_url} className="aspect-video w-full object-cover" />
          ) : (
            <img src={m.file_url} alt={m.description ?? "Foto da obra"} loading="lazy" className="aspect-video w-full object-cover transition group-hover:scale-105" />
          )}
          <div className="p-2 text-xs text-muted-foreground">
            <p className="line-clamp-2">{m.description ?? "Sem descrição"}</p>
            <p className="mt-1 opacity-70">{m.captured_at ?? new Date(m.uploaded_at).toISOString().slice(0, 10)}</p>
          </div>
        </a>
      ))}
    </div>
  );
};

export default ProjectMediaGrid;
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ImageIcon, Loader2 } from "lucide-react";

type Media = Database["public"]["Tables"]["report_media"]["Row"];

export type MediaFilter = {
  projectId: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  itemId?: string | null;
  reportId?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  filter: MediaFilter | null;
};

export const MediaViewerDialog = ({ open, onOpenChange, title, filter }: Props) => {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !filter) return;
    setLoading(true);
    (async () => {
      // Sempre consulta a galeria unificada (report_media) escopada pela obra,
      // priorizando o vínculo mais específico disponível.
      let q = supabase
        .from("report_media")
        .select("*")
        .eq("project_id", filter.projectId)
        .order("uploaded_at", { ascending: false });
      if (filter.itemId) q = q.eq("item_id", filter.itemId);
      else if (filter.subcategoryId) q = q.eq("subcategory_id", filter.subcategoryId);
      else if (filter.categoryId) q = q.eq("category_id", filter.categoryId);
      const { data } = await q;
      setMedia(data ?? []);
      setLoading(false);
    })();
  }, [open, filter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : media.length === 0 ? (
          <div className="grid place-items-center gap-2 py-10 text-muted-foreground">
            <ImageIcon className="size-8" />
            <p className="text-sm">Nenhuma foto encontrada para este filtro.</p>
          </div>
        ) : (
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m) => (
              <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg border border-border bg-secondary/40">
                {m.media_type === "video" ? (
                  <video src={m.file_url} className="aspect-video w-full object-cover" />
                ) : (
                  <img src={m.file_url} alt={m.description ?? "Foto"} loading="lazy" className="aspect-video w-full object-cover transition group-hover:scale-105" />
                )}
                <div className="p-2 text-xs text-muted-foreground">
                  <p className="line-clamp-2">{m.description ?? "Sem descrição"}</p>
                  <p className="mt-1 opacity-70">{m.captured_at ?? new Date(m.uploaded_at).toISOString().slice(0, 10)}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MediaViewerDialog;
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { useDashboardRole } from "@/components/dashboard/DashboardLayout";
import { deleteMedia } from "@/lib/media";

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
  const { isAdmin } = useDashboardRole();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<Media | null>(null);

  useEffect(() => {
    if (!open || !filter) return;
    setLoading(true);
    (async () => {
      // Galeria unificada (report_media) escopada pela obra.
      // Para relatórios: une fotos do report_id COM fotos da galeria do mesmo item.
      let q = supabase
        .from("report_media")
        .select("*")
        .eq("project_id", filter.projectId)
        .order("uploaded_at", { ascending: false });
      if (filter.reportId && filter.itemId) {
        q = q.or(`report_id.eq.${filter.reportId},item_id.eq.${filter.itemId}`);
      } else if (filter.reportId) {
        q = q.eq("report_id", filter.reportId);
      } else if (filter.itemId) {
        q = q.eq("item_id", filter.itemId);
      } else if (filter.subcategoryId) {
        q = q.eq("subcategory_id", filter.subcategoryId);
      } else if (filter.categoryId) {
        q = q.eq("category_id", filter.categoryId);
      }
      const { data } = await q;
      // Dedup defensivo por id (caso uma foto bata em mais de uma condição).
      const seen = new Set<string>();
      const unique = (data ?? []).filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
      setMedia(unique);
      setLoading(false);
    })();
  }, [open, filter]);

  const confirmDelete = async () => {
    if (!deleting) return;
    const ok = await deleteMedia(deleting.id, deleting.file_url);
    if (ok) setMedia((prev) => prev.filter((m) => m.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : media.length === 0 ? (
          <div className="grid place-items-center gap-2 py-10 text-muted-foreground">
            <ImageIcon className="size-8" />
            <p className="text-sm">{filter?.reportId ? "Nenhuma foto encontrada para este relatório ou item relacionado." : "Nenhuma foto encontrada para este filtro."}</p>
          </div>
        ) : (
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m) => (
              <div key={m.id} className="group relative overflow-hidden rounded-lg border border-border bg-secondary/40">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setDeleting(m)}
                    className="absolute right-2 top-2 z-10 rounded-md bg-background/90 p-1.5 text-destructive shadow-sm transition hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Excluir imagem"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
                <a href={m.file_url} target="_blank" rel="noreferrer" className="block">
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
              </div>
            ))}
          </div>
        )}
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(o) => !o && setDeleting(null)}
          title="Excluir imagem?"
          description="Tem certeza que deseja excluir esta imagem? Essa ação não pode ser desfeita."
          onConfirm={confirmDelete}
        />
      </DialogContent>
    </Dialog>
  );
};

export default MediaViewerDialog;
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUCKET = "project-media";

/** Extract the storage path from a stored file_url. Supports public URLs and bare paths. */
export const extractStoragePath = (fileUrl: string | null | undefined): string | null => {
  if (!fileUrl) return null;
  const marker = `/object/public/${BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx >= 0) return decodeURIComponent(fileUrl.slice(idx + marker.length));
  if (/^https?:\/\//i.test(fileUrl)) return null;
  return fileUrl;
};

/** Delete a media row + its storage object. Returns true on success. */
export const deleteMedia = async (id: string, fileUrl: string | null | undefined): Promise<boolean> => {
  const path = extractStoragePath(fileUrl);
  if (path) {
    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([path]);
    if (storageErr) {
      // Continua: arquivo pode não existir mais; apenas avisa.
      toast.warning("Arquivo no storage não encontrado, removendo apenas o registro.");
    }
  }
  const { error } = await supabase.from("report_media").delete().eq("id", id);
  if (error) {
    toast.error(error.message);
    return false;
  }
  toast.success("Imagem excluída.");
  return true;
};
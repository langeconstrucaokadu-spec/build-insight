import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Media = Database["public"]["Tables"]["report_media"]["Row"];
type Category = Database["public"]["Tables"]["project_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["project_subcategories"]["Row"];
type Item = Database["public"]["Tables"]["project_items"]["Row"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSaved?: (media: Media) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export const MediaUploadDialog = ({ open, onOpenChange, projectId, onSaved }: Props) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({
    category_id: "",
    subcategory_id: "",
    item_id: "",
    captured_at: today(),
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ category_id: "", subcategory_id: "", item_id: "", captured_at: today(), description: "" });
    setFile(null);
    (async () => {
      const [{ data: c }, { data: s }, { data: i }] = await Promise.all([
        supabase.from("project_categories").select("*").eq("project_id", projectId).order("name"),
        supabase.from("project_subcategories").select("*").eq("project_id", projectId).order("name"),
        supabase.from("project_items").select("*").eq("project_id", projectId).order("name"),
      ]);
      setCategories(c ?? []);
      setSubcategories(s ?? []);
      setItems(i ?? []);
    })();
  }, [open, projectId]);

  const filteredSubs = useMemo(() => subcategories.filter((s) => s.category_id === form.category_id), [subcategories, form.category_id]);
  const filteredItems = useMemo(() => items.filter((i) => i.subcategory_id === form.subcategory_id), [items, form.subcategory_id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.category_id || !form.subcategory_id || !form.item_id) {
      return toast.error("Selecione categoria, subcategoria e item.");
    }
    if (!file) return toast.error("Selecione uma imagem para enviar.");
    setSaving(true);
    const isVideo = file.type.startsWith("video/");
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${projectId}/${form.item_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("project-media").upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) { setSaving(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("project-media").getPublicUrl(path);
    const { data, error } = await supabase.from("report_media").insert({
      project_id: projectId,
      category_id: form.category_id,
      subcategory_id: form.subcategory_id,
      item_id: form.item_id,
      captured_at: form.captured_at,
      description: form.description || null,
      file_url: pub.publicUrl,
      media_type: isVideo ? "video" : "photo",
    }).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Foto enviada.");
    onSaved?.(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Subir fotos</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <select className="auth-field" required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value, subcategory_id: "", item_id: "" })}>
              <option value="">Categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="auth-field" required disabled={!form.category_id} value={form.subcategory_id} onChange={(e) => setForm({ ...form, subcategory_id: e.target.value, item_id: "" })}>
              <option value="">Subcategoria</option>
              {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="auth-field" required disabled={!form.subcategory_id} value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })}>
              <option value="">Item</option>
              {filteredItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <input className="auth-field" required type="date" value={form.captured_at} onChange={(e) => setForm({ ...form, captured_at: e.target.value })} />
          <input className="auth-field" required type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <textarea className="auth-field min-h-24" placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="construction" disabled={saving}>{saving ? "Enviando..." : "Enviar foto"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MediaUploadDialog;
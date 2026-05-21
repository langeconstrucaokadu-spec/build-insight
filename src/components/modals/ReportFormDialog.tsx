import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Report = Database["public"]["Tables"]["project_reports"]["Row"];
type Category = Database["public"]["Tables"]["project_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["project_subcategories"]["Row"];
type Item = Database["public"]["Tables"]["project_items"]["Row"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSaved: (report: Report) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export const ReportFormDialog = ({ open, onOpenChange, projectId, onSaved }: Props) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({
    category_id: "",
    subcategory_id: "",
    item_id: "",
    execution_status: "comecando" as Database["public"]["Enums"]["report_execution_status"],
    title: "",
    description: "",
    report_date: today(),
  });
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm({ category_id: "", subcategory_id: "", item_id: "", execution_status: "comecando", title: "", description: "", report_date: today() });
    setFiles([]);
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
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { setSaving(false); return toast.error("Sessão expirada."); }
    const item = items.find((i) => i.id === form.item_id);
    const { data, error } = await supabase.from("project_reports").insert({
      project_id: projectId,
      category_id: form.category_id,
      subcategory_id: form.subcategory_id,
      item_id: form.item_id,
      execution_status: form.execution_status,
      title: form.title || item?.name || "Relatório",
      description: form.description,
      report_date: form.report_date,
      created_by: userId,
    }).select().single();
    if (error) { setSaving(false); return toast.error(error.message); }

    // Upload opcional de imagens vinculadas ao relatório recém criado.
    let failed = 0;
    if (files.length > 0) {
      for (const file of files) {
        try {
          const isVideo = file.type.startsWith("video/");
          const ext = file.name.split(".").pop() ?? "bin";
          const path = `${projectId}/${form.item_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage.from("project-media").upload(path, file, { contentType: file.type, upsert: false });
          if (upErr) { failed++; continue; }
          const { data: pub } = supabase.storage.from("project-media").getPublicUrl(path);
          const { error: insErr } = await supabase.from("report_media").insert({
            project_id: projectId,
            category_id: form.category_id,
            subcategory_id: form.subcategory_id,
            item_id: form.item_id,
            report_id: data.id,
            captured_at: form.report_date,
            description: form.description || null,
            file_url: pub.publicUrl,
            media_type: isVideo ? "video" : "photo",
          });
          if (insErr) failed++;
        } catch { failed++; }
      }
      if (failed > 0) toast.warning(`Relatório criado, mas ${failed} de ${files.length} imagem(ns) falharam no envio.`);
    }
    setSaving(false);
    toast.success(files.length > 0 && failed === 0 ? "Relatório e fotos enviados." : "Relatório criado.");
    onSaved(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Criar relatório</DialogTitle></DialogHeader>
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
          <input className="auth-field" placeholder="Título (opcional - usa nome do item)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <select className="auth-field" required value={form.execution_status} onChange={(e) => setForm({ ...form, execution_status: e.target.value as typeof form.execution_status })}>
              <option value="comecando">Começando</option>
              <option value="desenvolvendo">Desenvolvendo</option>
              <option value="finalizando">Finalizando</option>
            </select>
            <input className="auth-field" required type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} />
          </div>
          <textarea className="auth-field min-h-32" required placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Imagens (opcional — pode anexar uma ou mais)</label>
            <input
              className="auth-field"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">{files.length} arquivo(s) selecionado(s)</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="construction" disabled={saving}>{saving ? "Salvando..." : "Criar relatório"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportFormDialog;
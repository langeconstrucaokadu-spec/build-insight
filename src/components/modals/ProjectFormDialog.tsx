import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Project = Database["public"]["Tables"]["construction_projects"]["Row"];
type ProjectStatus = Project["status"];

const empty = { name: "", description: "", location: "", unit: "", status: "planning" as ProjectStatus, current_stage: "", start_date: "", estimated_delivery_date: "", is_public: true, is_portfolio: false };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSaved: (project: Project) => void;
};

export const ProjectFormDialog = ({ open, onOpenChange, project, onSaved }: Props) => {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name, description: project.description, location: project.location,
        unit: (project as any).unit ?? "",
        status: project.status, current_stage: project.current_stage ?? "",
        start_date: project.start_date ?? "", estimated_delivery_date: project.estimated_delivery_date ?? "",
        is_public: project.is_public, is_portfolio: project.is_portfolio,
      });
    } else {
      setForm(empty);
    }
  }, [project, open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      start_date: form.start_date || null,
      estimated_delivery_date: form.estimated_delivery_date || null,
      current_stage: form.current_stage || null,
      unit: form.unit || null,
    };
    const query = project
      ? supabase.from("construction_projects").update(payload).eq("id", project.id).select().single()
      : supabase.from("construction_projects").insert(payload).select().single();
    const { data, error } = await query;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(project ? "Obra atualizada." : "Obra criada com sucesso.");
    onSaved(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>{project ? "Editar obra" : "Nova obra"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col min-h-0">
          <div className="overflow-y-auto px-6 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <input className="auth-field md:col-span-2" required placeholder="Nome da obra" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="auth-field" placeholder="Unidade" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              <input className="auth-field" required placeholder="Localização" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <select className="auth-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                <option value="planning">Planejamento</option>
                <option value="in_progress">Em andamento</option>
                <option value="completed">Finalizada</option>
              </select>
              <label className="text-xs font-semibold text-muted-foreground flex flex-col gap-1">Início estimado
                <input className="auth-field" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-muted-foreground flex flex-col gap-1">Término estimado
                <input className="auth-field" type="date" value={form.estimated_delivery_date} onChange={(e) => setForm({ ...form, estimated_delivery_date: e.target.value })} />
              </label>
              <textarea className="auth-field md:col-span-2 min-h-28" required placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              {project && (
                <div className="md:col-span-2 grid gap-2 md:grid-cols-2 text-xs text-muted-foreground">
                  <p>Preenchida em: {(project as any).filled_at ? new Date((project as any).filled_at).toLocaleString("pt-BR") : "—"}</p>
                  <p>Última atualização: {(project as any).last_activity_at ? new Date((project as any).last_activity_at).toLocaleString("pt-BR") : "—"}</p>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} /> Obra pública</label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_portfolio} onChange={(e) => setForm({ ...form, is_portfolio: e.target.checked })} /> Exibir no portfólio</label>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 shrink-0 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="construction" disabled={saving}>{saving ? "Salvando..." : project ? "Salvar alterações" : "Criar obra"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectFormDialog;
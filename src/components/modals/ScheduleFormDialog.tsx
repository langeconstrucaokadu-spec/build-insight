import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Schedule = Database["public"]["Tables"]["project_schedule"]["Row"];
type ScheduleStatus = Schedule["status"];

const empty = { project_id: "", stage: "", planned_start_date: "", planned_end_date: "", status: "pending" as ScheduleStatus, progress: 0 };

type Project = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: Schedule | null;
  projects: Project[];
  defaultProjectId?: string;
  onSaved: (item: Schedule) => void;
};

export const ScheduleFormDialog = ({ open, onOpenChange, schedule, projects, defaultProjectId, onSaved }: Props) => {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (schedule) {
      setForm({ project_id: schedule.project_id, stage: schedule.stage, planned_start_date: schedule.planned_start_date, planned_end_date: schedule.planned_end_date, status: schedule.status, progress: schedule.progress });
    } else {
      setForm({ ...empty, project_id: defaultProjectId ?? projects[0]?.id ?? "" });
    }
  }, [schedule, open, defaultProjectId, projects]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.project_id) return toast.error("Selecione uma obra.");
    setSaving(true);
    const payload = { ...form, progress: Number(form.progress) };
    const query = schedule
      ? supabase.from("project_schedule").update(payload).eq("id", schedule.id).select().single()
      : supabase.from("project_schedule").insert(payload).select().single();
    const { data, error } = await query;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(schedule ? "Etapa atualizada." : "Etapa criada.");
    onSaved(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{schedule ? "Editar etapa" : "Nova etapa"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <select className="auth-field" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
            <option value="">Selecione a obra</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="auth-field" required placeholder="Nome da etapa" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="auth-field" required type="date" value={form.planned_start_date} onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })} />
            <input className="auth-field" required type="date" value={form.planned_end_date} onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <select className="auth-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ScheduleStatus })}>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluída</option>
              <option value="delayed">Atrasada</option>
            </select>
            <input className="auth-field" type="number" min={0} max={100} placeholder="Progresso %" value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="construction" disabled={saving}>{saving ? "Salvando..." : schedule ? "Salvar" : "Criar etapa"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleFormDialog;
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Report = Database["public"]["Tables"]["project_reports"]["Row"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
  onSaved: (report: Report) => void;
};

export const ReportEditDialog = ({ open, onOpenChange, report, onSaved }: Props) => {
  const [form, setForm] = useState({ title: "", stage: "", report_date: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (report) setForm({ title: report.title, stage: report.stage ?? "", report_date: report.report_date, description: report.description });
  }, [report, open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!report) return;
    setSaving(true);
    const { data, error } = await supabase.from("project_reports").update({ ...form, stage: form.stage || null }).eq("id", report.id).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Relatório atualizado.");
    onSaved(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Editar relatório</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <input className="auth-field" required placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="auth-field" placeholder="Etapa" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} />
            <input className="auth-field" required type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} />
          </div>
          <textarea className="auth-field min-h-32" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="construction" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportEditDialog;
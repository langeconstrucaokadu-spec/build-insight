import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ownerLabels,
  ownerOptions,
  typeLabels,
  typeOptions,
  unitLabels,
  unitOptions,
  type InventoryItem,
  type InventoryLocationType,
  type InventoryOwner,
  type InventoryType,
  type InventoryUnit,
} from "@/lib/inventory";

type ProjectOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  projects: ProjectOption[];
  /** Quando informado, o item é sempre da obra (aba dentro da obra). */
  fixedProjectId?: string;
  onSaved: () => void;
};

const emptyForm = {
  name: "",
  type: "material" as InventoryType,
  owner: "lange" as InventoryOwner,
  quantity: "1",
  unit: "unidade" as InventoryUnit,
  unit_other: "",
  location_type: "galpao" as InventoryLocationType,
  project_id: "",
  observation: "",
};

export const InventoryItemFormDialog = ({ open, onOpenChange, item, projects, fixedProjectId, onSaved }: Props) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        name: item.name,
        type: item.type,
        owner: item.owner,
        quantity: String(item.quantity),
        unit: item.unit,
        unit_other: item.unit_other ?? "",
        location_type: item.location_type,
        project_id: item.project_id ?? "",
        observation: item.observation ?? "",
      });
    } else {
      setForm({
        ...emptyForm,
        location_type: fixedProjectId ? "obra" : "galpao",
        project_id: fixedProjectId ?? "",
      });
    }
  }, [open, item, fixedProjectId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Informe o nome do item.");
    const quantity = Number(form.quantity.replace(",", "."));
    if (Number.isNaN(quantity) || quantity < 0) return toast.error("Quantidade inválida.");
    if (form.location_type === "obra" && !form.project_id) return toast.error("Selecione a obra.");
    if (form.unit === "outro" && !form.unit_other.trim()) return toast.error("Informe a unidade de medida.");

    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const payload = {
      name: form.name.trim(),
      type: form.type,
      owner: form.owner,
      quantity,
      unit: form.unit,
      unit_other: form.unit === "outro" ? form.unit_other.trim() : null,
      location_type: form.location_type,
      project_id: form.location_type === "obra" ? form.project_id : null,
      observation: form.observation.trim() || null,
      created_by: sessionData.session?.user.id ?? null,
    };

    const { error } = item
      ? await supabase.from("inventory_items").update(payload).eq("id", item.id)
      : await supabase.from("inventory_items").insert(payload);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(item ? "Item atualizado." : "Item adicionado ao inventário.");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Editar item do inventário" : "Adicionar item ao inventário"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Nome do item</label>
            <input className="auth-field" required placeholder="Ex.: Betoneira 400L" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select className="auth-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as InventoryType })}>
                {typeOptions.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Proprietário</label>
              <select className="auth-field" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value as InventoryOwner })}>
                {ownerOptions.map((o) => <option key={o} value={o}>{ownerLabels[o]}</option>)}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Quantidade</label>
              <input className="auth-field" required inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Unidade de medida</label>
              <select className="auth-field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as InventoryUnit })}>
                {unitOptions.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}
              </select>
              {form.unit === "outro" && (
                <input className="auth-field mt-2" placeholder="Qual unidade?" value={form.unit_other} onChange={(e) => setForm({ ...form, unit_other: e.target.value })} />
              )}
            </div>
          </div>

          {!fixedProjectId && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Local atual</label>
                <select
                  className="auth-field"
                  value={form.location_type}
                  onChange={(e) => setForm({ ...form, location_type: e.target.value as InventoryLocationType, project_id: "" })}
                >
                  <option value="galpao">Galpão</option>
                  <option value="obra">Obra</option>
                </select>
              </div>
              {form.location_type === "obra" && (
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">Obra</label>
                  <select className="auth-field" required value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                    <option value="">Selecione</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Observação (opcional)</label>
            <textarea className="auth-field min-h-20" value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="construction" disabled={saving}>{saving ? "Salvando..." : (item ? "Salvar" : "Adicionar item")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryItemFormDialog;

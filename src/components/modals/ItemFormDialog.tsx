import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Category = Database["public"]["Tables"]["project_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["project_subcategories"]["Row"];
type Item = Database["public"]["Tables"]["project_items"]["Row"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  categories: Category[];
  subcategories: Subcategory[];
  defaultCategoryId?: string | null;
  defaultSubcategoryId?: string | null;
  onSaved: (item: Item) => void;
  onCategoryCreated?: (cat: Category) => void;
  onSubcategoryCreated?: (sub: Subcategory) => void;
};

const ItemFormDialog = ({ open, onOpenChange, projectId, categories, subcategories, defaultCategoryId, defaultSubcategoryId, onSaved, onCategoryCreated, onSubcategoryCreated }: Props) => {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [orderIndex, setOrderIndex] = useState<number | "">("");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [actualStart, setActualStart] = useState("");
  const [actualEnd, setActualEnd] = useState("");
  const [observation, setObservation] = useState("");
  const [delayJustification, setDelayJustification] = useState("");
  const [status, setStatus] = useState<Item["status"]>("pendente");
  const [saving, setSaving] = useState(false);
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newSubMode, setNewSubMode] = useState(false);
  const [newSubName, setNewSubName] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setCategoryId(defaultCategoryId ?? "");
      setSubcategoryId(defaultSubcategoryId ?? "");
      setOrderIndex("");
      setPlannedStart(""); setPlannedEnd("");
      setActualStart(""); setActualEnd("");
      setObservation(""); setDelayJustification("");
      setStatus("pendente");
      setNewCatMode(false); setNewCatName("");
      setNewSubMode(false); setNewSubName("");
    }
  }, [open, defaultCategoryId, defaultSubcategoryId]);

  const filteredSubs = subcategories.filter((s) => s.category_id === categoryId);

  const diffDays = (a: string, b: string) => {
    if (!a || !b) return null;
    const ms = new Date(b).getTime() - new Date(a).getTime();
    if (isNaN(ms)) return null;
    return Math.round(ms / 86400000) + 1;
  };
  const plannedDuration = diffDays(plannedStart, plannedEnd);
  const actualDuration = diffDays(actualStart, actualEnd);

  const submit = async () => {
    if (!name.trim()) return toast.error("Informe o nome do item.");
    setSaving(true);

    let finalCategoryId = categoryId;
    if (newCatMode) {
      const n = newCatName.trim();
      if (!n) { setSaving(false); return toast.error("Informe o nome da nova categoria."); }
      const dup = categories.find((c) => c.name.trim().toLowerCase() === n.toLowerCase());
      if (dup) { finalCategoryId = dup.id; }
      else {
        const { data, error } = await supabase.from("project_categories").insert({ project_id: projectId, name: n }).select("*").single();
        if (error || !data) { setSaving(false); toast.error(error?.message ?? "Erro ao criar categoria."); return; }
        finalCategoryId = data.id;
        onCategoryCreated?.(data);
      }
    }
    if (!finalCategoryId) { setSaving(false); return toast.error("Selecione ou crie uma categoria."); }

    let finalSubcategoryId = subcategoryId;
    if (newSubMode) {
      const n = newSubName.trim();
      if (!n) { setSaving(false); return toast.error("Informe o nome da nova subcategoria."); }
      const dup = subcategories.find((s) => s.category_id === finalCategoryId && s.name.trim().toLowerCase() === n.toLowerCase());
      if (dup) { finalSubcategoryId = dup.id; }
      else {
        const { data, error } = await supabase.from("project_subcategories").insert({ project_id: projectId, category_id: finalCategoryId, name: n }).select("*").single();
        if (error || !data) { setSaving(false); toast.error(error?.message ?? "Erro ao criar subcategoria."); return; }
        finalSubcategoryId = data.id;
        onSubcategoryCreated?.(data);
      }
    }
    if (!finalSubcategoryId) { setSaving(false); return toast.error("Selecione ou crie uma subcategoria."); }

    const { data, error } = await supabase.from("project_items").insert({
      project_id: projectId,
      category_id: finalCategoryId,
      subcategory_id: finalSubcategoryId,
      name: name.trim(),
      order_index: orderIndex === "" ? 0 : Number(orderIndex),
      planned_start_date: plannedStart || null,
      planned_end_date: plannedEnd || null,
      actual_start_date: actualStart || null,
      actual_end_date: actualEnd || null,
      observation: observation.trim() || null,
      delay_justification: delayJustification.trim() || null,
      start_date: plannedStart || null,
      expected_date: plannedEnd || null,
      delivered_date: actualEnd || null,
      status,
    }).select("*").single();
    setSaving(false);
    if (error || !data) { toast.error(error?.message ?? "Erro ao salvar."); return; }
    toast.success("Item criado.");
    onSaved(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Adicionar novo item</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm"><span>Ordem do item</span>
            <input className="auth-field" type="number" min={0} placeholder="Ex.: 1" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value === "" ? "" : Number(e.target.value))} />
          </label>
          <div className="grid gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span>Categoria *</span>
              <button type="button" className="text-xs text-primary underline" onClick={() => { setNewCatMode((v) => !v); setNewSubMode(false); setSubcategoryId(""); }}>
                {newCatMode ? "Selecionar existente" : "+ Nova categoria"}
              </button>
            </div>
            {newCatMode ? (
              <input className="auth-field" placeholder="Nome da nova categoria" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            ) : (
              <select className="auth-field" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(""); setNewSubMode(false); }}>
                <option value="">Selecione...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div className="grid gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span>Subcategoria *</span>
              <button type="button" className="text-xs text-primary underline" onClick={() => setNewSubMode((v) => !v)} disabled={!newCatMode && !categoryId}>
                {newSubMode ? "Selecionar existente" : "+ Nova subcategoria"}
              </button>
            </div>
            {newSubMode ? (
              <input className="auth-field" placeholder="Nome da nova subcategoria" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} disabled={!newCatMode && !categoryId} />
            ) : (
              <select className="auth-field" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={newCatMode || !categoryId}>
                <option value="">{newCatMode ? "Crie uma subcategoria nova" : (categoryId ? "Selecione..." : "Escolha a categoria primeiro")}</option>
                {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          <label className="grid gap-1 text-sm"><span>Nome do item *</span>
            <input className="auth-field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <fieldset className="grid gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-semibold uppercase text-muted-foreground">Planejamento</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm"><span>Início previsto</span>
                <input className="auth-field" type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm"><span>Término previsto</span>
                <input className="auth-field" type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
              </label>
            </div>
            {plannedDuration !== null && <p className="text-xs text-muted-foreground">Duração prevista: <strong>{plannedDuration} dia(s)</strong> (calculada).</p>}
          </fieldset>
          <fieldset className="grid gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-semibold uppercase text-muted-foreground">Execução</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm"><span>Início real</span>
                <input className="auth-field" type="date" value={actualStart} onChange={(e) => setActualStart(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm"><span>Término real</span>
                <input className="auth-field" type="date" value={actualEnd} onChange={(e) => setActualEnd(e.target.value)} />
              </label>
            </div>
            {actualDuration !== null && <p className="text-xs text-muted-foreground">Duração real: <strong>{actualDuration} dia(s)</strong> (calculada).</p>}
          </fieldset>
          <fieldset className="grid gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-semibold uppercase text-muted-foreground">Justificativas</legend>
            <label className="grid gap-1 text-sm"><span>Observação do item</span>
              <textarea className="auth-field min-h-20" value={observation} onChange={(e) => setObservation(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm"><span>Justificativa de atraso</span>
              <textarea className="auth-field min-h-20" value={delayJustification} onChange={(e) => setDelayJustification(e.target.value)} />
            </label>
          </fieldset>
          <label className="grid gap-1 text-sm"><span>Status</span>
            <select className="auth-field" value={status} onChange={(e) => setStatus(e.target.value as Item["status"])}>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="construction" onClick={submit} disabled={saving}>Salvar item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormDialog;
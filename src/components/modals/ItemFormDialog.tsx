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
  const [startDate, setStartDate] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [deliveredDate, setDeliveredDate] = useState("");
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
      setStartDate(""); setExpectedDate(""); setDeliveredDate("");
      setStatus("pendente");
      setNewCatMode(false); setNewCatName("");
      setNewSubMode(false); setNewSubName("");
    }
  }, [open, defaultCategoryId, defaultSubcategoryId]);

  const filteredSubs = subcategories.filter((s) => s.category_id === categoryId);

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
      start_date: startDate || null,
      expected_date: expectedDate || null,
      delivered_date: deliveredDate || null,
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Adicionar novo item</DialogTitle></DialogHeader>
        <div className="grid gap-3">
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
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm"><span>Início</span>
              <input className="auth-field" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm"><span>Prevista</span>
              <input className="auth-field" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm"><span>Entregue</span>
              <input className="auth-field" type="date" value={deliveredDate} onChange={(e) => setDeliveredDate(e.target.value)} />
            </label>
          </div>
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
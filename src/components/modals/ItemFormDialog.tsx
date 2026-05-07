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
};

const ItemFormDialog = ({ open, onOpenChange, projectId, categories, subcategories, defaultCategoryId, defaultSubcategoryId, onSaved }: Props) => {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [deliveredDate, setDeliveredDate] = useState("");
  const [status, setStatus] = useState<Item["status"]>("pendente");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setCategoryId(defaultCategoryId ?? "");
      setSubcategoryId(defaultSubcategoryId ?? "");
      setStartDate(""); setExpectedDate(""); setDeliveredDate("");
      setStatus("pendente");
    }
  }, [open, defaultCategoryId, defaultSubcategoryId]);

  const filteredSubs = subcategories.filter((s) => s.category_id === categoryId);

  const submit = async () => {
    if (!name.trim()) return toast.error("Informe o nome do item.");
    if (!categoryId) return toast.error("Selecione uma categoria.");
    if (!subcategoryId) return toast.error("Selecione uma subcategoria.");
    setSaving(true);
    const { data, error } = await supabase.from("project_items").insert({
      project_id: projectId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
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
          <label className="grid gap-1 text-sm"><span>Categoria *</span>
            <select className="auth-field" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(""); }}>
              <option value="">Selecione...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm"><span>Subcategoria *</span>
            <select className="auth-field" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!categoryId}>
              <option value="">{categoryId ? "Selecione..." : "Escolha a categoria primeiro"}</option>
              {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
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
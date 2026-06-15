import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Cost = Database["public"]["Tables"]["project_financial_costs"]["Row"];
type FCategory = Database["public"]["Tables"]["financial_categories"]["Row"];
type FItem = Database["public"]["Tables"]["financial_items"]["Row"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  cost?: Cost | null;
  onSaved: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);
const NEW = "__new__";

// Formata centavos digitados como BRL (R$ 1.234,56)
const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const FinancialCostFormDialog = ({ open, onOpenChange, projectId, cost, onSaved }: Props) => {
  const [cats, setCats] = useState<FCategory[]>([]);
  const [items, setItems] = useState<FItem[]>([]);
  const [form, setForm] = useState({
    date: today(),
    buyer: "",
    category_id: "",
    item_id: "",
    newCategoryName: "",
    newItemName: "",
    amountCents: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: c }, { data: i }] = await Promise.all([
        supabase.from("financial_categories").select("*").eq("project_id", projectId).order("name"),
        supabase.from("financial_items").select("*").eq("project_id", projectId).order("name"),
      ]);
      setCats(c ?? []);
      setItems(i ?? []);
    })();
    if (cost) {
      setForm({
        date: cost.date,
        buyer: cost.buyer,
        category_id: cost.financial_category_id,
        item_id: cost.financial_item_id,
        newCategoryName: "",
        newItemName: "",
        amountCents: Math.round(Number(cost.amount) * 100),
      });
    } else {
      setForm({ date: today(), buyer: "", category_id: "", item_id: "", newCategoryName: "", newItemName: "", amountCents: 0 });
    }
  }, [open, projectId, cost]);

  const filteredItems = useMemo(
    () => items.filter((it) => it.category_id === form.category_id),
    [items, form.category_id],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.buyer.trim() || form.amountCents <= 0) {
      return toast.error("Preencha data, comprador e valor.");
    }
    if (!form.category_id) return toast.error("Selecione ou crie uma categoria financeira.");
    if (!form.item_id) return toast.error("Selecione ou crie um item financeiro.");

    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { setSaving(false); return toast.error("Sessão expirada."); }

    let categoryId = form.category_id;
    let itemId = form.item_id;

    try {
      if (categoryId === NEW) {
        const name = form.newCategoryName.trim();
        if (!name) throw new Error("Informe o nome da nova categoria financeira.");
        const { data, error } = await supabase
          .from("financial_categories")
          .insert({ project_id: projectId, name })
          .select()
          .single();
        if (error) throw error;
        categoryId = data.id;
      }
      if (itemId === NEW) {
        const name = form.newItemName.trim();
        if (!name) throw new Error("Informe o nome do novo item financeiro.");
        const { data, error } = await supabase
          .from("financial_items")
          .insert({ project_id: projectId, category_id: categoryId, name })
          .select()
          .single();
        if (error) throw error;
        itemId = data.id;
      }

      const payload = {
        project_id: projectId,
        financial_category_id: categoryId,
        financial_item_id: itemId,
        date: form.date,
        buyer: form.buyer.trim(),
        amount: (form.amountCents / 100).toFixed(2),
        created_by: userId,
      };

      if (cost) {
        const { error } = await supabase
          .from("project_financial_costs")
          .update(payload)
          .eq("id", cost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_financial_costs").insert(payload);
        if (error) throw error;
      }

      toast.success(cost ? "Custo atualizado." : "Custo registrado.");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message ?? "Falha ao salvar custo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{cost ? "Editar custo" : "Adicionar custo"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Data</label>
              <input className="auth-field" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Comprador</label>
              <input className="auth-field" required placeholder="Nome do comprador" value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Categoria financeira</label>
            <select
              className="auth-field"
              required
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value, item_id: "", newItemName: "" })}
            >
              <option value="">Selecione</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value={NEW}>+ Criar nova categoria</option>
            </select>
            {form.category_id === NEW && (
              <input
                className="auth-field mt-2"
                placeholder="Nome da nova categoria (ex.: Material)"
                value={form.newCategoryName}
                onChange={(e) => setForm({ ...form, newCategoryName: e.target.value })}
              />
            )}
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Item financeiro</label>
            <select
              className="auth-field"
              required
              disabled={!form.category_id}
              value={form.item_id}
              onChange={(e) => setForm({ ...form, item_id: e.target.value })}
            >
              <option value="">Selecione</option>
              {form.category_id !== NEW && filteredItems.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
              <option value={NEW}>+ Criar novo item</option>
            </select>
            {form.item_id === NEW && (
              <input
                className="auth-field mt-2"
                placeholder="Nome do novo item (ex.: Cimento)"
                value={form.newItemName}
                onChange={(e) => setForm({ ...form, newItemName: e.target.value })}
              />
            )}
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Valor (R$)</label>
            <input
              className="auth-field"
              required
              inputMode="numeric"
              value={formatBRL(form.amountCents)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setForm({ ...form, amountCents: digits ? parseInt(digits, 10) : 0 });
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="construction" disabled={saving}>{saving ? "Salvando..." : (cost ? "Salvar" : "Adicionar custo")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FinancialCostFormDialog;
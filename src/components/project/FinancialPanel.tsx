import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import FinancialCostFormDialog from "@/components/modals/FinancialCostFormDialog";
import ConfirmDialog from "@/components/modals/ConfirmDialog";

type Cost = Database["public"]["Tables"]["project_financial_costs"]["Row"];
type FCategory = Database["public"]["Tables"]["financial_categories"]["Row"];
type FItem = Database["public"]["Tables"]["financial_items"]["Row"];

type Props = { projectId: string; canManage: boolean };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const FinancialPanel = ({ projectId, canManage }: Props) => {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [cats, setCats] = useState<FCategory[]>([]);
  const [items, setItems] = useState<FItem[]>([]);
  const [filterCat, setFilterCat] = useState("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Cost | null>(null);
  const [deleting, setDeleting] = useState<Cost | null>(null);

  const load = async () => {
    const [{ data: c }, { data: ct }, { data: it }] = await Promise.all([
      supabase.from("project_financial_costs").select("*").eq("project_id", projectId).order("date", { ascending: false }),
      supabase.from("financial_categories").select("*").eq("project_id", projectId).order("name"),
      supabase.from("financial_items").select("*").eq("project_id", projectId).order("name"),
    ]);
    setCosts(c ?? []);
    setCats(ct ?? []);
    setItems(it ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "—";
  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? "—";

  const filtered = useMemo(
    () => costs.filter((c) => filterCat === "all" || c.financial_category_id === filterCat),
    [costs, filterCat],
  );

  const total = useMemo(() => filtered.reduce((acc, c) => acc + Number(c.amount), 0), [filtered]);

  const totalsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of costs) map.set(c.financial_category_id, (map.get(c.financial_category_id) ?? 0) + Number(c.amount));
    return Array.from(map.entries()).map(([id, v]) => ({ id, name: catName(id), total: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costs, cats]);

  const removeCost = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("project_financial_costs").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Custo excluído.");
    setDeleting(null);
    load();
  };

  return (
    <div className="grid gap-6">
      <div className="panel-head">
        <h2>Controle financeiro</h2>
        {canManage && (
          <Button variant="construction" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Adicionar custo
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="metric-card">
          <span>Total geral</span>
          <strong className="text-2xl">{brl(costs.reduce((a, c) => a + Number(c.amount), 0))}</strong>
          <p>{costs.length} lançamento(s)</p>
        </div>
        <div className="metric-card">
          <span>Categorias financeiras</span>
          <strong className="text-2xl">{cats.length}</strong>
          <p>{items.length} item(ns) cadastrados</p>
        </div>
        <div className="metric-card">
          <span>Filtrado</span>
          <strong className="text-2xl">{brl(total)}</strong>
          <p>{filtered.length} lançamento(s)</p>
        </div>
      </div>

      {totalsByCategory.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Total por categoria</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {totalsByCategory.map((t) => (
              <span key={t.id} className="rounded-full border border-border bg-secondary px-3 py-1 text-xs">
                <strong>{t.name}:</strong> {brl(t.total)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground">Filtrar por categoria</label>
          <select className="auth-field" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">Todas</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Comprador</th>
              <th className="px-3 py-2 text-right">Valor</th>
              {canManage && <th className="px-3 py-2 w-24" />}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={canManage ? 6 : 5} className="px-3 py-8 text-center text-muted-foreground">
                <Wallet className="mx-auto mb-2 size-6" /> Nenhum custo registrado ainda.
              </td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(c.date).toLocaleDateString("pt-BR")}</td>
                <td className="px-3 py-2">{catName(c.financial_category_id)}</td>
                <td className="px-3 py-2">{itemName(c.financial_item_id)}</td>
                <td className="px-3 py-2">{c.buyer}</td>
                <td className="px-3 py-2 text-right font-medium">{brl(Number(c.amount))}</td>
                {canManage && (
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="outline" onClick={() => setEditing(c)}><Edit className="size-3" /></Button>
                      <Button size="icon" variant="outline" onClick={() => setDeleting(c)}><Trash2 className="size-3" /></Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FinancialCostFormDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        projectId={projectId}
        cost={editing}
        onSaved={load}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir custo?"
        description="Esta ação remove permanentemente o lançamento financeiro."
        onConfirm={removeCost}
      />
    </div>
  );
};

export default FinancialPanel;
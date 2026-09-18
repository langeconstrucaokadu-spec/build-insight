import { useEffect, useMemo, useState } from "react";
import { Boxes, Edit, Package, Plus, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import InventoryItemFormDialog from "@/components/modals/InventoryItemFormDialog";
import {
  formatQuantity,
  ownerLabels,
  ownerOptions,
  typeLabels,
  typeOptions,
  unitDisplay,
  type InventoryItem,
} from "@/lib/inventory";

type ProjectOption = { id: string; name: string };

type Props = {
  /** "galpao" = inventário geral; um id de obra = inventário daquela obra. */
  scope: "galpao" | { projectId: string };
  canManage: boolean;
  canDelete: boolean;
  projects?: ProjectOption[];
  title?: string;
};

export const InventoryPanel = ({ scope, canManage, canDelete, projects = [], title = "Itens do inventário" }: Props) => {
  const projectId = scope === "galpao" ? null : scope.projectId;
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fType, setFType] = useState("all");
  const [fOwner, setFOwner] = useState("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("inventory_items").select("*").order("name");
    query = projectId ? query.eq("project_id", projectId) : query.eq("location_type", "galpao");
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (fType !== "all" && r.type !== fType) return false;
    if (fOwner !== "all" && r.owner !== fOwner) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, fType, fOwner, search]);

  const totalTools = rows.filter((r) => r.type === "ferramenta" || r.type === "equipamento").length;
  const totalMaterials = rows.filter((r) => r.type === "material").length;

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Item removido do inventário.");
    setDeleting(null);
    load();
  };

  const hasFilters = fType !== "all" || fOwner !== "all" || !!search;

  return (
    <div className="grid gap-6">
      <div className="panel-head">
        <h2>{title}</h2>
        {canManage && (
          <Button variant="construction" size="sm" onClick={() => setCreating(true)} aria-label="Adicionar item">
            <Plus className="size-4" /> <span className="btn-label">Adicionar item</span>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="metric-card">
          <span className="flex items-center gap-2"><Boxes className="size-4" /> Itens cadastrados</span>
          <strong className="text-2xl">{rows.length}</strong>
          <p>{filtered.length} no filtro atual</p>
        </div>
        <div className="metric-card">
          <span className="flex items-center gap-2"><Package className="size-4" /> Materiais</span>
          <strong className="text-2xl">{totalMaterials}</strong>
          <p>registros do tipo material</p>
        </div>
        <div className="metric-card">
          <span className="flex items-center gap-2"><Wrench className="size-4" /> Ferramentas e equipamentos</span>
          <strong className="text-2xl">{totalTools}</strong>
          <p>registros somados</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground">Buscar</label>
          <input className="auth-field" placeholder="Nome do item" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground">Tipo</label>
          <select className="auth-field" value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="all">Todos</option>
            {typeOptions.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
          </select>
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground">Proprietário</label>
          <select className="auth-field" value={fOwner} onChange={(e) => setFOwner(e.target.value)}>
            <option value="all">Todos</option>
            {ownerOptions.map((o) => <option key={o} value={o}>{ownerLabels[o]}</option>)}
          </select>
        </div>
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={() => { setFType("all"); setFOwner("all"); setSearch(""); }}>Limpar filtros</Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Proprietário</th>
              <th className="px-3 py-2 text-right">Quantidade</th>
              <th className="px-3 py-2">Unidade</th>
              <th className="px-3 py-2">Local atual</th>
              {(canManage || canDelete) && <th className="px-3 py-2 w-24" />}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                <Boxes className="mx-auto mb-2 size-6" /> Nenhum item no inventário ainda.
              </td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <strong>{r.name}</strong>
                  {r.observation && <p className="text-xs text-muted-foreground">{r.observation}</p>}
                </td>
                <td className="px-3 py-2">{typeLabels[r.type]}</td>
                <td className="px-3 py-2">{ownerLabels[r.owner]}</td>
                <td className="px-3 py-2 text-right font-medium">{formatQuantity(r.quantity)}</td>
                <td className="px-3 py-2">{unitDisplay(r)}</td>
                <td className="px-3 py-2">
                  {r.location_type === "galpao"
                    ? "Galpão"
                    : projects.find((p) => p.id === r.project_id)?.name ?? "Obra"}
                </td>
                {(canManage || canDelete) && (
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {canManage && <Button size="icon" variant="outline" aria-label="Editar item" onClick={() => setEditing(r)}><Edit className="size-3" /></Button>}
                      {canDelete && <Button size="icon" variant="outline" aria-label="Excluir item" onClick={() => setDeleting(r)}><Trash2 className="size-3" /></Button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InventoryItemFormDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        item={editing}
        projects={projects}
        fixedProjectId={projectId ?? undefined}
        onSaved={load}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir item do inventário?"
        description="Esta ação remove permanentemente o item do inventário."
        onConfirm={remove}
      />
    </div>
  );
};

export default InventoryPanel;

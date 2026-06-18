import { useEffect, useMemo, useState } from "react";
import { Edit, Trash2, Wallet, Building2, TrendingUp, Layers, BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import DashboardLayout, { useDashboardRole } from "@/components/dashboard/DashboardLayout";
import FinancialCostFormDialog from "@/components/modals/FinancialCostFormDialog";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { toast } from "sonner";

type Cost = Database["public"]["Tables"]["project_financial_costs"]["Row"];
type Project = Pick<Database["public"]["Tables"]["construction_projects"]["Row"], "id" | "name">;
type FCategory = Database["public"]["Tables"]["financial_categories"]["Row"];
type FItem = Database["public"]["Tables"]["financial_items"]["Row"];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const Financial = () => {
  const { isAdmin, userId, ready } = useDashboardRole();
  const [costs, setCosts] = useState<Cost[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cats, setCats] = useState<FCategory[]>([]);
  const [items, setItems] = useState<FItem[]>([]);
  const [permittedProjectIds, setPermittedProjectIds] = useState<Set<string>>(new Set());

  const [fProject, setFProject] = useState("all");
  const [fCat, setFCat] = useState("all");
  const [fBuyer, setFBuyer] = useState("all");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  const [editing, setEditing] = useState<Cost | null>(null);
  const [deleting, setDeleting] = useState<Cost | null>(null);

  const load = async () => {
    const [{ data: c }, { data: p }, { data: ct }, { data: it }] = await Promise.all([
      supabase.from("project_financial_costs").select("*").order("date", { ascending: false }),
      supabase.from("construction_projects").select("id,name"),
      supabase.from("financial_categories").select("*"),
      supabase.from("financial_items").select("*"),
    ]);
    setCosts(c ?? []);
    setProjects(p ?? []);
    setCats(ct ?? []);
    setItems(it ?? []);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("project_permissions")
        .select("project_id, can_create_report")
        .eq("user_id", userId);
      setPermittedProjectIds(new Set((data ?? []).filter((p) => p.can_create_report).map((p) => p.project_id)));
    })();
  }, [userId]);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Obra";
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "—";
  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? "—";

  const buyers = useMemo(
    () => Array.from(new Set(costs.map((c) => c.buyer))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [costs],
  );

  const filtered = useMemo(
    () =>
      costs.filter((c) => {
        if (fProject !== "all" && c.project_id !== fProject) return false;
        if (fCat !== "all" && c.financial_category_id !== fCat) return false;
        if (fBuyer !== "all" && c.buyer !== fBuyer) return false;
        if (fStart && c.date < fStart) return false;
        if (fEnd && c.date > fEnd) return false;
        return true;
      }),
    [costs, fProject, fCat, fBuyer, fStart, fEnd],
  );

  const totalGeneral = useMemo(() => filtered.reduce((a, c) => a + Number(c.amount), 0), [filtered]);

  const totalsByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of filtered) m.set(c.project_id, (m.get(c.project_id) ?? 0) + Number(c.amount));
    return Array.from(m.entries())
      .map(([id, total]) => ({ id, name: projectName(id), total }))
      .sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, projects]);

  const totalsByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of filtered) m.set(c.financial_category_id, (m.get(c.financial_category_id) ?? 0) + Number(c.amount));
    return Array.from(m.entries())
      .map(([id, total]) => ({ id, name: catName(id), total }))
      .sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, cats]);

  const totalsByMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of filtered) {
      const key = c.date.slice(0, 7); // YYYY-MM
      m.set(key, (m.get(key) ?? 0) + Number(c.amount));
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [y, mo] = key.split("-");
        const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        return { month: label, total };
      });
  }, [filtered]);

  const projectsWithCosts = useMemo(() => new Set(costs.map((c) => c.project_id)).size, [costs]);
  const topProject = totalsByProject[0];
  const topCategory = totalsByCategory[0];
  const avgPerProject = projectsWithCosts > 0 ? totalGeneral / projectsWithCosts : 0;

  const canManage = (projectId: string) => isAdmin || permittedProjectIds.has(projectId);

  const removeCost = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("project_financial_costs").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Custo excluído.");
    setDeleting(null);
    load();
  };

  const clearFilters = () => { setFProject("all"); setFCat("all"); setFBuyer("all"); setFStart(""); setFEnd(""); };
  const hasFilters = fProject !== "all" || fCat !== "all" || fBuyer !== "all" || fStart || fEnd;

  if (!ready) return null;

  return (
    <DashboardLayout
      kicker="Visão consolidada"
      title="Financeiro"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="metric-card">
          <span className="flex items-center gap-2"><Wallet className="size-4" /> Total gasto geral</span>
          <strong className="text-xl sm:text-2xl">{brl(totalGeneral)}</strong>
          <p>{filtered.length} lançamento(s)</p>
        </div>
        <div className="metric-card">
          <span className="flex items-center gap-2"><Building2 className="size-4" /> Obras com custos</span>
          <strong className="text-xl sm:text-2xl">{projectsWithCosts}</strong>
          <p>de {projects.length} obras cadastradas</p>
        </div>
        <div className="metric-card">
          <span className="flex items-center gap-2"><TrendingUp className="size-4" /> Obra com maior custo</span>
          <strong className="text-base sm:text-lg">{topProject ? topProject.name : "—"}</strong>
          <p>{topProject ? brl(topProject.total) : "Sem lançamentos"}</p>
        </div>
        <div className="metric-card">
          <span className="flex items-center gap-2"><Layers className="size-4" /> Categoria líder</span>
          <strong className="text-base sm:text-lg">{topCategory ? topCategory.name : "—"}</strong>
          <p>{topCategory ? brl(topCategory.total) : "Sem lançamentos"}</p>
        </div>
        <div className="metric-card">
          <span className="flex items-center gap-2"><BarChart3 className="size-4" /> Média por obra</span>
          <strong className="text-xl sm:text-2xl">{brl(avgPerProject)}</strong>
          <p>Considerando obras com custos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Obra</label>
            <select className="auth-field" value={fProject} onChange={(e) => setFProject(e.target.value)}>
              <option value="all">Todas</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Categoria</label>
            <select className="auth-field" value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="all">Todas</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Quem comprou</label>
            <select className="auth-field" value={fBuyer} onChange={(e) => setFBuyer(e.target.value)}>
              <option value="all">Todos</option>
              {buyers.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Data inicial</label>
            <input type="date" className="auth-field" value={fStart} onChange={(e) => setFStart(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Data final</label>
            <input type="date" className="auth-field" value={fEnd} onChange={(e) => setFEnd(e.target.value)} />
          </div>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Gastos por obra</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalsByProject.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => brl(Number(v))} width={90} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Gastos por categoria</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={totalsByCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                  {totalsByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Gastos por mês</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalsByMonth}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => brl(Number(v))} width={90} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Listagem */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Obra</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Comprador</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                <Wallet className="mx-auto mb-2 size-6" /> Nenhum lançamento encontrado.
              </td></tr>
            )}
            {filtered.map((c) => {
              const can = canManage(c.project_id);
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(c.date).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2">{projectName(c.project_id)}</td>
                  <td className="px-3 py-2">{catName(c.financial_category_id)}</td>
                  <td className="px-3 py-2">{itemName(c.financial_item_id)}</td>
                  <td className="px-3 py-2">{c.buyer}</td>
                  <td className="px-3 py-2 text-right font-medium">{brl(Number(c.amount))}</td>
                  <td className="px-3 py-2">
                    {can && (
                      <div className="flex justify-end gap-1">
                <Button size="icon" variant="outline" onClick={() => setEditing(c)} aria-label="Editar custo"><Edit className="size-3" /></Button>
                <Button size="icon" variant="outline" onClick={() => setDeleting(c)} aria-label="Excluir custo"><Trash2 className="size-3" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <FinancialCostFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          projectId={editing.project_id}
          cost={editing}
          onSaved={load}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir custo?"
        description="Esta ação remove permanentemente o lançamento financeiro."
        onConfirm={removeCost}
      />
    </DashboardLayout>
  );
};

export default Financial;
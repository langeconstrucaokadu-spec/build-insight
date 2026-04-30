import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, ShieldCheck, UserRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { readUserRole, type AppRole } from "@/lib/permissions";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type ManagedUser = {
  user_id: string;
  email: string;
  full_name: string;
  role: AppRole;
  created_at: string;
};

const PermissionManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");

  const loadUsers = async () => {
    const { data, error } = await supabase.functions.invoke("manage-permissions", { body: { action: "list" } });
    console.info("[permissions] lista de usuários", { data, error });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    setUsers(data.users ?? []);
  };

  const refreshUsers = async () => {
    try {
      await loadUsers();
      toast.success("Lista de usuários atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar usuários.");
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return navigate("/login");

      const roleResult = await readUserRole(session.user.id, "permissions-page");
      console.info("[permissions] permissão aplicada", roleResult);
      if (!roleResult.isAdmin) {
        toast.error("Apenas administradores podem acessar permissões.");
        return navigate("/dashboard");
      }

      try {
        await loadUsers();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar usuários.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const toggleRole = async (user: ManagedUser) => {
    const nextRole: AppRole = user.role === "admin" ? "client" : "admin";
    setSavingUserId(user.user_id);

    try {
      const { data, error } = await supabase.functions.invoke("manage-permissions", { body: { action: "setRole", userId: user.user_id, role: nextRole } });
      console.info("[permissions] alteração de role", { userId: user.user_id, nextRole, data, error });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers(data.users ?? []);
      toast.success(`${user.full_name} agora é ${nextRole === "admin" ? "responsável" : "cliente"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a permissão.");
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-dashboard"><Loader2 className="size-8 animate-spin text-primary" /></main>;

  const filtered = users.filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout
      title="Usuários e permissões"
      kicker="Administração"
      actions={<Button variant="secondary" onClick={refreshUsers}><RefreshCw className="size-4" /> Atualizar</Button>}
    >
        <section className="dashboard-panel">
          <div className="panel-head">
            <label className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input className="auth-field pl-10" placeholder="Buscar por nome ou email" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <ShieldCheck className="size-6 text-primary" />
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-border">
            <div className="hidden gap-0 bg-muted px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground md:grid md:grid-cols-[1.5fr_1.3fr_0.7fr_180px]">
              <span>Usuário</span><span>Email</span><span>Permissão</span><span>Ação</span>
            </div>
            <div className="divide-y divide-border bg-card">
              {filtered.map((user) => (
                <div key={user.user_id} className="grid gap-4 px-4 py-4 md:grid-cols-[1.5fr_1.3fr_0.7fr_180px] md:items-center">
                  <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><UserRound className="size-4" /></span><div><strong className="block font-display">{user.full_name}</strong><small className="text-muted-foreground">Criado em {new Date(user.created_at).toLocaleDateString("pt-BR")}</small></div></div>
                  <span className="break-all text-sm font-semibold text-muted-foreground">{user.email}</span>
                  <span className="status-pill w-fit">{user.role === "admin" ? "Responsável" : "Cliente"}</span>
                  <Button disabled={savingUserId === user.user_id} variant={user.role === "admin" ? "outline" : "construction"} onClick={() => toggleRole(user)}>
                    {savingUserId === user.user_id && <Loader2 className="size-4 animate-spin" />}
                    {user.role === "admin" ? "Tornar cliente" : "Tornar admin"}
                  </Button>
                </div>
              ))}
              {!filtered.length && <div className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</div>}
            </div>
          </div>
        </section>
    </DashboardLayout>
  );
};

export default PermissionManagement;
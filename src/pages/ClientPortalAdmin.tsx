import { useEffect, useState } from "react";
import { Plus, Trash2, Key, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { portalAdmin } from "@/lib/clientPortal";
import { toast } from "sonner";

type PortalUser = { id: string; email: string; full_name: string; is_active: boolean; last_login_at: string | null; created_at: string };
type Access = { client_user_id: string; project_id: string };
type Project = { id: string; name: string };

const ClientPortalAdmin = () => {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [resetting, setResetting] = useState<PortalUser | null>(null);
  const [deleting, setDeleting] = useState<PortalUser | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [{ users, accesses }, { data: projs }] = await Promise.all([
        portalAdmin.list(),
        supabase.from("construction_projects").select("id,name").order("name"),
      ]);
      setUsers(users as PortalUser[]);
      setAccesses(accesses);
      setProjects((projs ?? []) as Project[]);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const accessFor = (uid: string) => accesses.filter((a) => a.client_user_id === uid).map((a) => a.project_id);

  const remove = async () => {
    if (!deleting) return;
    try { await portalAdmin.remove(deleting.id); toast.success("Cliente removido."); setDeleting(null); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const toggleActive = async (u: PortalUser) => {
    try { await portalAdmin.update(u.id, { is_active: !u.is_active }); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <DashboardLayout title="Portal do Cliente" kicker="Acessos externos">
      <section className="dashboard-panel">
        <div className="panel-head">
          <h2>Clientes cadastrados</h2>
          <Button variant="construction" size="sm" onClick={() => setCreating(true)}><Plus className="size-4" /> Novo cliente</Button>
        </div>
        {loading ? <p className="mt-4 text-sm text-muted-foreground">Carregando...</p> : users.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {users.map((u) => (
              <div key={u.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong className="block">{u.full_name}</strong>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {u.is_active ? "Ativo" : "Inativo"} · Último acesso: {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(u)}>Editar acessos</Button>
                    <Button size="sm" variant="outline" onClick={() => setResetting(u)}><Key className="size-3" /> Senha</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(u)}>
                      {u.is_active ? <><ShieldOff className="size-3" /> Desativar</> : <><ShieldCheck className="size-3" /> Ativar</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleting(u)}><Trash2 className="size-3" /></Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {accessFor(u.id).map((pid) => {
                    const p = projects.find((x) => x.id === pid);
                    return <span key={pid} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{p?.name ?? pid}</span>;
                  })}
                  {accessFor(u.id).length === 0 && <span className="text-xs text-muted-foreground">Nenhuma obra liberada.</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CreateDialog open={creating} onOpenChange={setCreating} projects={projects} onSaved={refresh} />
      <AccessDialog user={editing} onOpenChange={(o) => !o && setEditing(null)} projects={projects} initial={editing ? accessFor(editing.id) : []} onSaved={refresh} />
      <PasswordDialog user={resetting} onOpenChange={(o) => !o && setResetting(null)} onSaved={refresh} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Remover cliente?" description="O acesso ao portal será revogado." onConfirm={remove} />
    </DashboardLayout>
  );
};

const CreateDialog = ({ open, onOpenChange, projects, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; projects: Project[]; onSaved: () => void }) => {
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<string[]>([]); const [saving, setSaving] = useState(false);
  const reset = () => { setEmail(""); setName(""); setPassword(""); setSelected([]); };
  const submit = async () => {
    if (!email || !name || password.length < 8) return toast.error("Preencha e use senha com 8+ caracteres.");
    setSaving(true);
    try { await portalAdmin.create({ email, full_name: name, password, project_ids: selected }); toast.success("Cliente criado."); reset(); onOpenChange(false); onSaved(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo cliente externo</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm"><span>Nome completo</span><input className="auth-field" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="grid gap-1 text-sm"><span>E-mail</span><input className="auth-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="grid gap-1 text-sm"><span>Senha inicial (mín. 8)</span><input className="auth-field" type="text" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <div className="grid gap-1 text-sm">
            <span>Obras liberadas</span>
            <div className="grid max-h-48 gap-1 overflow-auto rounded border border-border p-2">
              {projects.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id))} />
                  {p.name}
                </label>
              ))}
              {projects.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma obra disponível.</span>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="construction" disabled={saving} onClick={submit}>{saving ? "Salvando..." : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AccessDialog = ({ user, onOpenChange, projects, initial, onSaved }: { user: PortalUser | null; onOpenChange: (o: boolean) => void; projects: Project[]; initial: string[]; onSaved: () => void }) => {
  const [selected, setSelected] = useState<string[]>(initial);
  useEffect(() => { setSelected(initial); }, [initial.join(",")]);
  const submit = async () => {
    if (!user) return;
    try { await portalAdmin.setAccess(user.id, selected); toast.success("Acessos atualizados."); onOpenChange(false); onSaved(); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Obras liberadas para {user?.full_name}</DialogTitle></DialogHeader>
        <div className="grid max-h-72 gap-1 overflow-auto rounded border border-border p-2">
          {projects.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id))} />
              {p.name}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="construction" onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PasswordDialog = ({ user, onOpenChange, onSaved }: { user: PortalUser | null; onOpenChange: (o: boolean) => void; onSaved: () => void }) => {
  const [pwd, setPwd] = useState("");
  useEffect(() => { setPwd(""); }, [user?.id]);
  const submit = async () => {
    if (!user) return;
    if (pwd.length < 8) return toast.error("Senha precisa ter ao menos 8 caracteres.");
    try { await portalAdmin.update(user.id, { password: pwd }); toast.success("Senha atualizada."); onOpenChange(false); onSaved(); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Redefinir senha</DialogTitle></DialogHeader>
        <label className="grid gap-1 text-sm"><span>Nova senha (mín. 8)</span><input className="auth-field" type="text" value={pwd} onChange={(e) => setPwd(e.target.value)} /></label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="construction" onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientPortalAdmin;
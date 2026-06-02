import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portalApi, portalAuth } from "@/lib/clientPortal";
import { toast } from "sonner";

type Project = { id: string; name: string; location: string; status: string; progress: number; current_stage?: string };

const PortalHome = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState(portalAuth.user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!portalAuth.token) { navigate("/portal/login"); return; }
    portalApi.me()
      .then(({ user, projects }) => { setUser(user); setProjects(projects as Project[]); })
      .catch((e) => { toast.error((e as Error).message); portalAuth.clear(); navigate("/portal/login"); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = async () => {
    await portalApi.logout().catch(() => {});
    navigate("/portal/login");
  };

  return (
    <main className="min-h-screen bg-dashboard">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="section-kicker">Portal do Cliente</p>
            <h1 className="font-display text-2xl font-bold">Olá, {user?.full_name}</h1>
          </div>
          <Button variant="outline" onClick={logout}><LogOut className="size-4" /> Sair</Button>
        </div>
      </header>
      <section className="mx-auto max-w-5xl space-y-4 px-6 py-8">
        <h2 className="font-display text-lg font-semibold">Suas obras</h2>
        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          projects.length === 0 ? (
            <div className="dashboard-panel text-center text-muted-foreground">Nenhuma obra liberada para o seu acesso.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((p) => (
                <Link key={p.id} to={`/portal/obra/${p.id}`} className="dashboard-panel block transition hover:border-primary/50">
                  <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" /> {p.location}</p>
                  <div className="mt-4 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${p.progress}%` }} /></div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.progress}% concluído</p>
                </Link>
              ))}
            </div>
          )}
      </section>
    </main>
  );
};
export default PortalHome;
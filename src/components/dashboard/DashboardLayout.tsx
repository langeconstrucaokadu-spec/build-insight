import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { BarChart3, CalendarDays, FilePlus2, FolderOpen, ImageIcon, Loader2, LogOut, Menu, ShieldCheck, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { readUserRole, type AppRole } from "@/lib/permissions";
import langeLogo from "@/assets/lange-logo.jpeg";

type DashboardLayoutProps = {
  children: ReactNode;
  title: string;
  kicker?: string;
  actions?: ReactNode;
};

type NavEntry = { to: string; label: string; icon: typeof BarChart3; adminOnly?: boolean };

const NAV: NavEntry[] = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/obras", label: "Obras", icon: FolderOpen },
  { to: "/relatorios", label: "Relatórios", icon: FilePlus2 },
  /*{ to: "/cronograma", label: "Cronograma", icon: CalendarDays },*/
  { to: "/galeria", label: "Galeria", icon: ImageIcon },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/permissoes", label: "Permissões", icon: ShieldCheck, adminOnly: true },
  { to: "/clientes-portal", label: "Portal do Cliente", icon: ShieldCheck, adminOnly: true },
];

export const DashboardLayout = ({ children, title, kicker, actions }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [role, setRole] = useState<AppRole>("client");
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return navigate("/login");
      const result = await readUserRole(data.session.user.id, "layout");
      setRole(result.role);
      setReady(true);
    };
    init();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const items = NAV.filter((item) => !item.adminOnly || role === "admin");

  if (!ready) return <main className="grid min-h-screen place-items-center bg-dashboard"><Loader2 className="size-8 animate-spin text-primary" /></main>;

  return (
    <main className="min-h-screen bg-dashboard text-foreground">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-card px-5 py-6 lg:flex lg:flex-col">
        <Link to="/" className="flex items-center gap-3">
          <img src={langeLogo} alt="Lange Construções" className="size-11 rounded-lg bg-white object-contain p-1 shadow-soft" />
          <span className="font-display text-base font-bold leading-tight">Lange<br/>Construções</span>
        </Link>
        <nav className="mt-10 grid gap-2 text-sm font-semibold">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/dashboard"} className={({ isActive }) => isActive ? "nav-active" : "nav-item"}>
              <item.icon className="size-4" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <Button className="mt-auto" variant="outline" onClick={signOut}><LogOut className="size-4" /> Sair</Button>
      </aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-card px-5 py-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <img src={langeLogo} alt="Lange Construções" className="size-10 rounded-lg bg-white object-contain p-1" />
                <span className="font-display text-base font-bold leading-tight">Lange<br/>Construções</span>
              </Link>
              <Button size="icon" variant="ghost" onClick={() => setMobileOpen(false)}><X className="size-5" /></Button>
            </div>
            <nav className="mt-8 grid gap-2 text-sm font-semibold">
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === "/dashboard"} onClick={() => setMobileOpen(false)} className={({ isActive }) => isActive ? "nav-active" : "nav-item"}>
                  <item.icon className="size-4" /> {item.label}
                </NavLink>
              ))}
            </nav>
            <Button className="mt-auto" variant="outline" onClick={signOut}><LogOut className="size-4" /> Sair</Button>
          </aside>
        </div>
      )}

      <section className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-dashboard/90 px-4 py-4 backdrop-blur-xl sm:px-5 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button size="icon" variant="outline" className="lg:hidden shrink-0" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu className="size-5" /></Button>
              <div className="min-w-0">
                {kicker && <p className="section-kicker">{kicker}</p>}
                <h1 className="font-display text-xl font-bold sm:text-2xl md:text-3xl break-words" style={{ overflowWrap: "anywhere" }}>{title}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-5 sm:py-8 sm:space-y-8 lg:px-8">{children}</div>
      </section>
    </main>
  );
};

export const useDashboardRole = () => {
  const [role, setRole] = useState<AppRole>("client");
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const navigate = useNavigate();
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return navigate("/login");
      setUserId(data.session.user.id);
      const result = await readUserRole(data.session.user.id, "layout-hook");
      setRole(result.role);
      setReady(true);
    };
    run();
  }, [navigate]);
  return { role, isAdmin: role === "admin", ready, userId };
};

export default DashboardLayout;
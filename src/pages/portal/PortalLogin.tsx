import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { portalApi, portalAuth } from "@/lib/clientPortal";
import { toast } from "sonner";

const PortalLogin = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawRedirect = params.get("redirect") ?? "";
  // Segurança: só aceita redirect interno do portal do cliente
  const safeRedirect = rawRedirect.startsWith("/portal/") || rawRedirect === "/portal"
    ? rawRedirect
    : "/portal";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user } = await portalApi.login(email, password);
      portalAuth.save(token, user);
      toast.success(`Bem-vindo, ${user.full_name}.`);
      navigate(safeRedirect);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-dashboard p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-elevated">
        <p className="section-kicker">Portal do Cliente</p>
        <h1 className="mt-2 font-display text-2xl font-bold">Acompanhamento da obra</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesse com suas credenciais fornecidas pelo administrador.</p>
        <div className="mt-6 grid gap-3">
          <label className="grid gap-1 text-sm"><span>E-mail</span>
            <input className="auth-field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm"><span>Senha</span>
            <input className="auth-field" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <Button type="submit" variant="construction" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
        </div>
      </form>
    </main>
  );
};
export default PortalLogin;
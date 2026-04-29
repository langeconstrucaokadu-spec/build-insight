import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { readUserRole } from "@/lib/permissions";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        console.info("[auth-login] sessão existente encontrada", { userId: data.session.user.id, email: data.session.user.email });
        readUserRole(data.session.user.id, "login-existing-session").then((role) => console.info("[auth-login] role da sessão existente", role));
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const email = form.email.trim();
    const password = form.password;

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: form.name.trim() },
          },
        });
        if (error) throw error;
        toast.success("Cadastro criado. Confira seu email para confirmar o acesso.");
        setMode("login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.info("[auth-login] login por senha concluído", { userId: data.user?.id, email: data.user?.email });
        if (data.user?.id) {
          const roleResult = await readUserRole(data.user.id, "login-password");
          console.info("[auth-login] role após login por senha", roleResult);
        }
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível autenticar.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/dashboard` });
    setLoading(false);
    if (result.error) toast.error(result.error.message);
    if (!result.redirected && !result.error) {
      const { data } = await supabase.auth.getSession();
      console.info("[auth-login] login Google concluído", { userId: data.session?.user.id, email: data.session?.user.email });
      if (data.session?.user.id) {
        const roleResult = await readUserRole(data.session.user.id, "login-google");
        console.info("[auth-login] role após login Google", roleResult);
      }
      navigate("/dashboard");
    }
  };

  return (
    <main className="grid min-h-screen bg-dashboard text-foreground lg:grid-cols-[1fr_0.9fr]">
      <section className="hidden overflow-hidden bg-foreground p-10 text-background lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Building2 className="size-5" /></span><span className="font-display text-xl font-bold">Arco Forte</span></Link>
        <div className="max-w-xl animate-enter-up"><p className="font-bold uppercase tracking-[0.2em] text-accent">Área privada</p><h1 className="mt-4 font-display text-6xl font-bold leading-none">Obras, relatórios e cronogramas em um só lugar.</h1><p className="mt-6 text-lg leading-8 text-background/70">Acesso seguro para equipe administrativa e clientes acompanharem o avanço da construção com transparência.</p></div>
        <div className="grid grid-cols-3 gap-3 text-sm text-background/70"><span>Permissões por usuário</span><span>Upload de mídia</span><span>Dashboard responsivo</span></div>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-7 shadow-elevated">
          <Link to="/" className="mb-8 flex items-center gap-3 lg:hidden"><span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Building2 className="size-5" /></span><span className="font-display text-xl font-bold">Arco Forte</span></Link>
          <h2 className="font-display text-3xl font-bold">{mode === "login" ? "Entrar no sistema" : "Criar acesso"}</h2>
          <p className="mt-2 text-muted-foreground">Use email e senha ou sua conta Google.</p>
          <form onSubmit={submit} className="mt-7 grid gap-4">
            {mode === "signup" && <input className="auth-field" required placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            <input className="auth-field" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="auth-field" required minLength={8} type="password" placeholder="Senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Button disabled={loading} variant="construction" size="lg" type="submit">{loading && <Loader2 className="size-4 animate-spin" />}{mode === "login" ? "Entrar" : "Cadastrar"}</Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"><span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" /></div>
          <Button disabled={loading} variant="outline" size="lg" className="w-full" onClick={signInWithGoogle}>Continuar com Google</Button>
          <button className="mt-5 w-full text-center text-sm font-semibold text-primary hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Ainda não tenho acesso" : "Já tenho uma conta"}</button>
        </div>
      </section>
    </main>
  );
};

export default Login;

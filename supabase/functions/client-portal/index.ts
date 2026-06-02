// Portal do Cliente — login, dados e administração (admin-only).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// ====== Helpers ======
const enc = new TextEncoder();
const toHex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" },
    key, 256,
  );
  return `pbkdf2$120000$${toHex(salt.buffer)}$${toHex(bits)}`;
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, iterStr, saltHex, hashHex] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const iter = Number(iterStr);
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, key, 256);
  return toHex(bits) === hashHex;
}

async function sha256Hex(s: string) {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

function generateToken() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return toHex(buf.buffer);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function getClientFromToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const { data, error } = await admin.rpc("verify_client_portal_token", { _token_hash: tokenHash });
  if (error || !data || !data.length) return null;
  return data[0] as { client_user_id: string; email: string; full_name: string };
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return null;
  const user = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: u } = await user.auth.getUser();
  if (!u?.user) return null;
  const { data: roleOk } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  return roleOk ? u.user : null;
}

// ====== Router ======
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  // Path after /client-portal
  const path = url.pathname.replace(/^.*\/client-portal/, "") || "/";
  try {
    // ---------- LOGIN ----------
    if (path === "/login" && req.method === "POST") {
      const { email, password } = await req.json();
      if (!email || !password) return json({ error: "Informe e-mail e senha." }, 400);
      const { data: usr } = await admin
        .from("client_portal_users").select("*").eq("email", String(email).toLowerCase().trim()).maybeSingle();
      if (!usr || !usr.is_active) return json({ error: "Credenciais inválidas." }, 401);
      const ok = await verifyPassword(password, usr.password_hash);
      if (!ok) return json({ error: "Credenciais inválidas." }, 401);
      const token = generateToken();
      const tokenHash = await sha256Hex(token);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await admin.from("client_portal_sessions").insert({ client_user_id: usr.id, token_hash: tokenHash, expires_at: expiresAt });
      await admin.from("client_portal_users").update({ last_login_at: new Date().toISOString() }).eq("id", usr.id);
      return json({ token, expires_at: expiresAt, user: { id: usr.id, email: usr.email, full_name: usr.full_name } });
    }

    // ---------- LOGOUT ----------
    if (path === "/logout" && req.method === "POST") {
      const auth = req.headers.get("authorization") ?? "";
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        const tokenHash = await sha256Hex(token);
        await admin.from("client_portal_sessions").delete().eq("token_hash", tokenHash);
      }
      return json({ ok: true });
    }

    // ---------- ME ----------
    if (path === "/me" && req.method === "GET") {
      const c = await getClientFromToken(req);
      if (!c) return json({ error: "Não autorizado." }, 401);
      const { data: links } = await admin
        .from("client_portal_project_access").select("project_id").eq("client_user_id", c.client_user_id);
      const ids = (links ?? []).map((l) => l.project_id);
      let projects: unknown[] = [];
      if (ids.length) {
        const { data } = await admin.from("construction_projects").select("*").in("id", ids).order("name");
        projects = data ?? [];
      }
      return json({ user: c, projects });
    }

    // ---------- PROJECT DETAIL ----------
    const projMatch = path.match(/^\/project\/([0-9a-f-]+)$/i);
    if (projMatch && req.method === "GET") {
      const c = await getClientFromToken(req);
      if (!c) return json({ error: "Não autorizado." }, 401);
      const projectId = projMatch[1];
      const { data: access } = await admin
        .from("client_portal_project_access").select("id")
        .eq("client_user_id", c.client_user_id).eq("project_id", projectId).maybeSingle();
      if (!access) return json({ error: "Acesso negado." }, 403);
      const [project, categories, subcategories, items, reports, media] = await Promise.all([
        admin.from("construction_projects").select("*").eq("id", projectId).maybeSingle(),
        admin.from("project_categories").select("*").eq("project_id", projectId).order("name"),
        admin.from("project_subcategories").select("*").eq("project_id", projectId).order("name"),
        admin.from("project_items").select("*").eq("project_id", projectId).order("order_index"),
        admin.from("project_reports").select("*").eq("project_id", projectId).order("report_date", { ascending: false }),
        admin.from("report_media").select("*").eq("project_id", projectId).order("uploaded_at", { ascending: false }),
      ]);
      return json({
        project: project.data,
        categories: categories.data ?? [],
        subcategories: subcategories.data ?? [],
        items: items.data ?? [],
        reports: reports.data ?? [],
        media: media.data ?? [],
      });
    }

    // ---------- ADMIN ROUTES ----------
    if (path.startsWith("/admin/")) {
      const adminUser = await requireAdmin(req);
      if (!adminUser) return json({ error: "Apenas administradores." }, 403);

      // List clients with their accesses
      if (path === "/admin/users" && req.method === "GET") {
        const { data: users } = await admin.from("client_portal_users").select("*").order("created_at", { ascending: false });
        const { data: accesses } = await admin.from("client_portal_project_access").select("*");
        return json({ users: users ?? [], accesses: accesses ?? [] });
      }

      // Create client
      if (path === "/admin/users" && req.method === "POST") {
        const { email, full_name, password, project_ids } = await req.json();
        if (!email || !full_name || !password) return json({ error: "Campos obrigatórios faltando." }, 400);
        if (String(password).length < 8) return json({ error: "Senha precisa ter ao menos 8 caracteres." }, 400);
        const password_hash = await hashPassword(password);
        const { data: newUser, error } = await admin
          .from("client_portal_users")
          .insert({ email: String(email).toLowerCase().trim(), full_name: String(full_name).trim(), password_hash })
          .select("*").single();
        if (error || !newUser) return json({ error: error?.message ?? "Falha ao criar." }, 400);
        if (Array.isArray(project_ids) && project_ids.length) {
          await admin.from("client_portal_project_access").insert(
            project_ids.map((pid: string) => ({ client_user_id: newUser.id, project_id: pid })),
          );
        }
        return json({ user: newUser });
      }

      // Patch client (ativar/desativar, nome, senha)
      const userMatch = path.match(/^\/admin\/users\/([0-9a-f-]+)$/i);
      if (userMatch && req.method === "PATCH") {
        const id = userMatch[1];
        const body = await req.json();
        const patch: Record<string, unknown> = {};
        if (typeof body.full_name === "string") patch.full_name = body.full_name.trim();
        if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
        if (typeof body.password === "string" && body.password.length >= 8) {
          patch.password_hash = await hashPassword(body.password);
        }
        const { data, error } = await admin.from("client_portal_users").update(patch).eq("id", id).select("*").single();
        if (error) return json({ error: error.message }, 400);
        return json({ user: data });
      }

      if (userMatch && req.method === "DELETE") {
        const id = userMatch[1];
        const { error } = await admin.from("client_portal_users").delete().eq("id", id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      // Set project access list
      const accessMatch = path.match(/^\/admin\/users\/([0-9a-f-]+)\/access$/i);
      if (accessMatch && req.method === "PUT") {
        const id = accessMatch[1];
        const { project_ids } = await req.json();
        await admin.from("client_portal_project_access").delete().eq("client_user_id", id);
        if (Array.isArray(project_ids) && project_ids.length) {
          await admin.from("client_portal_project_access").insert(
            project_ids.map((pid: string) => ({ client_user_id: id, project_id: pid })),
          );
        }
        return json({ ok: true });
      }
    }

    return json({ error: "Rota não encontrada." }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-portal`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const TOKEN_KEY = "client_portal_token";
const USER_KEY = "client_portal_user";

export type PortalUser = { client_user_id: string; email: string; full_name: string };

export const portalAuth = {
  get token(): string | null { return localStorage.getItem(TOKEN_KEY); },
  get user(): PortalUser | null {
    const raw = localStorage.getItem(USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  save(token: string, user: PortalUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
};

async function call<T>(path: string, init: RequestInit = {}, useToken: "client" | "admin" | "none" = "client"): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (useToken === "client") {
    const t = portalAuth.token;
    if (t) headers.Authorization = `Bearer ${t}`;
  } else if (useToken === "admin") {
    // admin uses Supabase JWT from current session
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch(`${FN_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

export const portalApi = {
  login: (email: string, password: string) =>
    call<{ token: string; user: PortalUser; expires_at: string }>(
      "/login", { method: "POST", body: JSON.stringify({ email, password }) }, "none",
    ),
  logout: () => call<{ ok: true }>("/logout", { method: "POST" }, "client").finally(() => portalAuth.clear()),
  me: () => call<{ user: PortalUser; projects: Array<Record<string, unknown>> }>("/me", { method: "GET" }, "client"),
  project: (id: string) => call<{
    project: Record<string, unknown>;
    categories: Array<Record<string, unknown>>;
    subcategories: Array<Record<string, unknown>>;
    items: Array<Record<string, unknown>>;
    reports: Array<Record<string, unknown>>;
    media: Array<Record<string, unknown>>;
  }>(`/project/${id}`, { method: "GET" }, "client"),
};

export const portalAdmin = {
  list: () => call<{ users: Array<Record<string, unknown>>; accesses: Array<{ client_user_id: string; project_id: string }> }>(
    "/admin/users", { method: "GET" }, "admin",
  ),
  create: (payload: { email: string; full_name: string; password: string; project_ids: string[] }) =>
    call<{ user: Record<string, unknown> }>("/admin/users", { method: "POST", body: JSON.stringify(payload) }, "admin"),
  update: (id: string, patch: { full_name?: string; is_active?: boolean; password?: string }) =>
    call<{ user: Record<string, unknown> }>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) }, "admin"),
  remove: (id: string) => call<{ ok: true }>(`/admin/users/${id}`, { method: "DELETE" }, "admin"),
  setAccess: (id: string, project_ids: string[]) =>
    call<{ ok: true }>(`/admin/users/${id}/access`, { method: "PUT", body: JSON.stringify({ project_ids }) }, "admin"),
};
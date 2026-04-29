import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) return json({ error: "Sessão não encontrada." }, 401);

    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: userResult, error: userError } = await adminClient.auth.getUser(token);
    const requester = userResult.user;

    if (userError || !requester) return json({ error: "Sessão inválida." }, 401);

    const { data: requesterRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requester.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!requesterRole) return json({ error: "Apenas administradores podem gerenciar permissões." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as "list" | "setRole" | undefined;

    if (action === "setRole") {
      const userId = String(body.userId ?? "");
      const role = body.role as AppRole;

      if (!userId || !["admin", "client"].includes(role)) return json({ error: "Dados de permissão inválidos." }, 400);

      if (role === "client") {
        const { count } = await adminClient
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");

        if (requester.id === userId && (count ?? 0) <= 1) {
          return json({ error: "Mantenha pelo menos um administrador ativo." }, 400);
        }

        const { error } = await adminClient.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      } else {
        const { error } = await adminClient.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        if (error) throw error;
      }
    }

    const [{ data: usersData, error: usersError }, { data: roleRows, error: rolesError }, { data: profiles, error: profilesError }] = await Promise.all([
      adminClient.auth.admin.listUsers({ page: 1, perPage: 100 }),
      adminClient.from("user_roles").select("user_id, role"),
      adminClient.from("profiles").select("user_id, full_name"),
    ]);

    if (usersError) throw usersError;
    if (rolesError) throw rolesError;
    if (profilesError) throw profilesError;

    const profileByUser = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.full_name]));
    const adminIds = new Set((roleRows ?? []).filter((item) => item.role === "admin").map((item) => item.user_id));

    const users = usersData.users.map((user) => ({
      user_id: user.id,
      email: user.email ?? "Sem email",
      full_name: profileByUser.get(user.id) ?? user.user_metadata?.full_name ?? user.email ?? "Usuário",
      role: adminIds.has(user.id) ? "admin" : "client",
      created_at: user.created_at,
    }));

    return json({ users });
  } catch (error) {
    console.error("manage-permissions error", error);
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
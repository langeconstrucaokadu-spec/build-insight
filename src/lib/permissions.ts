import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

type RoleResult = {
  role: AppRole;
  isAdmin: boolean;
  source: "user_roles" | "has_role" | "manage-permissions" | "fallback";
  error?: unknown;
};

const logRole = (context: string, message: string, payload?: unknown) => {
  console.info(`[role-check:${context}] ${message}`, payload ?? "");
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const readUserRole = async (userId: string, context = "app"): Promise<RoleResult> => {
  logRole(context, "iniciando verificação", { userId });

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    logRole(context, `resultado user_roles tentativa ${attempt}`, { roleRows, roleError });

    if (!roleError && roleRows?.some((item) => item.role === "admin")) {
      return { role: "admin", isAdmin: true, source: "user_roles" };
    }

    lastError = roleError;
    if (!roleError) break;
    await wait(450 * attempt);
  }

  const { data: hasAdmin, error: rpcError } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  logRole(context, "fallback has_role(admin)", { hasAdmin, rpcError });

  if (!rpcError && hasAdmin) {
    return { role: "admin", isAdmin: true, source: "has_role" };
  }

  const { data: functionRole, error: functionError } = await supabase.functions.invoke("manage-permissions", {
    body: { action: "checkRole" },
  });

  logRole(context, "fallback manage-permissions(checkRole)", { functionRole, functionError });

  if (!functionError && functionRole?.isAdmin) {
    return { role: "admin", isAdmin: true, source: "manage-permissions" };
  }

  return { role: "client", isAdmin: false, source: "fallback", error: lastError ?? rpcError ?? functionError };
};
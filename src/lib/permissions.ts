import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

type RoleResult = {
  role: AppRole;
  isAdmin: boolean;
  source: "user_roles" | "has_role" | "fallback";
  error?: unknown;
};

const logRole = (context: string, message: string, payload?: unknown) => {
  console.info(`[role-check:${context}] ${message}`, payload ?? "");
};

export const readUserRole = async (userId: string, context = "app"): Promise<RoleResult> => {
  logRole(context, "iniciando verificação", { userId });

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  logRole(context, "resultado user_roles", { roleRows, roleError });

  if (!roleError && roleRows?.some((item) => item.role === "admin")) {
    return { role: "admin", isAdmin: true, source: "user_roles" };
  }

  const { data: hasAdmin, error: rpcError } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  logRole(context, "fallback has_role(admin)", { hasAdmin, rpcError });

  if (!rpcError && hasAdmin) {
    return { role: "admin", isAdmin: true, source: "has_role" };
  }

  return { role: "client", isAdmin: false, source: "fallback", error: roleError ?? rpcError };
};
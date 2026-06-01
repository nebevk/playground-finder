import { notFound } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

// For admin PAGES: verify the caller is an admin or render 404.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!data?.is_admin) notFound();
  return { supabase, user };
}

// For admin SERVER ACTIONS: verify admin server-side, then return a service-role
// client for the mutation. Returns null if the caller is NOT an admin — the action
// must bail. Server Actions are independently-invocable POST endpoints, so this check
// (not just the page guard) is what actually enforces authorization.
export async function getAdminActionContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!data?.is_admin) return null;
  return { admin: createAdminClient(), user, supabase };
}

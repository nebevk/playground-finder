import type { createClient } from "./supabase/server";

// Usernames by user id. `reviews.user_id` and `reports.user_id` reference `auth.users`, not
// `profiles`, so PostgREST can't embed profiles in them (`profiles!inner(...)` fails with "Could
// not find a relationship"); this second query replaces the embed. Usernames are public.
export async function usernamesById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, username").in("id", unique);
  if (error) console.error("usernamesById failed", error);
  return new Map((data ?? []).map((p) => [p.id, p.username]));
}

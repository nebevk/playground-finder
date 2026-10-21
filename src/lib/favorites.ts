import { createClient } from "./supabase/server";

// The signed-in user's favourite playgrounds (FR-PG-04), as ids: for the hearts on the map and on
// a playground's page.
export async function getFavoriteIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("favorites").select("playground_id").eq("user_id", userId);
  if (error) console.error("getFavoriteIds failed", error);
  return (data ?? []).map((f) => f.playground_id);
}

// The same for the profile, newest first. A playground under review has no page to link to, so it
// is left out until it's back.
export async function getMyFavorites(userId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("created_at, playgrounds(id, name, flagged)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) console.error("getMyFavorites failed", error);
  return (data ?? []).flatMap(({ playgrounds: p }) => (p && !p.flagged ? [{ id: p.id, name: p.name }] : []));
}

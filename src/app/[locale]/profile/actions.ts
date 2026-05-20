"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function exportDataAction(): Promise<
  | { error: string; data?: undefined }
  | { error?: undefined; data: Record<string, unknown> }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth_required" };

  const [profile, playgrounds, reviews, favorites, photos, reports] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("playgrounds").select("*").eq("user_id", user.id),
    supabase.from("reviews").select("*").eq("user_id", user.id),
    supabase.from("favorites").select("*").eq("user_id", user.id),
    supabase.from("photos").select("*").eq("user_id", user.id),
    supabase.from("reports").select("*").eq("user_id", user.id),
  ]);

  return {
    data: {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email, created_at: user.created_at },
      profile: profile.data,
      playgrounds: playgrounds.data ?? [],
      reviews: reviews.data ?? [],
      favorites: favorites.data ?? [],
      photos: photos.data ?? [],
      reports: reports.data ?? [],
    },
  };
}

export async function deleteAccountAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const locale = String(formData.get("locale") ?? "sl");

  const admin = createAdminClient();
  // Deleting auth.users cascades via `on delete cascade` on profiles, reviews, favorites, reports, photos.
  // Playgrounds keep `user_id = null` (posts remain, authorship disappears).
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return;

  await supabase.auth.signOut();
  redirect(`/${locale}`);
}

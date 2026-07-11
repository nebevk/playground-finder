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

  const [profile, playgrounds, reviews, favorites, photos, reports, reviewVotes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("playgrounds").select("*").eq("user_id", user.id),
      supabase.from("reviews").select("*").eq("user_id", user.id),
      supabase.from("favorites").select("*").eq("user_id", user.id),
      supabase.from("photos").select("*").eq("user_id", user.id),
      supabase.from("reports").select("*").eq("user_id", user.id),
      supabase.from("review_helpful").select("*").eq("user_id", user.id),
    ]);

  return {
    data: {
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        // Consent audit trail recorded at signup (may be absent for old accounts).
        metadata: user.user_metadata,
      },
      profile: profile.data,
      playgrounds: playgrounds.data ?? [],
      reviews: reviews.data ?? [],
      favorites: favorites.data ?? [],
      photos: photos.data ?? [],
      reports: reports.data ?? [],
      review_helpful_votes: reviewVotes.data ?? [],
    },
  };
}

export type DeleteAccountState = { error?: string } | undefined;

export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth_required" };

  const locale = String(formData.get("locale") ?? "sl");
  const admin = createAdminClient();

  // 1. Remove the user's Storage objects. No FK reaches Storage, so deleting the
  //    auth user / photo rows would otherwise orphan the image files forever (GDPR:
  //    these may contain children's faces). List the user's folder and remove all.
  const { data: objects, error: listErr } = await admin.storage
    .from("playground-photos")
    .list(user.id, { limit: 1000 });
  if (listErr) {
    console.error("deleteAccountAction: storage list failed", listErr);
    return { error: "generic" };
  }
  if (objects && objects.length > 0) {
    // The user's files live under nested folders (userId/playgroundId/*). Recurse one level.
    const paths: string[] = [];
    for (const entry of objects) {
      // entry is a "folder" (playgroundId); list its contents.
      const { data: inner } = await admin.storage
        .from("playground-photos")
        .list(`${user.id}/${entry.name}`, { limit: 1000 });
      if (inner) {
        for (const f of inner) paths.push(`${user.id}/${entry.name}/${f.name}`);
      } else {
        // entry was itself a file directly under userId/
        paths.push(`${user.id}/${entry.name}`);
      }
    }
    if (paths.length > 0) {
      const { error: rmErr } = await admin.storage.from("playground-photos").remove(paths);
      if (rmErr) {
        console.error("deleteAccountAction: storage remove failed", rmErr);
        return { error: "generic" };
      }
    }
  }

  // 2. Delete the auth user. photos/reviews/favorites/reports rows cascade
  //    (photos.user_id is now ON DELETE CASCADE; playgrounds.user_id is SET NULL by design,
  //    so submitted playgrounds remain but lose authorship).
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("deleteAccountAction: deleteUser failed", delErr);
    return { error: "generic" };
  }

  await supabase.auth.signOut();
  redirect(`/${locale}`);
}

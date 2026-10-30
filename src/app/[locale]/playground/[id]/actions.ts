"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { REVIEW_COMMENT_MAX } from "@/lib/limits";
import { MAX_PHOTOS } from "@/lib/photo-checks";
import { readSubmittedPhotos, storePhotos, type PhotoReadError, type PhotoStoreError } from "@/lib/photo-upload";
import { equipmentFrom, featuresFrom, surfacesFrom } from "@/lib/playground-types";
import { invalidateMapSnapshot } from "@/lib/playgrounds";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export type ReviewState = { error?: string; success?: boolean } | undefined;
export type ReportState = { error?: string; success?: boolean } | undefined;
export type EditState = { error?: "no_name" | "no_location" | "not_found" | "generic" } | undefined;
export type AddPhotosState =
  | { error?: PhotoReadError | PhotoStoreError | "no_photos" | "not_found" | "turnstile_failed" }
  | undefined;

// Adds photos to an existing playground (FR-ADD-06), through the same checks as adding a
// playground with photos. Everyone may add up to 8 photos per playground in total (the database
// enforces the same, ops 0012); `remaining` in the form is only a hint.
export async function addPhotosAction(_prev: AddPhotosState, formData: FormData): Promise<AddPhotosState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_found" };

  const playgroundId = String(formData.get("playground_id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  const { data: playground } = await supabase
    .from("playgrounds")
    .select("id")
    .eq("id", playgroundId)
    .eq("flagged", false)
    .eq("status", "published")
    .maybeSingle();
  if (!playground) return { error: "not_found" };
  if (!(await verifyTurnstile(formData))) return { error: "turnstile_failed" };

  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("playground_id", playgroundId)
    .eq("user_id", user.id);
  const room = MAX_PHOTOS - (count ?? 0);
  if (room <= 0) return { error: "photo_limit" };

  const read = await readSubmittedPhotos(formData, { verified: !!user.email_confirmed_at, maxCount: room });
  if (read.error) return { error: read.error };
  if (read.photos.length === 0) return { error: "no_photos" };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("addPhotosAction: storage client unavailable", err);
    return { error: "upload_failed" };
  }
  const stored = await storePhotos({ supabase, admin, userId: user.id, playgroundId, photos: read.photos });
  if (stored.error) return { error: stored.error };

  revalidatePath(`/${locale}/playground/${playgroundId}`);
  redirect(`/${locale}/playground/${playgroundId}?photos=added`);
}

// The person who added a playground edits its details and pin (FR-ADD-08). Runs with the
// user's own client: the database's owner-only update policy and column grants decide, so a
// forged id or a flag change can't get through.
export async function updateOwnPlaygroundAction(_prev: EditState, formData: FormData): Promise<EditState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_found" };

  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!id) return { error: "not_found" };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "no_location" };
  if (!name) return { error: "no_name" };

  const { data, error } = await supabase
    .from("playgrounds")
    .update({
      name,
      description,
      // PostGIS WKT: longitude first, then latitude.
      location: `SRID=4326;POINT(${lng} ${lat})`,
      surfaces: surfacesFrom(formData),
      ...featuresFrom(formData),
      equipment: equipmentFrom(formData),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("updateOwnPlaygroundAction failed", error);
    return { error: "generic" };
  }
  if (!data) return { error: "not_found" };

  invalidateMapSnapshot();
  revalidatePath(`/${locale}/playground/${id}`);
  revalidatePath(`/${locale}/map`);
  revalidatePath(`/${locale}`);
  redirect(`/${locale}/playground/${id}?updated=1`);
}

// Bump the playground's view counter (the "most clicked" signal). Called from a client
// effect on the detail page so it only fires on a real view, not on link prefetch.
export async function recordPlaygroundViewAction(id: string): Promise<void> {
  if (!id) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_playground_views", { p_id: id });
  if (error) console.error("increment_playground_views failed", error);
}

const REPORT_REASONS = ["spam", "incorrect_info", "privacy_violation", "other"] as const;
const REPORT_TARGETS = ["playground", "review", "photo"] as const;

export async function submitReviewAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth_required" };

  const playground_id = String(formData.get("playground_id") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const locale = String(formData.get("locale") ?? "sl");

  if (!playground_id) return { error: "missing_playground" };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "bad_rating" };
  if (comment && comment.length > REVIEW_COMMENT_MAX) return { error: "too_long" };

  const { error } = await supabase
    .from("reviews")
    .insert({ playground_id, user_id: user.id, rating, comment });

  if (error) {
    if (error.code === "23505") return { error: "duplicate" };
    if (isRateLimited(error)) return { error: "rate_limited" };
    console.error("submitReviewAction failed", error);
    return { error: "generic" };
  }

  // The map shows each playground's rating.
  invalidateMapSnapshot();
  revalidatePath(`/${locale}/playground/${playground_id}`);
  return { success: true };
}

// Editing your own review (FR-COM-02): the rating and the comment. The user's own client, so the
// owner-only update policy and column grants decide.
export async function updateReviewAction(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth_required" };

  const review_id = String(formData.get("review_id") ?? "");
  const playground_id = String(formData.get("playground_id") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const locale = String(formData.get("locale") ?? "sl");

  if (!review_id) return { error: "generic" };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "bad_rating" };
  if (comment && comment.length > REVIEW_COMMENT_MAX) return { error: "too_long" };

  const { data, error } = await supabase
    .from("reviews")
    .update({ rating, comment })
    .eq("id", review_id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("updateReviewAction failed", error);
    return { error: "generic" };
  }

  invalidateMapSnapshot();
  revalidatePath(`/${locale}/playground/${playground_id}`);
  return { success: true };
}

export async function deleteReviewAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const review_id = String(formData.get("review_id") ?? "");
  const playground_id = String(formData.get("playground_id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");

  await supabase.from("reviews").delete().eq("id", review_id).eq("user_id", user.id);
  invalidateMapSnapshot();
  revalidatePath(`/${locale}/playground/${playground_id}`);
}

// Saving or removing a favourite (FR-PG-04). No revalidation: the heart already shows the new
// state, and the profile reads favourites fresh whenever it opens.
export async function setFavoriteAction(playgroundId: string, favorite: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !playgroundId) return { ok: false };

  const { error } = favorite
    ? await supabase.from("favorites").insert({ playground_id: playgroundId, user_id: user.id })
    : await supabase.from("favorites").delete().eq("playground_id", playgroundId).eq("user_id", user.id);
  // 23505: already saved (another tab, a double tap), which is what was wanted.
  if (error && error.code !== "23505") {
    console.error("setFavoriteAction failed", error);
    return { ok: false };
  }
  return { ok: true };
}

export async function toggleHelpfulAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const review_id = String(formData.get("review_id") ?? "");
  const playground_id = String(formData.get("playground_id") ?? "");
  const currently = formData.get("currently") === "true";
  const locale = String(formData.get("locale") ?? "sl");

  if (currently) {
    await supabase.from("review_helpful").delete().eq("review_id", review_id).eq("user_id", user.id);
  } else {
    await supabase.from("review_helpful").insert({ review_id, user_id: user.id });
  }

  revalidatePath(`/${locale}/playground/${playground_id}`);
}

export async function submitReportAction(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth_required" };

  const target_type_raw = String(formData.get("target_type") ?? "");
  const target_id = String(formData.get("target_id") ?? "");
  const reason_raw = String(formData.get("reason") ?? "");
  const playground_id = String(formData.get("playground_id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");

  if (!(REPORT_TARGETS as readonly string[]).includes(target_type_raw)) return { error: "generic" };
  if (!(REPORT_REASONS as readonly string[]).includes(reason_raw)) return { error: "generic" };
  if (!target_id) return { error: "generic" };

  const target_type = target_type_raw as (typeof REPORT_TARGETS)[number];
  const reason = reason_raw as (typeof REPORT_REASONS)[number];

  const { error } = await supabase
    .from("reports")
    .insert({ target_type, target_id, user_id: user.id, reason });

  if (error) {
    if (error.code === "23505") return { error: "duplicate" };
    if (isRateLimited(error)) return { error: "rate_limited" };
    console.error("submitReportAction failed", error);
    return { error: "generic" };
  }

  // A third report flags its target, which can take a playground (or a rating) off the map.
  invalidateMapSnapshot();
  if (playground_id) revalidatePath(`/${locale}/playground/${playground_id}`);
  return { success: true };
}

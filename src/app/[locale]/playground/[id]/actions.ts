"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PLAYGROUND_FEATURE_KEYS, SURFACE_TYPES, type SurfaceType } from "@/lib/playground-types";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error?: string; success?: boolean } | undefined;
export type ReportState = { error?: string; success?: boolean } | undefined;
export type EditState = { error?: "no_name" | "no_location" | "not_found" | "generic" } | undefined;

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
  const surfaceRaw = String(formData.get("surface_type") ?? "");
  const surface_type = (SURFACE_TYPES as readonly string[]).includes(surfaceRaw) ? (surfaceRaw as SurfaceType) : null;
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!id) return { error: "not_found" };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "no_location" };
  if (!name) return { error: "no_name" };

  const features = Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((k) => [k, formData.get(k) === "on"]));

  const { data, error } = await supabase
    .from("playgrounds")
    .update({
      name,
      description,
      surface_type,
      // PostGIS WKT: longitude first, then latitude.
      location: `SRID=4326;POINT(${lng} ${lat})`,
      ...features,
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

  const { error } = await supabase
    .from("reviews")
    .insert({ playground_id, user_id: user.id, rating, comment });

  if (error) {
    if (error.code === "23505") return { error: "duplicate" };
    console.error("submitReviewAction failed", error);
    return { error: "generic" };
  }

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
  revalidatePath(`/${locale}/playground/${playground_id}`);
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
    console.error("submitReportAction failed", error);
    return { error: "generic" };
  }

  if (playground_id) revalidatePath(`/${locale}/playground/${playground_id}`);
  return { success: true };
}

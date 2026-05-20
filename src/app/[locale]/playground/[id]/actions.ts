"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error?: string; success?: boolean } | undefined;
export type ReportState = { error?: string; success?: boolean } | undefined;

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
    return { error: "generic" };
  }

  if (playground_id) revalidatePath(`/${locale}/playground/${playground_id}`);
  return { success: true };
}

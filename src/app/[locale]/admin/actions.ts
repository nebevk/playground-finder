"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TARGETS = ["playground", "review", "photo"] as const;
type Target = (typeof TARGETS)[number];

function tableFor(target: Target) {
  if (target === "playground") return "playgrounds" as const;
  if (target === "review") return "reviews" as const;
  return "photos" as const;
}

export async function approveFlaggedAction(formData: FormData) {
  const supabase = await createClient();
  const target = String(formData.get("target") ?? "") as Target;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  if (!TARGETS.includes(target) || !id) return;

  await supabase.from(tableFor(target)).update({ flagged: false }).eq("id", id);
  // Drop existing reports so the 3+ threshold doesn't immediately re-flag.
  await supabase.from("reports").delete().eq("target_type", target).eq("target_id", id);

  revalidatePath(`/${locale}/admin/moderation`);
  revalidatePath(`/${locale}/admin`);
}

export async function dismissReportAction(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  if (!id) return;

  await supabase.from("reports").delete().eq("id", id);
  revalidatePath(`/${locale}/admin/moderation`);
  revalidatePath(`/${locale}/admin`);
}

export async function flagTargetAction(formData: FormData) {
  const supabase = await createClient();
  const target = String(formData.get("target") ?? "") as Target;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  if (!TARGETS.includes(target) || !id) return;

  await supabase.from(tableFor(target)).update({ flagged: true }).eq("id", id);
  revalidatePath(`/${locale}/admin/moderation`);
  revalidatePath(`/${locale}/admin`);
}

export async function deleteFlaggedAction(formData: FormData) {
  const supabase = await createClient();
  const target = String(formData.get("target") ?? "") as Target;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  if (!TARGETS.includes(target) || !id) return;

  await supabase.from(tableFor(target)).delete().eq("id", id);
  revalidatePath(`/${locale}/admin/moderation`);
  revalidatePath(`/${locale}/admin`);
}

export async function updatePlaygroundAction(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const surfaceRaw = String(formData.get("surface_type") ?? "");
  const locale = String(formData.get("locale") ?? "sl");

  const surface_type = ["tartan", "sand", "grass", "gravel"].includes(surfaceRaw)
    ? (surfaceRaw as "tartan" | "sand" | "grass" | "gravel")
    : null;

  const features = {
    is_fenced: formData.get("is_fenced") === "on",
    has_shade: formData.get("has_shade") === "on",
    has_water: formData.get("has_water") === "on",
    has_toilets: formData.get("has_toilets") === "on",
    has_parking: formData.get("has_parking") === "on",
  };

  if (!id || !name) return;

  await supabase
    .from("playgrounds")
    .update({ name, description, surface_type, ...features })
    .eq("id", id);

  revalidatePath(`/${locale}/admin/playgrounds`);
  revalidatePath(`/${locale}/playground/${id}`);
  revalidatePath(`/${locale}`);
}

export async function deletePlaygroundAction(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  if (!id) return;

  await supabase.from("playgrounds").delete().eq("id", id);
  revalidatePath(`/${locale}/admin/playgrounds`);
  revalidatePath(`/${locale}`);
}

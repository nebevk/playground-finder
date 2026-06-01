"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionContext } from "@/lib/admin";

const TARGETS = ["playground", "review", "photo"] as const;
type Target = (typeof TARGETS)[number];

function tableFor(target: Target) {
  if (target === "playground") return "playgrounds" as const;
  if (target === "review") return "reviews" as const;
  return "photos" as const;
}

export async function approveFlaggedAction(formData: FormData) {
  const ctx = await getAdminActionContext();
  if (!ctx) return;
  const { admin } = ctx;

  const target = String(formData.get("target") ?? "") as Target;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  if (!TARGETS.includes(target) || !id) return;

  const { error: unflagErr } = await admin.from(tableFor(target)).update({ flagged: false }).eq("id", id);
  if (unflagErr) {
    console.error("approveFlaggedAction: unflag failed", unflagErr);
    return;
  }
  // Drop existing reports so the 3+ threshold doesn't immediately re-flag.
  const { error: clearErr } = await admin
    .from("reports")
    .delete()
    .eq("target_type", target)
    .eq("target_id", id);
  if (clearErr) console.error("approveFlaggedAction: clear reports failed", clearErr);

  revalidatePath(`/${locale}/admin/moderation`);
  revalidatePath(`/${locale}/admin`);
}

export async function dismissReportAction(formData: FormData) {
  const ctx = await getAdminActionContext();
  if (!ctx) return;

  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  if (!id) return;

  const { error } = await ctx.admin.from("reports").delete().eq("id", id);
  if (error) {
    console.error("dismissReportAction failed", error);
    return;
  }
  revalidatePath(`/${locale}/admin/moderation`);
  revalidatePath(`/${locale}/admin`);
}

export async function flagTargetAction(formData: FormData) {
  const ctx = await getAdminActionContext();
  if (!ctx) return;

  const target = String(formData.get("target") ?? "") as Target;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  if (!TARGETS.includes(target) || !id) return;

  const { error } = await ctx.admin.from(tableFor(target)).update({ flagged: true }).eq("id", id);
  if (error) {
    console.error("flagTargetAction failed", error);
    return;
  }
  revalidatePath(`/${locale}/admin/moderation`);
  revalidatePath(`/${locale}/admin`);
}

export async function deleteFlaggedAction(formData: FormData) {
  const ctx = await getAdminActionContext();
  if (!ctx) return;

  const target = String(formData.get("target") ?? "") as Target;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  if (!TARGETS.includes(target) || !id) return;

  const { error } = await ctx.admin.from(tableFor(target)).delete().eq("id", id);
  if (error) {
    console.error("deleteFlaggedAction failed", error);
    return;
  }
  revalidatePath(`/${locale}/admin/moderation`);
  revalidatePath(`/${locale}/admin`);
}

export async function updatePlaygroundAction(formData: FormData) {
  const ctx = await getAdminActionContext();
  if (!ctx) return;

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

  const { error } = await ctx.admin
    .from("playgrounds")
    .update({ name, description, surface_type, ...features })
    .eq("id", id);
  if (error) {
    console.error("updatePlaygroundAction failed", error);
    return;
  }

  revalidatePath(`/${locale}/admin/playgrounds`);
  revalidatePath(`/${locale}/playground/${id}`);
  revalidatePath(`/${locale}`);
}

export async function deletePlaygroundAction(formData: FormData) {
  const ctx = await getAdminActionContext();
  if (!ctx) return;

  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "sl");
  if (!id) return;

  const { error } = await ctx.admin.from("playgrounds").delete().eq("id", id);
  if (error) {
    console.error("deletePlaygroundAction failed", error);
    return;
  }
  revalidatePath(`/${locale}/admin/playgrounds`);
  revalidatePath(`/${locale}`);
}

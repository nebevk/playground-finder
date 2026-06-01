"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SURFACE_TYPES = ["tartan", "sand", "grass", "gravel"] as const;
const FEATURE_KEYS = ["is_fenced", "has_shade", "has_water", "has_toilets", "has_parking"] as const;
const MAX_PHOTOS = 8;

export type AddState = { error?: string } | undefined;

export async function createPlaygroundAction(
  _prev: AddState,
  formData: FormData,
): Promise<AddState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth_required" };

  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const surfaceRaw = String(formData.get("surface_type") ?? "");
  const surface_type = (SURFACE_TYPES as readonly string[]).includes(surfaceRaw)
    ? (surfaceRaw as (typeof SURFACE_TYPES)[number])
    : null;
  const locale = String(formData.get("locale") ?? "sl");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "no_location" };
  if (!name) return { error: "no_name" };

  // Validate photos BEFORE inserting the playground row, so a rejected upload never
  // strands an orphaned playground.
  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > MAX_PHOTOS) return { error: "too_many_photos" };
  if (photos.length > 0 && !user.email_confirmed_at) return { error: "verify_email" };

  const features = Object.fromEntries(
    FEATURE_KEYS.map((k) => [k, formData.get(k) === "on"]),
  ) as Record<(typeof FEATURE_KEYS)[number], boolean>;

  const { data: inserted, error: insertErr } = await supabase
    .from("playgrounds")
    .insert({
      name,
      description,
      // PostGIS WKT: longitude first, then latitude.
      location: `SRID=4326;POINT(${lng} ${lat})`,
      surface_type,
      ...features,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("createPlaygroundAction: insert failed", insertErr);
    return { error: "generic" };
  }

  const uploadedPaths: string[] = [];
  for (const [index, file] of photos.entries()) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${user.id}/${inserted.id}/${index}-${crypto.randomUUID()}.${ext}`;

    const upload = await supabase.storage
      .from("playground-photos")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (upload.error) {
      console.error("createPlaygroundAction: upload failed, rolling back playground", upload.error);
      await rollback(supabase, inserted.id, uploadedPaths);
      return { error: "upload_failed" };
    }
    uploadedPaths.push(storagePath);

    const { error: photoRowErr } = await supabase
      .from("photos")
      .insert({ playground_id: inserted.id, user_id: user.id, storage_path: storagePath });
    if (photoRowErr) {
      console.error("createPlaygroundAction: photo row insert failed, rolling back", photoRowErr);
      await rollback(supabase, inserted.id, uploadedPaths);
      return { error: "generic" };
    }
  }

  redirect(`/${locale}?added=${inserted.id}`);
}

// Compensating cleanup when photo handling fails after the playground row was inserted.
// Deleting the playground cascades to its photo rows; storage objects have no FK so
// they are removed explicitly.
async function rollback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  playgroundId: string,
  uploadedPaths: string[],
) {
  if (uploadedPaths.length > 0) {
    await supabase.storage.from("playground-photos").remove(uploadedPaths);
  }
  await supabase.from("playgrounds").delete().eq("id", playgroundId);
}

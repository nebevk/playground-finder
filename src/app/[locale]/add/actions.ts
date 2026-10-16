"use server";

import { redirect } from "next/navigation";
import {
  hasEmbeddedMetadata,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MAX_TOTAL_PHOTO_BYTES,
  sniffImageType,
  type PhotoType,
} from "@/lib/photo-checks";
import { PHOTO_BUCKET } from "@/lib/photo-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

const SURFACE_TYPES = ["tartan", "sand", "grass", "gravel"] as const;
const FEATURE_KEYS = ["is_fenced", "has_shade", "has_water", "has_toilets", "has_parking"] as const;
const EXTENSION: Record<PhotoType, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

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
  if (!(await verifyTurnstile(formData))) return { error: "turnstile_failed" };

  // Validate photos BEFORE inserting the playground row, so a rejected upload never
  // strands an orphaned playground.
  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return { error: "too_many_photos" };
  if (files.length > 0 && !user.email_confirmed_at) return { error: "verify_email" };
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_PHOTO_BYTES) return { error: "photos_too_large" };

  // Every stored byte is checked here (ADR-0002): the real type from magic bytes, the size,
  // and no EXIF/XMP metadata, which can carry GPS. Clients can't write to the bucket directly.
  const photos: { bytes: Uint8Array; type: PhotoType }[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type || bytes.length > MAX_PHOTO_BYTES) return { error: "upload_failed" };
    if (hasEmbeddedMetadata(bytes, type)) return { error: "photo_metadata" };
    photos.push({ bytes, type });
  }

  let admin: ReturnType<typeof createAdminClient> | null = null;
  if (photos.length > 0) {
    try {
      admin = createAdminClient();
    } catch (err) {
      console.error("createPlaygroundAction: storage client unavailable", err);
      return { error: "upload_failed" };
    }
  }

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
  for (const [index, photo] of photos.entries()) {
    const storagePath = `${user.id}/${inserted.id}/${index}-${crypto.randomUUID()}.${EXTENSION[photo.type]}`;

    // Service role: the bucket accepts no client writes. The path is the user's own folder,
    // which the photos insert policy below re-checks.
    const upload = await admin!.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, photo.bytes, { contentType: photo.type, upsert: false });

    if (upload.error) {
      console.error("createPlaygroundAction: upload failed, rolling back playground", upload.error);
      await rollback(supabase, admin!, inserted.id, uploadedPaths);
      return { error: "upload_failed" };
    }
    uploadedPaths.push(storagePath);

    // The user's own client, so RLS (verified email, own folder) still decides.
    const { error: photoRowErr } = await supabase
      .from("photos")
      .insert({ playground_id: inserted.id, user_id: user.id, storage_path: storagePath });
    if (photoRowErr) {
      console.error("createPlaygroundAction: photo row insert failed, rolling back", photoRowErr);
      await rollback(supabase, admin!, inserted.id, uploadedPaths);
      return { error: "generic" };
    }
  }

  redirect(`/${locale}/map?added=${inserted.id}`);
}

// Compensating cleanup when photo handling fails after the playground row was inserted.
// Deleting the playground cascades to its photo rows; storage objects have no FK so
// they are removed explicitly.
async function rollback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>,
  playgroundId: string,
  uploadedPaths: string[],
) {
  if (uploadedPaths.length > 0) {
    await admin.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
  }
  await supabase.from("playgrounds").delete().eq("id", playgroundId);
}

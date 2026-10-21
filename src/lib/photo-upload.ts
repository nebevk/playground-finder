import {
  hasEmbeddedMetadata,
  MAX_PHOTO_BYTES,
  MAX_TOTAL_PHOTO_BYTES,
  sniffImageType,
  type PhotoType,
} from "./photo-checks";
import { PHOTO_BUCKET, removePhotoFiles } from "./photo-storage";
import type { createAdminClient } from "./supabase/admin";
import type { createClient } from "./supabase/server";

const EXTENSION: Record<PhotoType, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export type CheckedPhoto = { bytes: Uint8Array; type: PhotoType };
export type PhotoReadError = "too_many_photos" | "verify_email" | "photos_too_large" | "upload_failed" | "photo_metadata";
export type PhotoStoreError = "upload_failed" | "photo_limit" | "generic";

// The photos of a submission (form field "photos"), every byte checked here on the server
// (ADR-0002): the real type from its magic bytes, the size, and no EXIF/XMP metadata, which can
// carry GPS. Nothing is stored yet, so a rejected photo never leaves anything half-saved.
export async function readSubmittedPhotos(
  formData: FormData,
  { verified, maxCount }: { verified: boolean; maxCount: number },
): Promise<{ photos: CheckedPhoto[]; error?: undefined } | { photos?: undefined; error: PhotoReadError }> {
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > maxCount) return { error: "too_many_photos" };
  if (files.length > 0 && !verified) return { error: "verify_email" };
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_PHOTO_BYTES) return { error: "photos_too_large" };

  const photos: CheckedPhoto[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type || bytes.length > MAX_PHOTO_BYTES) return { error: "upload_failed" };
    if (hasEmbeddedMetadata(bytes, type)) return { error: "photo_metadata" };
    photos.push({ bytes, type });
  }
  return { photos };
}

// Stores checked photos of a playground: each file into the uploader's own folder (service role:
// the bucket takes no client writes), then its row with the uploader's own client, so the
// database's rules still decide (verified email, own folder, at most 8 per person, NFR-SEC-07).
// On any failure it removes what it stored and returns the error.
export async function storePhotos({
  supabase,
  admin,
  userId,
  playgroundId,
  photos,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  playgroundId: string;
  photos: CheckedPhoto[];
}): Promise<{ error?: PhotoStoreError }> {
  const paths: string[] = [];
  const rowIds: string[] = [];
  const undo = async () => {
    if (rowIds.length > 0) await supabase.from("photos").delete().in("id", rowIds);
    await removePhotoFiles(admin, paths);
  };

  for (const [index, photo] of photos.entries()) {
    const storagePath = `${userId}/${playgroundId}/${index}-${crypto.randomUUID()}.${EXTENSION[photo.type]}`;
    const upload = await admin.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, photo.bytes, { contentType: photo.type, upsert: false });
    if (upload.error) {
      console.error("storePhotos: upload failed", upload.error);
      await undo();
      return { error: "upload_failed" };
    }
    paths.push(storagePath);

    const { data: row, error } = await supabase
      .from("photos")
      .insert({ playground_id: playgroundId, user_id: userId, storage_path: storagePath })
      .select("id")
      .single();
    if (error || !row) {
      console.error("storePhotos: photo row insert failed", error);
      await undo();
      // 23514: the database's "at most 8 photos per playground per person" (ops 0012).
      return { error: error?.code === "23514" ? "photo_limit" : "generic" };
    }
    rowIds.push(row.id);
  }
  return {};
}

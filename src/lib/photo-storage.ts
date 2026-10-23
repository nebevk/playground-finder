import "server-only";
import { createAdminClient } from "./supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export const PHOTO_BUCKET = "playground-photos";

// Storage files have no foreign key to `photos`, so deleting rows (directly or by cascade
// from a playground) leaves the files behind. Collect the paths first, delete the rows,
// then remove the files (GDPR-15).
export async function photoPathsFor(
  admin: AdminClient,
  by: { photoIds?: string[]; playgroundIds?: string[] },
): Promise<string[]> {
  const query = admin.from("photos").select("storage_path");
  const { data, error } = by.photoIds
    ? await query.in("id", by.photoIds)
    : await query.in("playground_id", by.playgroundIds ?? []);
  if (error) console.error("photoPathsFor failed", error);
  return (data ?? []).map((p) => p.storage_path);
}

// Previews for the moderation queue, including flagged photos, which the visitor-facing
// storage policy never signs. Service role: call only behind requireAdmin() (BL-48).
export async function adminPhotoPreviewUrls(paths: string[], ttlSeconds = 600): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await createAdminClient().storage.from(PHOTO_BUCKET).createSignedUrls(paths, ttlSeconds);
  if (error) console.error("adminPhotoPreviewUrls failed", error);
  return new Map(
    (data ?? []).flatMap((s) => (s.path && s.signedUrl && !s.error ? [[s.path, s.signedUrl] as const] : [])),
  );
}

// Rows are already gone when this runs. A file that fails to delete is unreachable
// (private bucket, no row to sign a URL for), so log it rather than fail the action.
export async function removePhotoFiles(admin: AdminClient, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await admin.storage.from(PHOTO_BUCKET).remove(paths);
  if (error) console.error("removePhotoFiles failed", { error, paths });
}

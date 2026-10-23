"use server";

import { redirect } from "next/navigation";
import { MAX_PHOTOS } from "@/lib/photo-checks";
import { equipmentFrom, featuresFrom, surfaceFrom } from "@/lib/playground-types";
import { invalidateMapSnapshot } from "@/lib/playgrounds";
import { readSubmittedPhotos, storePhotos } from "@/lib/photo-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

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
  const surface_type = surfaceFrom(formData.get("surface_type"));
  const locale = String(formData.get("locale") ?? "sl");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "no_location" };
  if (!name) return { error: "no_name" };
  if (!(await verifyTurnstile(formData))) return { error: "turnstile_failed" };

  // Check the photos BEFORE inserting the playground row, so a rejected upload never strands an
  // orphaned playground.
  const read = await readSubmittedPhotos(formData, {
    verified: !!user.email_confirmed_at,
    maxCount: MAX_PHOTOS,
  });
  if (read.error) return { error: read.error };

  let admin: ReturnType<typeof createAdminClient> | null = null;
  if (read.photos.length > 0) {
    try {
      admin = createAdminClient();
    } catch (err) {
      console.error("createPlaygroundAction: storage client unavailable", err);
      return { error: "upload_failed" };
    }
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("playgrounds")
    .insert({
      name,
      description,
      // PostGIS WKT: longitude first, then latitude.
      location: `SRID=4326;POINT(${lng} ${lat})`,
      surface_type,
      ...featuresFrom(formData),
      equipment: equipmentFrom(formData),
      user_id: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    if (isRateLimited(insertErr)) return { error: "rate_limited" };
    console.error("createPlaygroundAction: insert failed", insertErr);
    return { error: "generic" };
  }

  if (admin) {
    const stored = await storePhotos({ supabase, admin, userId: user.id, playgroundId: inserted.id, photos: read.photos });
    if (stored.error) {
      // storePhotos removed its files and rows; take the new playground back out too.
      await supabase.from("playgrounds").delete().eq("id", inserted.id);
      return { error: stored.error };
    }
  }

  // The map this redirects to must already show the new pin.
  invalidateMapSnapshot();
  redirect(`/${locale}/map?added=${inserted.id}`);
}

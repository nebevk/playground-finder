"use server";

import { redirect } from "next/navigation";
import { MAX_PHOTOS } from "@/lib/photo-checks";
import { readSubmittedPhotos, storePhotos } from "@/lib/photo-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

const SURFACE_TYPES = ["tartan", "sand", "grass", "gravel"] as const;
const FEATURE_KEYS = ["is_fenced", "has_shade", "has_water", "has_toilets", "has_parking"] as const;

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

  if (admin) {
    const stored = await storePhotos({ supabase, admin, userId: user.id, playgroundId: inserted.id, photos: read.photos });
    if (stored.error) {
      // storePhotos removed its files and rows; take the new playground back out too.
      await supabase.from("playgrounds").delete().eq("id", inserted.id);
      return { error: stored.error };
    }
  }

  redirect(`/${locale}/map?added=${inserted.id}`);
}

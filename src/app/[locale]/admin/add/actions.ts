"use server";

import { revalidatePath } from "next/cache";
import { clampText, DESCRIPTION_MAX, NAME_MAX } from "@/lib/limits";
import { getAdminActionContext } from "@/lib/admin";
import { geocodeInSlovenia } from "@/lib/geocode";
import { invalidateMapSnapshot } from "@/lib/playgrounds";
import { isEquipmentKey, PLAYGROUND_FEATURE_KEYS, surfacesIn } from "@/lib/playground-types";

export type GeoResult = { lat: number; lng: number; label: string };
export type NearbyPlayground = { id: string; name: string; distance_m: number };

const DUP_RADIUS_M = 150;

// Geocode a Slovenian address or place (src/lib/geocode.ts). Admin-gated so it isn’t a public proxy.
export async function geocodeAddressAction(query: string): Promise<GeoResult | null> {
  const ctx = await getAdminActionContext();
  if (!ctx) return null;
  const q = query.trim();
  if (!q) return null;
  try {
    const place = await geocodeInSlovenia(q);
    return place && { lat: place.lat, lng: place.lng, label: place.label };
  } catch (e) {
    console.error("geocodeAddressAction failed", e);
    return null;
  }
}

// Playgrounds within DUP_RADIUS_M of a point — drives the "already exists nearby?" warning.
export async function nearbyPlaygroundsAction(
  lat: number,
  lng: number,
): Promise<NearbyPlayground[]> {
  const ctx = await getAdminActionContext();
  if (!ctx) return [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  const { data, error } = await ctx.supabase.rpc("playgrounds_near", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: DUP_RADIUS_M,
  });
  if (error || !data) {
    if (error) console.error("nearbyPlaygroundsAction failed", error);
    return [];
  }
  return data
    .filter((r): r is { id: string; name: string; distance_m: number } => r.id != null)
    .map((r) => ({ id: r.id, name: r.name, distance_m: Math.round(r.distance_m) }));
}

export type QuickAddPayload = {
  lat: number;
  lng: number;
  name: string;
  description: string;
  surfaces: string[];
  features: Record<string, boolean>;
  equipment?: string[];
};

export async function quickAddPlaygroundAction(
  payload: QuickAddPayload,
  locale: string,
): Promise<{ ok: boolean; id?: string }> {
  const ctx = await getAdminActionContext();
  if (!ctx) return { ok: false };

  const name = clampText(payload.name, NAME_MAX);
  if (!name || !Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
    return { ok: false };
  }

  const features = Object.fromEntries(
    PLAYGROUND_FEATURE_KEYS.map((k) => [k, payload.features[k] === true]),
  );

  const { data, error } = await ctx.admin
    .from("playgrounds")
    .insert({
      name,
      description: clampText(payload.description, DESCRIPTION_MAX) || null,
      location: `SRID=4326;POINT(${payload.lng} ${payload.lat})`,
      surfaces: surfacesIn(payload.surfaces),
      ...features,
      equipment: (payload.equipment ?? []).filter(isEquipmentKey),
      user_id: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("quickAddPlaygroundAction failed", error);
    return { ok: false };
  }

  invalidateMapSnapshot();
  revalidatePath(`/${locale}/admin/playgrounds`);
  revalidatePath(`/${locale}`);
  return { ok: true, id: data.id };
}

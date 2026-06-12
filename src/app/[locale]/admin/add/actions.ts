"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionContext } from "@/lib/admin";
import { PLAYGROUND_FEATURE_KEYS, SURFACE_TYPES } from "@/lib/playground-types";

export type GeoResult = { lat: number; lng: number; label: string };
export type NearbyPlayground = { id: string; name: string; distance_m: number };

const DUP_RADIUS_M = 150;

// Geocode a Slovenian address/place via Nominatim. Admin-gated so it isn't a public proxy.
export async function geocodeAddressAction(query: string): Promise<GeoResult | null> {
  const ctx = await getAdminActionContext();
  if (!ctx) return null;
  const q = query.trim();
  if (!q) return null;

  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=si&q=" +
    encodeURIComponent(q);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "kje-so-igrala/0.1 (admin geocode)" },
    });
    if (!res.ok) return null;
    const data: Array<{ lat: string; lon: string; display_name: string }> = await res.json();
    const first = data[0];
    if (!first) return null;
    return { lat: Number(first.lat), lng: Number(first.lon), label: first.display_name };
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
  surface_type: string;
  features: Record<string, boolean>;
};

export async function quickAddPlaygroundAction(
  payload: QuickAddPayload,
  locale: string,
): Promise<{ ok: boolean; id?: string }> {
  const ctx = await getAdminActionContext();
  if (!ctx) return { ok: false };

  const name = payload.name.trim();
  if (!name || !Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
    return { ok: false };
  }

  const surface_type = (SURFACE_TYPES as readonly string[]).includes(payload.surface_type)
    ? payload.surface_type
    : null;
  const features = Object.fromEntries(
    PLAYGROUND_FEATURE_KEYS.map((k) => [k, payload.features[k] === true]),
  );

  const { data, error } = await ctx.admin
    .from("playgrounds")
    .insert({
      name,
      description: payload.description.trim() || null,
      location: `SRID=4326;POINT(${payload.lng} ${payload.lat})`,
      surface_type,
      ...features,
      user_id: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("quickAddPlaygroundAction failed", error);
    return { ok: false };
  }

  revalidatePath(`/${locale}/admin/playgrounds`);
  revalidatePath(`/${locale}`);
  return { ok: true, id: data.id };
}

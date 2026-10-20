import { cache } from "react";
import { PHOTO_BUCKET } from "./photo-storage";
import { createClient } from "./supabase/server";
import type {
  MapPlayground,
  PlaygroundDetail,
  PlaygroundPhoto,
  SurfaceType,
} from "./playground-types";

export * from "./playground-types";

// A flagged photo stays viewable for at most this long by someone who already loaded the page.
const PHOTO_URL_TTL_SECONDS = 60 * 60;

const MAP_SELECT =
  "id, name, description, lat, lng, is_fenced, has_shade, has_water, has_toilets, has_parking, surface_type, review_count, avg_rating, view_count";

type GeoRow = {
  id: string | null;
  name: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  is_fenced: boolean | null;
  has_shade: boolean | null;
  has_water: boolean | null;
  has_toilets: boolean | null;
  has_parking: boolean | null;
  surface_type: string | null;
  review_count: number | null;
  avg_rating: number | null;
  view_count: number | null;
};

function toMapPlayground(row: GeoRow): MapPlayground | null {
  if (row.id == null || row.name == null || row.lat == null || row.lng == null) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    is_fenced: row.is_fenced ?? false,
    has_shade: row.has_shade ?? false,
    has_water: row.has_water ?? false,
    has_toilets: row.has_toilets ?? false,
    has_parking: row.has_parking ?? false,
    surface_type: (row.surface_type ?? null) as SurfaceType | null,
    review_count: row.review_count ?? 0,
    avg_rating: row.avg_rating,
    view_count: row.view_count ?? 0,
  };
}

export async function getMapPlaygrounds(): Promise<MapPlayground[]> {
  const supabase = await createClient();
  // Public listings filter flagged rows explicitly: RLS also lets owners (and admins) read
  // their flagged rows, which must not leak into what everyone sees.
  const { data, error } = await supabase.from("playgrounds_geo").select(MAP_SELECT).eq("flagged", false);
  if (error) throw error;
  return (data ?? []).flatMap((r) => {
    const m = toMapPlayground(r as GeoRow);
    return m ? [m] : [];
  });
}

// Most recently added playgrounds (not flagged) for the home welcome screen.
export async function getLatestPlaygrounds(limit = 3): Promise<MapPlayground[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playgrounds_geo")
    .select(MAP_SELECT)
    .eq("flagged", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).flatMap((r) => {
    const m = toMapPlayground(r as GeoRow);
    return m ? [m] : [];
  });
}

// Most-viewed ("most clicked") playgrounds with at least one view, for the home screen.
export async function getMostViewedPlaygrounds(limit = 3): Promise<MapPlayground[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playgrounds_geo")
    .select(MAP_SELECT)
    .eq("flagged", false)
    .gt("view_count", 0)
    .order("view_count", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).flatMap((r) => {
    const m = toMapPlayground(r as GeoRow);
    return m ? [m] : [];
  });
}

// cache() dedupes the fetch between generateMetadata and the page render.
export const getPlaygroundById = cache(async (id: string): Promise<PlaygroundDetail | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("playgrounds_geo")
    .select(`${MAP_SELECT}, equipment, user_id`)
    .eq("id", id)
    .eq("flagged", false)
    .maybeSingle();

  const base = data ? toMapPlayground(data as GeoRow) : null;
  if (error || !data || !base) return null;

  const { data: photoRows } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("playground_id", id)
    .eq("flagged", false)
    .order("created_at")
    .order("storage_path");

  // Private bucket (ADR-0002): short-lived signed URLs, created with the visitor's own client
  // so the storage select policy decides — it only covers photos that aren't flagged.
  const paths = (photoRows ?? []).map((p) => p.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, PHOTO_URL_TTL_SECONDS)
    : { data: [] };
  const urlByPath = new Map(
    (signed ?? []).flatMap((s) => (s.path && s.signedUrl && !s.error ? [[s.path, s.signedUrl] as const] : [])),
  );
  const photos: PlaygroundPhoto[] = (photoRows ?? []).flatMap((p) => {
    const url = urlByPath.get(p.storage_path);
    return url ? [{ id: p.id, url }] : [];
  });

  const equipment = Array.isArray(data.equipment)
    ? data.equipment.filter((x): x is string => typeof x === "string")
    : [];

  // Who added it: decides, on the server, whether the visitor may edit it (FR-ADD-08).
  const user_id = typeof data.user_id === "string" ? data.user_id : null;

  return { ...base, equipment, photos, user_id };
});

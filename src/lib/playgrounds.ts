import { cache } from "react";
import { createClient } from "./supabase/server";
import type {
  MapPlayground,
  PlaygroundDetail,
  PlaygroundPhoto,
  SurfaceType,
} from "./playground-types";

export * from "./playground-types";

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
  const { data, error } = await supabase.from("playgrounds_geo").select(MAP_SELECT);
  if (error) throw error;
  return (data ?? []).flatMap((r) => {
    const m = toMapPlayground(r as GeoRow);
    return m ? [m] : [];
  });
}

// Most recently added playgrounds (non-flagged via RLS) for the home welcome screen.
export async function getLatestPlaygrounds(limit = 3): Promise<MapPlayground[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playgrounds_geo")
    .select(MAP_SELECT)
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
    .select(`${MAP_SELECT}, equipment`)
    .eq("id", id)
    .maybeSingle();

  const base = data ? toMapPlayground(data as GeoRow) : null;
  if (error || !data || !base) return null;

  const { data: photoRows } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("playground_id", id);

  const photos: PlaygroundPhoto[] = (photoRows ?? []).map((p) => ({
    id: p.id,
    url: supabase.storage.from("playground-photos").getPublicUrl(p.storage_path).data.publicUrl,
  }));

  const equipment = Array.isArray(data.equipment)
    ? data.equipment.filter((x): x is string => typeof x === "string")
    : [];

  return { ...base, equipment, photos };
});

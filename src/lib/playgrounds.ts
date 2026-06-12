import { createClient } from "./supabase/server";
import type {
  MapPlayground,
  PlaygroundDetail,
  PlaygroundPhoto,
  SurfaceType,
} from "./playground-types";

export * from "./playground-types";

export async function getMapPlaygrounds(): Promise<MapPlayground[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playgrounds_geo")
    .select(
      "id, name, description, lat, lng, is_fenced, has_shade, has_water, has_toilets, has_parking, surface_type, review_count, avg_rating",
    );

  if (error) throw error;

  return (data ?? []).flatMap((row): MapPlayground[] => {
    if (row.id == null || row.name == null || row.lat == null || row.lng == null) return [];
    return [
      {
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
      },
    ];
  });
}

export async function getPlaygroundById(id: string): Promise<PlaygroundDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("playgrounds_geo")
    .select(
      "id, name, description, lat, lng, is_fenced, has_shade, has_water, has_toilets, has_parking, surface_type, equipment, review_count, avg_rating",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data || data.id == null || data.name == null || data.lat == null || data.lng == null) {
    return null;
  }

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

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    lat: data.lat,
    lng: data.lng,
    is_fenced: data.is_fenced ?? false,
    has_shade: data.has_shade ?? false,
    has_water: data.has_water ?? false,
    has_toilets: data.has_toilets ?? false,
    has_parking: data.has_parking ?? false,
    surface_type: (data.surface_type ?? null) as SurfaceType | null,
    review_count: data.review_count ?? 0,
    avg_rating: data.avg_rating,
    equipment,
    photos,
  };
}

import { createClient } from "./supabase/server";

export type MapPlayground = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
};

export async function getMapPlaygrounds(): Promise<MapPlayground[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playgrounds_geo")
    .select("id, name, description, lat, lng");

  if (error) throw error;

  return (data ?? []).flatMap((row): MapPlayground[] => {
    if (row.id == null || row.name == null || row.lat == null || row.lng == null) return [];
    return [{ id: row.id, name: row.name, description: row.description, lat: row.lat, lng: row.lng }];
  });
}

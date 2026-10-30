import { cache } from "react";
import { unstable_cache, updateTag } from "next/cache";
import { MAP_TAG, packPlayground, type PackedPlayground } from "./map-snapshot";
import { PHOTO_BUCKET } from "./photo-storage";
import { createAnonClient } from "./supabase/anon";
import { createClient } from "./supabase/server";
import { isEquipmentKey, PLAYGROUND_FEATURE_KEYS, surfacesIn } from "./playground-types";
import type { FeatureKey, MapPlayground, PlaygroundDetail, PlaygroundPhoto } from "./playground-types";

export * from "./playground-types";

// A flagged photo stays viewable for at most this long by someone who already loaded the page.
const PHOTO_URL_TTL_SECONDS = 60 * 60;

// Every PLAYGROUND_FEATURE_KEYS column, spelled out so the query stays typed.
const MAP_SELECT =
  "id, name, description, lat, lng, is_fenced, has_shade, has_water, has_toilets, has_parking, has_benches, has_toddler_area, is_accessible, has_lighting, surfaces, review_count, avg_rating, equipment";

type GeoRow = Record<FeatureKey, boolean | null> & {
  id: string | null;
  name: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  surfaces: unknown;
  review_count: number | null;
  avg_rating: number | null;
  equipment: unknown;
};

function toMapPlayground(row: GeoRow): MapPlayground | null {
  if (row.id == null || row.name == null || row.lat == null || row.lng == null) return null;
  const features = Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((k) => [k, row[k] ?? false])) as Record<FeatureKey, boolean>;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    ...features,
    surfaces: Array.isArray(row.surfaces) ? surfacesIn(row.surfaces) : [],
    review_count: row.review_count ?? 0,
    avg_rating: row.avg_rating,
    equipment: Array.isArray(row.equipment) ? row.equipment.filter(isEquipmentKey) : [],
  };
}

// The map's data (ADR-0001): every public playground, packed, built once and shared by all
// visitors instead of a full query per page view. Read with the cookie-less client, so everyone
// (admins too) gets the public set: published (ADR-0003) and unflagged. Expires when a Server Action
// changes the map (invalidateMapSnapshot) and after an hour at the latest, which covers changes made
// outside the app (SQL, imports, the auto-flag trigger). Bump the key's version when the shape changes.
export const getMapSnapshot = unstable_cache(
  async (): Promise<PackedPlayground[]> => {
    const { data, error } = await createAnonClient()
      .from("playgrounds_geo")
      .select(MAP_SELECT)
      .eq("flagged", false)
      .eq("status", "published");
    if (error) throw error;
    const rows = (data ?? []).flatMap((r) => {
      const m = toMapPlayground(r as GeoRow);
      return m ? [packPlayground(m)] : [];
    });
    console.info(`map snapshot built: ${rows.length} playgrounds, ${JSON.stringify(rows).length} bytes`);
    return rows;
  },
  ["map-snapshot-v5-surfaces"],
  { tags: [MAP_TAG], revalidate: 3600 },
);

// Every Server Action that changes what the map shows calls this: the person who made the change
// sees it at once, everyone else on their next page load.
export function invalidateMapSnapshot() {
  updateTag(MAP_TAG);
}

// Home's "Novo" list: the newest playgrounds' ids (Home looks them up in the snapshot). Expires
// with the map, since a new playground changes both.
const latestPlaygroundIds = unstable_cache(
  async (limit: number): Promise<string[]> => {
    const { data, error } = await createAnonClient()
      .from("playgrounds_geo")
      .select("id")
      .eq("flagged", false)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).flatMap((r) => (r.id ? [r.id] : []));
  },
  ["latest-playground-ids-v1"],
  { tags: [MAP_TAG], revalidate: 3600 },
);

// Home's "Najbolj priljubljena": the most-viewed playgrounds' ids (at least one view). Views
// change on every detail page visit, so this refreshes every 10 minutes, not with the map.
const mostViewedPlaygroundIds = unstable_cache(
  async (limit: number): Promise<string[]> => {
    const { data, error } = await createAnonClient()
      .from("playgrounds_geo")
      .select("id")
      .eq("flagged", false)
      .eq("status", "published")
      .gt("view_count", 0)
      .order("view_count", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).flatMap((r) => (r.id ? [r.id] : []));
  },
  ["most-viewed-playground-ids-v1"],
  { revalidate: 600 },
);

// Failures aren't cached (the cached functions throw); Home just shows the list empty.
export async function getLatestPlaygroundIds(limit: number): Promise<string[]> {
  return latestPlaygroundIds(limit).catch((err) => {
    console.error("getLatestPlaygroundIds failed", err);
    return [];
  });
}

export async function getMostViewedPlaygroundIds(limit: number): Promise<string[]> {
  return mostViewedPlaygroundIds(limit).catch((err) => {
    console.error("getMostViewedPlaygroundIds failed", err);
    return [];
  });
}

// Private bucket (ADR-0002): short-lived signed URLs by storage path, created with the visitor's
// own client so the storage select policy decides — it only covers photos that aren't flagged.
export async function signedPhotoUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, PHOTO_URL_TTL_SECONDS);
  return new Map(
    (data ?? []).flatMap((s) => (s.path && s.signedUrl && !s.error ? [[s.path, s.signedUrl] as const] : [])),
  );
}

// Playground ids are UUIDs. Anything else (a typo, a bot probing URLs) is simply not found: the
// database would only answer "invalid uuid", which isn't worth a round trip or an error in the logs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// cache() dedupes the fetch between generateMetadata and the page render. Public playgrounds only,
// for everyone: admins review waiting ones in /admin/pending, not here (ADR-0003).
export const getPlaygroundById = cache(async (id: string): Promise<PlaygroundDetail | null> => {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("playgrounds_geo")
    .select(`${MAP_SELECT}, user_id`)
    .eq("id", id)
    .eq("flagged", false)
    .eq("status", "published")
    .maybeSingle();

  // A failed query would otherwise look like a missing playground (404) and leave no trace.
  if (error) console.error("getPlaygroundById failed", error);
  const row = data as GeoRow | null;
  const base = row ? toMapPlayground(row) : null;
  if (error || !data || !row || !base) return null;

  const { data: photoRows } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("playground_id", id)
    .eq("flagged", false)
    .order("created_at")
    .order("storage_path");

  const urlByPath = await signedPhotoUrls(
    supabase,
    (photoRows ?? []).map((p) => p.storage_path),
  );
  const photos: PlaygroundPhoto[] = (photoRows ?? []).flatMap((p) => {
    const url = urlByPath.get(p.storage_path);
    return url ? [{ id: p.id, url }] : [];
  });

  // Who added it: decides, on the server, whether the visitor may edit it (FR-ADD-08).
  const user_id = typeof data.user_id === "string" ? data.user_id : null;

  const unknownFeatures = PLAYGROUND_FEATURE_KEYS.filter((k) => row[k] == null);

  return { ...base, photos, unknownFeatures, user_id };
});

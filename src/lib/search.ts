import { haversineMeters } from "./geo";
import type { MapPlayground } from "./playground-types";

// Search (FR-MAP-10). Names and descriptions are searched in the browser, over the map snapshot;
// places go through a geocoder on the server (searchPlaceAction).

/** Lowercase, without accents, single-spaced: "Fužine  Igrišče" → "fuzine igrisce". */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_RESULTS = 20;

// Playgrounds whose name or description has every word of the query: name hits first (a name that
// starts with the query before one that only contains it), then description-only hits.
export function searchByName(points: readonly MapPlayground[], query: string): MapPlayground[] {
  const words = normalizeForSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const whole = words.join(" ");
  const scored: { p: MapPlayground; score: number }[] = [];
  for (const p of points) {
    const name = normalizeForSearch(p.name);
    const text = `${name} ${normalizeForSearch(p.description ?? "")}`;
    if (!words.every((w) => text.includes(w))) continue;
    const inName = words.every((w) => name.includes(w));
    scored.push({ p, score: name.startsWith(whole) ? 0 : inName ? 1 : 2 });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name, "sl"))
    .slice(0, MAX_RESULTS)
    .map(({ p }) => p);
}

/** How far around a place to look: a town and its neighbourhoods. */
export const PLACE_RADIUS_M = 5_000;

// The playgrounds within PLACE_RADIUS_M of a place, nearest first, with their distance.
export function nearPlace(
  points: readonly MapPlayground[],
  place: { lat: number; lng: number },
): { p: MapPlayground; distance: number }[] {
  return points
    .map((p) => ({ p, distance: haversineMeters(place.lat, place.lng, p.lat, p.lng) }))
    .filter(({ distance }) => distance <= PLACE_RADIUS_M)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_RESULTS);
}

import { haversineMeters } from "./geo";
import type { MapPlayground } from "./playground-types";

/** How many rows each Home list shows. */
export const HOME_LIST_SIZE = 3;

// The `n` playgrounds closest to `position`, nearest first, with their distance in metres.
// Runs only in the browser: the visitor's position is never sent or stored (GDPR-13).
export function nearestPlaygrounds(
  points: readonly MapPlayground[],
  position: { lat: number; lng: number },
  n = HOME_LIST_SIZE,
): { p: MapPlayground; d: number }[] {
  return points
    .map((p) => ({ p, d: haversineMeters(position.lat, position.lng, p.lat, p.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n);
}

// Home's "Najbolj priljubljena" and "Najnovejša igrišča" lists. Each playground is listed once on
// the page, in this order of precedence: "V bližini", popular, latest. The pools hold more ids
// than rows, so a list refills from its spare rows when one of its playgrounds is taken.
export function pickHomeLists({
  points,
  popularIds,
  latestIds,
  nearestIds = [],
  size = HOME_LIST_SIZE,
}: {
  points: readonly MapPlayground[];
  popularIds: readonly string[];
  latestIds: readonly string[];
  nearestIds?: readonly string[];
  size?: number;
}): { popular: MapPlayground[]; latest: MapPlayground[] } {
  const byId = new Map(points.map((p) => [p.id, p]));
  const shown = new Set(nearestIds);
  const take = (ids: readonly string[]) => {
    const out: MapPlayground[] = [];
    for (const id of ids) {
      if (out.length === size) break;
      const p = byId.get(id);
      if (!p || shown.has(id)) continue;
      shown.add(id);
      out.push(p);
    }
    return out;
  };
  return { popular: take(popularIds), latest: take(latestIds) };
}

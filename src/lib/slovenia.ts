import border from "./slovenia-border.json";

// Slovenia's border: OpenStreetMap relation 218657 (© OpenStreetMap contributors, ODbL), simplified
// to about 40 m; slovenia-border.json says how. Natural Earth's 1:10m border was tried first and put
// Piran outside and Gorizia inside, so it isn't enough for border and coastal towns.
const RINGS = border.geometry.coordinates.flat() as [number, number][][];
const BBOX = { minLng: 13.37, maxLng: 16.6, minLat: 45.42, maxLat: 46.88 };

export function inSlovenia(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lng < BBOX.minLng || lng > BBOX.maxLng || lat < BBOX.minLat || lat > BBOX.maxLat) return false;
  // Ray casting over every ring (even–odd), so separate pieces and any holes count right.
  let inside = false;
  for (const ring of RINGS) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

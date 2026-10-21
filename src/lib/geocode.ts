// One place in Slovenia for a text query, from OpenStreetMap's Nominatim. Its usage policy asks for
// an identifying User-Agent, light use and cached results: callers cache and rate-limit. Runs on
// the server, so Nominatim sees the query but not the visitor.
export type Place = { lat: number; lng: number; name: string; label: string };

const USER_AGENT = "kje-so-igrala/0.1 (+https://playground-finder-seven.vercel.app)";

export async function geocodeInSlovenia(query: string): Promise<Place | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=si&accept-language=sl&q=" +
    encodeURIComponent(query);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim answered ${res.status}`);
  const data: { lat: string; lon: string; name?: string; display_name: string }[] = await res.json();
  const first = data[0];
  if (!first) return null;
  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
    name: first.name || first.display_name.split(",")[0],
    label: first.display_name,
  };
}

const USER_AGENT =
  "playground-finder-import/0.1 (one-off import script; contact via repo)";

let lastCall = 0;

export async function geocodeSI(
  query: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "si");

  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  const hit = data[0];
  if (!hit) return null;

  const latitude = parseFloat(hit.lat);
  const longitude = parseFloat(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

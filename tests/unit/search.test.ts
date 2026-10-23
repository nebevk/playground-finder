import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapPlayground } from "@/lib/playground-types";
import { nearPlace, normalizeForSearch, PLACE_RADIUS_M, searchByName } from "@/lib/search";

vi.mock("@/lib/geocode", () => ({ geocodeInSlovenia: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ withinRateLimit: vi.fn(async () => true) }));
// The cache is Next's; here the lookup runs straight through.
vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn }));
const { searchPlaceAction } = await import("@/app/[locale]/search/actions");
const { geocodeInSlovenia } = await import("@/lib/geocode");
const { withinRateLimit } = await import("@/lib/rate-limit");

const pg = (id: string, name: string, lat = 46.05, lng = 14.5, description: string | null = null): MapPlayground => ({
  id,
  name,
  description,
  lat,
  lng,
  is_fenced: false,
  has_shade: false,
  has_water: false,
  has_toilets: false,
  has_parking: false,
  has_benches: false,
  has_toddler_area: false,
  is_accessible: false,
  has_lighting: false,
  surfaces: [],
  review_count: 0,
  avg_rating: null,
  equipment: [],
});

const points = [
  pg("tivoli", "Tivoli Park Playground", 46.0569, 14.4979),
  pg("fuzine", "Fužine Otroško Igrišče", 46.0516, 14.5654),
  pg("siska", "Šiška Kids Zone", 46.0723, 14.4925),
  pg("park", "Park Zvezda", 46.0503, 14.5034, "Igrišče v središču, ob Kongresnem trgu."),
  pg("parkirisce", "Igrišče ob parkirišču", 46.06, 14.51),
];

describe("search by name (FR-MAP-10)", () => {
  it("[FR-MAP-10] ignores accents, case and extra spaces", () => {
    expect(normalizeForSearch("  Fužine   OTROŠKO Igrišče ")).toBe("fuzine otrosko igrisce");
    expect(searchByName(points, "fuzine").map((p) => p.id)).toEqual(["fuzine"]);
    expect(searchByName(points, "ŠIŠKA").map((p) => p.id)).toEqual(["siska"]);
    expect(searchByName(points, "siska").map((p) => p.id)).toEqual(["siska"]);
  });

  it("[FR-MAP-10] needs every word, and also finds them in the description", () => {
    expect(searchByName(points, "park playground").map((p) => p.id)).toEqual(["tivoli"]);
    expect(searchByName(points, "kongresnem").map((p) => p.id)).toEqual(["park"]);
  });

  it("[FR-MAP-10] lists names starting with the query first, then other name hits, then descriptions", () => {
    expect(searchByName(points, "park").map((p) => p.id)).toEqual(["park", "parkirisce", "tivoli"]);
  });

  it("[FR-MAP-10] lists the playgrounds around a place, nearest first, within the radius", () => {
    const near = nearPlace(points, { lat: 46.0569, lng: 14.4979 });
    expect(near[0].p.id).toBe("tivoli");
    expect(near[0].distance).toBeLessThan(1);
    expect(near.every(({ distance }) => distance <= PLACE_RADIUS_M)).toBe(true);
    expect(near.map((n) => n.distance)).toEqual([...near.map((n) => n.distance)].sort((a, b) => a - b));
    expect(nearPlace(points, { lat: 46.55, lng: 15.64 })).toEqual([]);
  });
});

describe("search by place", () => {
  beforeEach(() => {
    vi.mocked(geocodeInSlovenia).mockReset();
    vi.mocked(withinRateLimit).mockResolvedValue(true);
  });

  it("[FR-MAP-10] looks the words up as a place in Slovenia", async () => {
    const place = { lat: 46.07, lng: 14.49, name: "Šiška", label: "Šiška, Ljubljana, Slovenija" };
    vi.mocked(geocodeInSlovenia).mockResolvedValue(place);
    expect(await searchPlaceAction("  Šiška ")).toEqual({ place });
    expect(geocodeInSlovenia).toHaveBeenCalledWith("šiška");
  });

  it("[NFR-SEC-04] is rate-limited per client, and skips one-letter queries", async () => {
    expect(await searchPlaceAction("a")).toEqual({ place: null });
    vi.mocked(withinRateLimit).mockResolvedValue(false);
    expect(await searchPlaceAction("Bled")).toEqual({ error: "rate_limited" });
    expect(geocodeInSlovenia).not.toHaveBeenCalled();
  });

  it("[FR-MAP-10] says so when the place lookup fails", async () => {
    vi.mocked(geocodeInSlovenia).mockRejectedValue(new Error("Nominatim answered 503"));
    expect(await searchPlaceAction("Bled")).toEqual({ error: "failed" });
  });
});

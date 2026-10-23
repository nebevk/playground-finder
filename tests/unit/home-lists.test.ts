import { describe, expect, it } from "vitest";
import { nearestPlaygrounds, pickHomeLists } from "@/lib/home-lists";
import type { MapPlayground } from "@/lib/playground-types";

// Twelve playgrounds a…l, spread north of a point, `a` nearest.
const point = (id: string, i: number): MapPlayground => ({
  id,
  name: id,
  description: null,
  lat: 46.05 + i * 0.01,
  lng: 14.5,
  is_fenced: false,
  has_shade: false,
  has_water: false,
  has_toilets: false,
  has_parking: false,
  has_benches: false,
  has_toddler_area: false,
  is_accessible: false,
  has_lighting: false,
  surface_type: null,
  review_count: 0,
  avg_rating: null,
  equipment: [],
});
const points = [..."abcdefghijkl"].map(point);
const popularIds = ["a", "b", "c", "d", "e", "f"];
const latestIds = ["g", "a", "h", "i", "j", "k", "l", "b", "c"];
const ids = (list: MapPlayground[]) => list.map((p) => p.id);

describe("Home lists", () => {
  it("[FR-MAP-09] each playground is listed once, and the lists refill from spare rows", () => {
    // Before locating: popular first, latest skips what popular already shows.
    const before = pickHomeLists({ points, popularIds, latestIds });
    expect(ids(before.popular)).toEqual(["a", "b", "c"]);
    expect(ids(before.latest)).toEqual(["g", "h", "i"]);

    // After locating, "V bližini" takes a, g and h; both lists refill.
    const nearestIds = ["a", "g", "h"];
    const after = pickHomeLists({ points, popularIds, latestIds, nearestIds });
    expect(ids(after.popular)).toEqual(["b", "c", "d"]);
    expect(ids(after.latest)).toEqual(["i", "j", "k"]);
    const all = [...nearestIds, ...ids(after.popular), ...ids(after.latest)];
    expect(new Set(all).size).toBe(all.length);
  });

  it("[FR-MAP-09] skips ids it has no playground for, and never pads a list", () => {
    const lists = pickHomeLists({ points, popularIds: ["gone", "a"], latestIds: ["b", "gone"] });
    expect(ids(lists.popular)).toEqual(["a"]);
    expect(ids(lists.latest)).toEqual(["b"]);

    const two = points.slice(0, 2);
    const few = pickHomeLists({ points: two, popularIds, latestIds, nearestIds: ["a", "b"] });
    expect(few.popular).toEqual([]);
    expect(few.latest).toEqual([]);
  });

  it("[FR-MAP-09] [GDPR-13] nearest playgrounds come closest first, with their distance", () => {
    const nearest = nearestPlaygrounds(points, { lat: 46.0499, lng: 14.5 });
    expect(nearest.map(({ p }) => p.id)).toEqual(["a", "b", "c"]);
    expect(nearest[0].d).toBeLessThan(nearest[1].d);
    expect(nearest[1].d).toBeLessThan(nearest[2].d);
    expect(nearestPlaygrounds(points.slice(0, 2), { lat: 46, lng: 14.5 })).toHaveLength(2);
  });
});

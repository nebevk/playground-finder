import { describe, expect, it } from "vitest";
import { matchesFilters } from "@/lib/filters";
import type { FeatureKey, SurfaceType } from "@/lib/playground-types";

const base = {
  is_fenced: false,
  has_shade: false,
  has_water: false,
  has_toilets: false,
  has_parking: false,
  surface_type: null as SurfaceType | null,
};

const features = (...keys: FeatureKey[]) => new Set<FeatureKey>(keys);
const surfaces = (...keys: SurfaceType[]) => new Set<SurfaceType>(keys);

describe("map filters", () => {
  it("[FR-MAP-05] [FR-MAP-06] matches everything when no filter is active", () => {
    expect(matchesFilters(base, features(), surfaces())).toBe(true);
  });

  it("[FR-MAP-05] requires every selected feature (AND)", () => {
    const shadyFenced = { ...base, has_shade: true, is_fenced: true };
    expect(matchesFilters(shadyFenced, features("has_shade"), surfaces())).toBe(true);
    expect(matchesFilters(shadyFenced, features("has_shade", "is_fenced"), surfaces())).toBe(true);
    expect(matchesFilters(shadyFenced, features("has_shade", "has_water"), surfaces())).toBe(false);
  });

  it("[FR-MAP-06] accepts any selected surface (OR)", () => {
    const sand = { ...base, surface_type: "sand" as const };
    expect(matchesFilters(sand, features(), surfaces("sand"))).toBe(true);
    expect(matchesFilters(sand, features(), surfaces("tartan", "sand"))).toBe(true);
    expect(matchesFilters(sand, features(), surfaces("tartan"))).toBe(false);
  });

  it("[FR-MAP-06] excludes playgrounds with unknown surface once a surface is selected", () => {
    expect(matchesFilters(base, features(), surfaces("grass"))).toBe(false);
  });

  it("[FR-MAP-05] [FR-MAP-06] combines feature and surface filters", () => {
    const p = { ...base, has_water: true, surface_type: "gravel" as const };
    expect(matchesFilters(p, features("has_water"), surfaces("gravel"))).toBe(true);
    expect(matchesFilters(p, features("has_water"), surfaces("sand"))).toBe(false);
    expect(matchesFilters(p, features("has_toilets"), surfaces("gravel"))).toBe(false);
  });

  it.todo("[FR-MAP-07] filters by equipment (swings, slides, zipline, sandbox, climbing wall)");
});

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_KEYS,
  equipmentFrom,
  featuresFrom,
  PLAYGROUND_FEATURE_KEYS,
  statedFeatures,
  surfaceFrom,
  SURFACE_TYPES,
} from "@/lib/playground-types";

const MIGRATIONS = join(__dirname, "..", "..", "supabase", "migrations");

// The newest migration that (re)defines a constraint: that's the one the database runs with.
function latestMigrationAdding(constraint: string): string {
  const file = readdirSync(MIGRATIONS)
    .sort()
    .filter((f) => readFileSync(join(MIGRATIONS, f), "utf8").includes(`add constraint ${constraint}`))
    .at(-1);
  expect(file, constraint).toBeDefined();
  return readFileSync(join(MIGRATIONS, file!), "utf8");
}

describe("equipment", () => {
  it("[FR-ADD-07] the database accepts exactly the equipment the app offers", () => {
    const sql = latestMigrationAdding("playgrounds_equipment_known");
    const lists = [...sql.matchAll(/equipment <@ '(\[[^']*\])'::jsonb/g)].map((m) => JSON.parse(m[1]));
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) expect(list).toEqual([...EQUIPMENT_KEYS]);
  });

  it("[FR-ADD-07] baby swings are on offer", () => {
    expect(EQUIPMENT_KEYS).toContain("baby_swings");
  });

  it("[FR-ADD-07] a form's ticked equipment is read as known keys only, in list order", () => {
    const fd = new FormData();
    for (const value of ["sandbox", "moat", "baby_swings", "swings", "sandbox"]) fd.append("equipment", value);
    expect(equipmentFrom(fd)).toEqual(["swings", "baby_swings", "sandbox"]);
    expect(equipmentFrom(new FormData())).toEqual([]);
  });
});

describe("surfaces", () => {
  it("[FR-ADD-02] the database accepts exactly the surfaces the app offers", () => {
    const sql = latestMigrationAdding("playgrounds_surface_type_known");
    const list = sql.match(/check \(surface_type in \(([^)]*)\)\)/)?.[1];
    expect(list).toBeDefined();
    expect(list!.split(",").map((s) => s.trim().replace(/^'|'$/g, ""))).toEqual([...SURFACE_TYPES]);
  });

  it("[FR-ADD-02] a submitted surface is read as a known one or none", () => {
    expect(surfaceFrom("woodchips")).toBe("woodchips");
    expect(surfaceFrom("lava")).toBeNull();
    expect(surfaceFrom(null)).toBeNull();
  });
});

describe("features", () => {
  it("[FR-ADD-02] a form's unticked features mean the playground doesn't have them", () => {
    const fd = new FormData();
    fd.set("has_benches", "on");
    fd.set("is_fenced", "on");
    const features = featuresFrom(fd);
    expect(Object.keys(features)).toEqual([...PLAYGROUND_FEATURE_KEYS]);
    expect(features.has_benches).toBe(true);
    expect(features.is_fenced).toBe(true);
    expect(features.has_lighting).toBe(false);
    expect(features.has_toilets).toBe(false);
  });

  it("[FR-PG-01] an import leaves the newer features it doesn't mention unknown, not 'Brez …'", () => {
    const features = statedFeatures((k) => k === "has_shade" || k === "has_toddler_area");
    expect(features.has_shade).toBe(true);
    expect(features.has_toddler_area).toBe(true);
    // The first five can't be unknown in the database.
    expect(features.has_toilets).toBe(false);
    expect(features.has_benches).toBeNull();
    expect(features.is_accessible).toBeNull();
    expect(features.has_lighting).toBeNull();
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DATA_CACHE_LIMIT_BYTES,
  MAP_DESCRIPTION_MAX,
  MAP_SNAPSHOT_BUDGET_BYTES,
  packPlayground,
  unpackPlayground,
} from "@/lib/map-snapshot";
import type { MapPlayground, SurfaceType } from "@/lib/playground-types";

const SRC = join(__dirname, "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(SRC, ...parts), "utf8");

const LONG =
  "Večje ograjeno igrišče s peskovnikom, gugalnicami za malčke in večje otroke, toboganom in plezalno steno. " +
  "Popoldne je veliko sence pod lipami, ob vhodu je pitnik, parkirišče je ob trgovini čez cesto.";

// A realistic row: a long Slovenian name and full-precision coordinates; every other one has a
// long description (most OpenStreetMap imports have none).
function row(i: number, description: string | null = i % 2 === 0 ? LONG : null): MapPlayground {
  return {
    id: `0b5e4f2a-9c1d-4e7b-8a3f-${String(i).padStart(12, "0")}`,
    name: `Otroško igrišče Šmartinski park ob Ljubljanici ${i}`,
    description,
    lat: 46.056946123456 + i * 1e-4,
    lng: 14.505751987654 + i * 1e-4,
    is_fenced: i % 2 === 0,
    has_shade: i % 3 === 0,
    has_water: i % 5 === 0,
    has_toilets: i % 7 === 0,
    has_parking: i % 11 === 0,
    has_benches: i % 2 === 1,
    has_toddler_area: i % 13 === 0,
    is_accessible: i % 4 === 0,
    has_lighting: false,
    surfaces: ([["rubber_tiles"], ["sand", "woodchips"], ["grass"], ["asphalt"], []] as SurfaceType[][])[i % 5],
    review_count: i % 4 === 0 ? 0 : i % 40,
    avg_rating: i % 4 === 0 ? null : 3.666666666666667,
    equipment: i % 3 === 0 ? ["swings", "baby_swings", "sandbox"] : i % 3 === 1 ? ["climbing_wall", "water_play"] : [],
  };
}
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");

describe("map snapshot (ADR-0001)", () => {
  it("[NFR-PERF-02] stays within its 1 MB budget at 5,000 playgrounds", () => {
    const snapshot = Array.from({ length: 5000 }, (_, i) => packPlayground(row(i)));
    expect(bytes(snapshot)).toBeLessThanOrEqual(MAP_SNAPSHOT_BUDGET_BYTES);
  });

  it("[NFR-PERF-02] stays under the 2 MB cache limit even if every playground had a long description", () => {
    const snapshot = Array.from({ length: 5000 }, (_, i) => packPlayground(row(i, LONG.repeat(3))));
    expect(bytes(snapshot)).toBeLessThan(DATA_CACHE_LIMIT_BYTES);
  });

  it("[NFR-PERF-02] packing keeps what the map shows: features, equipment, surface, rating, a word-cut description", () => {
    for (const i of [0, 1, 2, 3, 6, 35]) {
      const original = row(i);
      const back = unpackPlayground(packPlayground(original));
      expect(back).toEqual({
        ...original,
        description: back.description,
        lat: Math.round(original.lat * 1e5) / 1e5,
        lng: Math.round(original.lng * 1e5) / 1e5,
        avg_rating: original.review_count > 0 ? 3.7 : null,
      });
      if (original.description) {
        expect(back.description!.length).toBeLessThanOrEqual(MAP_DESCRIPTION_MAX);
        // Cut at a word, with no dangling comma or space before the ellipsis.
        expect(back.description).toMatch(/[^\s,.;:]…$/);
        expect(original.description.startsWith(back.description!.slice(0, -1))).toBe(true);
      } else {
        expect(back.description).toBeNull();
      }
    }
    expect(unpackPlayground(packPlayground(row(9, "Kratek opis."))).description).toBe("Kratek opis.");
  });

  it("[NFR-PERF-01] the map, Home and the add flow read the shared snapshot", () => {
    for (const page of [["page.tsx"], ["map", "page.tsx"], ["add", "page.tsx"]]) {
      expect(read("app", "[locale]", ...page), page.join("/")).toContain("getMapSnapshot()");
    }
    const loader = read("lib", "playgrounds.ts");
    expect(loader).toMatch(/getMapSnapshot = unstable_cache\(/);
    expect(loader).toContain("createAnonClient()");
  });

  // Forgetting this shows up as "my change isn't on the map" for up to an hour.
  it("[NFR-PERF-01] every Server Action that changes the map expires the snapshot", () => {
    const actions: Record<string, string[]> = {
      "add/actions.ts": ["createPlaygroundAction"],
      "admin/actions.ts": [
        "approveFlaggedAction",
        "flagTargetAction",
        "deleteFlaggedAction",
        "updatePlaygroundAction",
        "setPlaygroundStatusAction",
        "deletePlaygroundAction",
        "bulkDeletePlaygroundsAction",
        "bulkSetFlaggedPlaygroundsAction",
      ],
      "admin/add/actions.ts": ["quickAddPlaygroundAction"],
      "admin/import/actions.ts": ["bulkInsertPlaygroundsAction"],
      "playground/[id]/actions.ts": [
        "updateOwnPlaygroundAction",
        "submitReviewAction",
        "updateReviewAction",
        "deleteReviewAction",
        "submitReportAction",
      ],
      "profile/actions.ts": ["deleteAccountAction"],
    };
    for (const [file, names] of Object.entries(actions)) {
      const source = read("app", "[locale]", ...file.split("/"));
      for (const name of names) {
        const start = source.indexOf(`export async function ${name}(`);
        expect(start, `${file}: ${name}`).toBeGreaterThanOrEqual(0);
        const next = source.indexOf("\nexport ", start + 1);
        const body = source.slice(start, next === -1 ? undefined : next);
        expect(body, `${file}: ${name}`).toContain("invalidateMapSnapshot()");
      }
    }
  });
});

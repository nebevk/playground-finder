// The discoveries API (BL-70, FR-ADM-09): who may call, what may be sent, what gets in. The parts
// that need the database (lookups, inserts) are covered end to end in tests/e2e/discoveries.spec.ts.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkDiscoverySecret,
  dailyCap,
  planDiscoveries,
  startOfDay,
  validateCandidate,
  type Candidate,
} from "@/lib/discoveries";
import { inSlovenia } from "@/lib/slovenia";

// The route must never reach the database in the cases tested here.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("no database in unit tests");
  },
}));
const { POST } = await import("@/app/api/discoveries/route");

const SECRET = "a-test-secret-that-is-long-enough-123";
const valid = (over: Record<string, unknown> = {}) => ({
  name: "Igrišče Tivoli",
  lat: 46.0569,
  lng: 14.5058,
  source: "osm",
  external_id: "way/123456",
  ...over,
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("who may call", () => {
  it("[FR-ADM-09] [NFR-SEC-05] fails closed without a secret, or with a short one", () => {
    expect(checkDiscoverySecret(`Bearer ${SECRET}`, undefined)).toBe("not_configured");
    expect(checkDiscoverySecret("Bearer short", "short")).toBe("not_configured");
  });

  it("[FR-ADM-09] [NFR-SEC-05] wants the exact secret as a bearer token", () => {
    expect(checkDiscoverySecret(null, SECRET)).toBe("unauthorized");
    expect(checkDiscoverySecret(SECRET, SECRET)).toBe("unauthorized");
    expect(checkDiscoverySecret(`Bearer ${SECRET}x`, SECRET)).toBe("unauthorized");
    expect(checkDiscoverySecret("Bearer ", SECRET)).toBe("unauthorized");
    expect(checkDiscoverySecret(`Bearer ${SECRET}`, SECRET)).toBe("ok");
  });

  it("[FR-ADM-09] the daily cap is 2 unless set, at most 50", () => {
    expect(dailyCap(undefined)).toBe(2);
    expect(dailyCap("0")).toBe(2);
    expect(dailyCap("abc")).toBe(2);
    expect(dailyCap("5")).toBe(5);
    expect(dailyCap("500")).toBe(50);
  });
});

describe("the route, before any database", () => {
  const post = (body: string, headers: Record<string, string> = { authorization: `Bearer ${SECRET}` }) =>
    POST(new Request("http://localhost/api/discoveries", { method: "POST", body, headers }));

  it("[FR-ADM-09] answers 503 when no secret is configured, 401 to a wrong one", async () => {
    expect((await post("{}")).status).toBe(503);
    vi.stubEnv("DISCOVERY_SECRET", SECRET);
    expect((await post("{}", { authorization: "Bearer nope" })).status).toBe(401);
    expect((await post("{}", {})).status).toBe(401);
  });

  it("[FR-ADM-09] refuses a body that isn't JSON, is malformed as a whole, or is too large", async () => {
    vi.stubEnv("DISCOVERY_SECRET", SECRET);
    expect((await post("not json")).status).toBe(400);
    expect(await (await post(JSON.stringify({ candidates: [] }))).json()).toMatchObject({ error: "invalid_body" });
    expect((await post(JSON.stringify({ candidates: Array.from({ length: 21 }, () => valid()) }))).status).toBe(400);
    expect((await post(JSON.stringify({ max: 0, candidates: [valid()] }))).status).toBe(400);
    expect((await post(JSON.stringify({ candidates: [valid({ description: "x".repeat(70_000) })] }))).status).toBe(413);
  });
});

describe("what may be sent", () => {
  it("[FR-ADM-09] a candidate in Slovenia with an OSM id passes, trimmed", () => {
    const result = validateCandidate(valid({ name: "  Igrišče Tivoli  ", features: { has_shade: true, has_water: false } }), 0);
    expect(result.ok && result.candidate.name).toBe("Igrišče Tivoli");
  });

  it("[FR-ADM-09] each problem rejects just that candidate, with the reason", () => {
    const reasons = [
      valid({ name: "   " }),
      valid({ name: "x".repeat(121) }),
      valid({ description: "x".repeat(2001) }),
      valid({ source_notes: "x".repeat(1001) }),
      valid({ source: "import" }),
      valid({ external_id: "123456" }),
      valid({ external_id: "way/0" }),
      valid({ features: { has_slide: true } }),
      valid({ features: { has_shade: "yes" } }),
      valid({ lat: "46" }),
      valid({ surprise: 1 }),
    ].map((c, i) => {
      const r = validateCandidate(c, i);
      return r.ok ? "ok" : r.rejected.reason;
    });
    expect(reasons).toEqual(Array(11).fill("invalid"));
    const outside = validateCandidate(valid({ lat: 45.6495, lng: 13.7768, external_id: "node/7" }), 3);
    expect(outside).toMatchObject({ ok: false, rejected: { index: 3, external_id: "node/7", reason: "outside_slovenia" } });
  });

  it("[FR-ADM-09] the border check knows border and coastal towns", () => {
    const places: [string, number, number, boolean][] = [
      ["Ljubljana", 46.0569, 14.5058, true],
      ["Piran", 45.5283, 13.5683, true],
      ["Nova Gorica", 45.9558, 13.6483, true],
      ["Lendava", 46.5645, 16.451, true],
      ["Jesenice", 46.4365, 14.0526, true],
      ["Trieste", 45.6495, 13.7768, false],
      ["Gorizia", 45.9409, 13.6219, false],
      ["Zagreb", 45.815, 15.9819, false],
      ["Graz", 47.0707, 15.4395, false],
      ["Klagenfurt", 46.6247, 14.3053, false],
    ];
    for (const [name, lat, lng, inside] of places) expect(inSlovenia(lat, lng), name).toBe(inside);
  });
});

describe("what gets in", () => {
  const candidate = (external_id: string, lat: number, lng: number): Candidate => ({
    name: external_id,
    lat,
    lng,
    source: "osm",
    external_id,
  });
  const run = (list: Candidate[], lookups: { known?: string[]; nearby?: [number, string][]; allowed?: number }) =>
    planDiscoveries(
      list.map((c, index) => ({ index, candidate: c })),
      { known: new Set(lookups.known ?? []), nearby: new Map(lookups.nearby ?? []), allowed: lookups.allowed ?? 10 },
    );

  it("[FR-ADM-07] [FR-ADM-09] a feature already known, in any status, is skipped; so is a repeat in the request", () => {
    const plan = run([candidate("way/1", 46.05, 14.5), candidate("way/2", 46.2, 14.6), candidate("way/2", 46.3, 14.7)], {
      known: ["way/1"],
    });
    expect(plan.insert.map((i) => i.candidate.external_id)).toEqual(["way/2"]);
    expect(plan.skipped).toEqual([
      { index: 0, external_id: "way/1", reason: "duplicate_external_id" },
      { index: 2, external_id: "way/2", reason: "duplicate_external_id" },
    ]);
  });

  it("[FR-ADM-09] a candidate within 150 m of a playground, or of an earlier candidate, is skipped", () => {
    const plan = run(
      [candidate("node/1", 46.05, 14.5), candidate("node/2", 46.0505, 14.5005), candidate("node/3", 46.2, 14.6)],
      { nearby: [[2, "existing-id"]] },
    );
    expect(plan.insert.map((i) => i.candidate.external_id)).toEqual(["node/1"]);
    expect(plan.skipped).toEqual([
      { index: 1, external_id: "node/2", reason: "nearby", nearby_external_id: "node/1" },
      { index: 2, external_id: "node/3", reason: "nearby", nearby_id: "existing-id" },
    ]);
  });

  it("[FR-ADM-09] past the daily cap, the rest wait for another day", () => {
    const plan = run([candidate("way/1", 46.05, 14.5), candidate("way/2", 46.2, 14.6), candidate("way/3", 46.4, 15.0)], {
      allowed: 1,
    });
    expect(plan.insert).toHaveLength(1);
    expect(plan.skipped.map((s) => s.reason)).toEqual(["daily_cap", "daily_cap"]);
    expect(run([candidate("way/1", 46.05, 14.5)], { allowed: 0 }).skipped[0].reason).toBe("daily_cap");
  });

  it("[FR-ADM-09] the day starts at midnight in Ljubljana, summer time or not", () => {
    expect(startOfDay(new Date("2026-10-31T10:00:00Z")).toISOString()).toBe("2026-10-30T23:00:00.000Z");
    expect(startOfDay(new Date("2026-07-15T10:00:00Z")).toISOString()).toBe("2026-07-14T22:00:00.000Z");
    expect(startOfDay(new Date("2026-07-14T22:30:00Z")).toISOString()).toBe("2026-07-14T22:00:00.000Z");
    expect(startOfDay(new Date("2026-07-14T21:59:59Z")).toISOString()).toBe("2026-07-13T22:00:00.000Z");
    // The night summer time ends (25 October 2026): midnight was still at UTC+2.
    expect(startOfDay(new Date("2026-10-25T12:00:00Z")).toISOString()).toBe("2026-10-24T22:00:00.000Z");
  });
});

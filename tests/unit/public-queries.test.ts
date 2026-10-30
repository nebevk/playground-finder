// RLS lets owners and admins read flagged rows, and admins rows waiting for review (ADR-0003), so
// everything shown publicly must filter `flagged = false` and `status = 'published'` explicitly.
// This records every query the public loaders build.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = [method: string, args: unknown[]];
const queries: { table: string; calls: Call[] }[] = [];

// A thenable query builder: records each chained call, resolves to `result(calls)`.
function builder(table: string, result: (calls: Call[]) => unknown) {
  const q = { table, calls: [] as Call[] };
  queries.push(q);
  const proxy: unknown = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result(q.calls));
        return (...args: unknown[]) => {
          q.calls.push([String(prop), args]);
          return proxy;
        };
      },
    },
  );
  return proxy;
}

const ROW = { id: "pg1", name: "Tivoli", lat: 46, lng: 14.5, review_count: 0, view_count: 0, equipment: [] };
// What the detail page looks up: playground ids are UUIDs.
const PLAYGROUND_ID = "0b3a1c5e-8f2d-4e7a-9c1b-2d3e4f5a6b7c";
const single = (calls: Call[]) => calls.some(([m]) => m === "maybeSingle");
const supabase = {
  from: (table: string) =>
    builder(table, (calls) =>
      table !== "playgrounds_geo"
        ? { data: [], error: null }
        : { data: single(calls) ? ROW : [ROW], error: null },
    ),
  storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
};
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase }));
vi.mock("@/lib/supabase/anon", () => ({ createAnonClient: () => supabase }));
// The sitemap makes its own anon client.
vi.mock("@supabase/supabase-js", () => ({ createClient: () => supabase }));
// The cache is Next's; here the cached loaders run straight through.
vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn, updateTag: () => {} }));

const { getMapSnapshot, getLatestPlaygroundIds, getMostViewedPlaygroundIds, getPlaygroundById } = await import(
  "@/lib/playgrounds"
);
const { getReviewsForPlayground } = await import("@/lib/reviews");
const { default: sitemap } = await import("@/app/sitemap");

const filtersFlagged = (q: { calls: Call[] }) =>
  q.calls.some(([m, args]) => m === "eq" && args[0] === "flagged" && args[1] === false);
const filtersPublished = (q: { calls: Call[] }) =>
  q.calls.some(([m, args]) => m === "eq" && args[0] === "status" && args[1] === "published");

beforeEach(() => {
  queries.length = 0;
});

describe("public queries hide flagged rows explicitly", () => {
  it("[FR-COM-06] map, latest and most-viewed listings", async () => {
    await getMapSnapshot();
    await getLatestPlaygroundIds(9);
    await getMostViewedPlaygroundIds(6);
    expect(queries).toHaveLength(3);
    for (const q of queries) expect(filtersFlagged(q), `${q.table} query`).toBe(true);
  });

  it("[FR-COM-06] the detail page: playground and its photos", async () => {
    await getPlaygroundById(PLAYGROUND_ID);
    expect(queries.map((q) => q.table)).toEqual(["playgrounds_geo", "photos"]);
    for (const q of queries) expect(filtersFlagged(q), `${q.table} query`).toBe(true);
  });

  it("[NFR-SEO-01] an id that isn't a UUID is simply not found, without asking the database", async () => {
    expect(await getPlaygroundById("not-a-playground")).toBeNull();
    expect(queries).toHaveLength(0);
  });

  it("[FR-COM-06] reviews on the detail page", async () => {
    await getReviewsForPlayground("pg1", null);
    expect(filtersFlagged(queries[0])).toBe(true);
  });
});

describe("public queries show published playgrounds only (ADR-0003)", () => {
  it("[FR-ADM-08] map, latest and most-viewed listings", async () => {
    await getMapSnapshot();
    await getLatestPlaygroundIds(9);
    await getMostViewedPlaygroundIds(6);
    expect(queries).toHaveLength(3);
    for (const q of queries) expect(filtersPublished(q), `${q.table} query`).toBe(true);
  });

  it("[FR-ADM-08] the detail page, for everyone (admins review in the queue)", async () => {
    await getPlaygroundById(PLAYGROUND_ID);
    expect(queries[0].table).toBe("playgrounds_geo");
    expect(filtersPublished(queries[0])).toBe(true);
  });

  it("[FR-ADM-08] [NFR-SEO-01] the sitemap", async () => {
    const entries = await sitemap();
    expect(queries.map((q) => q.table)).toEqual(["playgrounds_geo"]);
    expect(filtersPublished(queries[0])).toBe(true);
    expect(filtersFlagged(queries[0])).toBe(true);
    expect(entries.some((e) => e.url.endsWith("/sl/playground/pg1"))).toBe(true);
  });
});

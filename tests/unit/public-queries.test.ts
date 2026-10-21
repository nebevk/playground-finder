// RLS lets owners and admins read flagged rows, so everything shown publicly must filter
// `flagged = false` explicitly. This records every query the public loaders build.
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
// The cache is Next's; here the cached loaders run straight through.
vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn, updateTag: () => {} }));

const { getMapSnapshot, getLatestPlaygroundIds, getMostViewedPlaygroundIds, getPlaygroundById } = await import(
  "@/lib/playgrounds"
);
const { getReviewsForPlayground } = await import("@/lib/reviews");

const filtersFlagged = (q: { calls: Call[] }) =>
  q.calls.some(([m, args]) => m === "eq" && args[0] === "flagged" && args[1] === false);

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
    await getPlaygroundById("pg1");
    expect(queries.map((q) => q.table)).toEqual(["playgrounds_geo", "photos"]);
    for (const q of queries) expect(filtersFlagged(q), `${q.table} query`).toBe(true);
  });

  it("[FR-COM-06] reviews on the detail page", async () => {
    await getReviewsForPlayground("pg1", null);
    expect(filtersFlagged(queries[0])).toBe(true);
  });
});

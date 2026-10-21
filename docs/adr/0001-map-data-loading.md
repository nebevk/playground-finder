# ADR-0001: Map data loading — cached shared snapshot

**Status:** Accepted, implemented in ops 0013 (2026-10-21). See *Implementation notes* for where it differs.
**Date:** 2026-10-14
**Deciders:** Nejc Bevk (owner)

## Context

Both `/` (home preview map) and `/map` call `getMapPlaygrounds()` ([src/lib/playgrounds.ts](../../src/lib/playgrounds.ts)), which selects **every** row of `playgrounds_geo` on **every request**:

- It uses the cookie-bound server client (`src/lib/supabase/server.ts`), so the call reads `cookies()` → the page is dynamic and nothing is cached by Next.js or the Vercel CDN.
- `playgrounds_geo` is a `security_invoker` view that joins a `GROUP BY` aggregate over the **whole** `reviews` table, so each page view costs a full scan of `playgrounds` + `reviews`.
- Because RLS runs as the visitor, **admins see flagged playgrounds on the public map** (`playgrounds_select_admin_flagged`). That is a side effect, not a feature — moderation has its own pages.
- The payload sent to the client (`MapClient` is a client component) includes the full `description` (the sheet only renders it `line-clamp-2`) and `view_count` (not used by any map component).
- Filtering is fully client-side (`FiltersContext` → `playgrounds.filter(matches)`), and clustering is done by `react-leaflet-cluster` over the full set. Both assume the client holds all points.

**How big can this get?** OpenStreetMap lists **1,541** `leisure=playground` features in Slovenia (Overpass count, 2026-10-14). Even if OSM under-maps by 2×, the realistic ceiling is ~3–5k rows. This is a "small, bounded, country-wide" dataset, not an open-ended one.

Measured serialized size of the current `MapPlayground[]` shape (synthetic rows, realistic field lengths):

| Rows | Current shape (full description) | Description ≤160 chars, no `view_count` | Brotli (wire) |
|---|---|---|---|
| 1,541 | ~990 KB | ~700 KB | ~60 KB+ |
| 3,000 | ~1.9 MB | ~1.4 MB | ~115 KB+ |
| 10,000 | ~6.4 MB | ~4.6 MB | ~390 KB+ |

(Wire sizes are a lower bound — real, non-repeating descriptions compress worse than the synthetic sample.)

**Platform constraints that shape the choice (Next.js 16.2.4 on Vercel, verified against the bundled docs):**

- `cacheComponents` is **off** in `next.config.ts`. Turning it on (to use `"use cache"`) changes rendering for every route and needs a separate migration.
- `"use cache"` without `cacheComponents` is unavailable; with it, the default handler is **in-memory and does not persist across serverless invocations** — on Vercel it needs `"use cache: remote"` (paid, network hop).
- `unstable_cache` (the "previous model" API, still supported in 16) persists in Vercel's Data Cache **across instances and deployments**, supports `tags` + `revalidate`.
- The Data Cache **refuses entries over 2 MB** (raw `JSON.stringify` length — see `incremental-cache/index.js`). Over the limit it silently logs a warning and every request misses the cache.
- `updateTag(tag)` (Server Actions only) = read-your-own-writes; `revalidateTag(tag, "max")` = stale-while-revalidate; single-arg `revalidateTag(tag)` is deprecated.

## Decision

Serve the map from **one shared, cached, slimmed snapshot**:

1. Add `getMapSnapshot()` that queries `playgrounds_geo` with a **cookie-less anon client** (publishable key, `persistSession: false`), wrapped in `unstable_cache` with tag `playgrounds:map` and a `revalidate: 3600` fallback. Everyone — anon, signed-in, admin — gets the same public, non-flagged set.
2. Slim the snapshot contract (`MapPlayground`): drop `view_count`; truncate `description` server-side to 160 chars (the sheet already clamps to 2 lines; the detail page fetches the full text); round `lat`/`lng` to 5 decimals (~1 m).
3. Every Server Action that changes something visible on the map calls one helper, `invalidateMapSnapshot()` → `updateTag("playgrounds:map")`, so the person who made the change sees it straight away (`/add` redirects to `/map?added=<id>` and must find the new marker).
4. Writes made outside Next (CLI import `scripts/import/push.ts`, Supabase dashboard/MCP edits, the 3-reports auto-flag trigger) are covered by the 1-hour TTL. If that is too slow, add a secret-protected `POST /api/revalidate` route handler that calls `revalidateTag("playgrounds:map", { expire: 0 })`.
5. Home "most viewed" stays a separate query, cached with a short TTL (10 min) and **no** tag — `view_count` changes on every detail view and must not churn the map cache.
6. Enforce a **payload budget of 1 MB raw** (half the 2 MB cache ceiling) with an automated test, and log the snapshot size when it is built.

## Options Considered

### Option A: Status quo (per-request full query) + payload trims only

| Dimension | Assessment |
|---|---|
| Complexity | Low — no new concepts |
| Cost | Every `/` and `/map` view = 1 function invocation + full `playgrounds` scan + full `reviews` aggregate. Linear in traffic × rows |
| Scalability | Fine at alpha traffic; DB load becomes the bottleneck first |
| Team familiarity | High |

**Pros:** Always fresh; zero invalidation logic.
**Cons:** Wasted DB work on every view; admins see flagged rows on the public map; no protection against the payload drifting past what phones handle comfortably.

### Option B: Cached shared snapshot (`unstable_cache` + tags) — **chosen**

| Dimension | Assessment |
|---|---|
| Complexity | Low–Med — one cached function, one invalidation helper, ~8 call sites |
| Cost | DB hit ≈ once per write or per hour, not per view. Vercel Data Cache is included in the plan |
| Scalability | Comfortable to ~5k rows; hard ceiling at 2 MB raw (~7k slim rows) |
| Team familiarity | High — same data shape, same components, same client-side filtering and clustering |

**Pros:** Removes per-view DB load; fixes the admin/flagged leak; keeps instant client-side filtering and clustering; no client code changes beyond the slimmer type; easy to reverse.
**Cons:** Someone must remember to invalidate on new write paths (mitigated by one helper + a test); out-of-band writes are up to 1 h stale; `unstable_cache` is legacy in Next 16 and will need migrating to `"use cache: remote"` when Cache Components are adopted.

### Option C: Viewport (bbox) queries via PostGIS RPC

| Dimension | Assessment |
|---|---|
| Complexity | High — new RPC, refetch on pan/zoom with debounce, server-side clustering for country-level zoom, loading states per pan |
| Cost | Many small queries per session; each pan is a mobile round trip |
| Scalability | Unbounded — the right answer at 50k+ points |
| Team familiarity | Medium — `playgrounds_near` + GiST index exist, but no client refetch logic does |

**Pros:** Payload independent of dataset size; scales indefinitely.
**Cons:** Solves a problem Slovenia doesn't have (~1.5–5k points); worse feel on mobile (markers pop in after each pan); breaks "N playgrounds match your filters" semantics (only counts the viewport); makes offline/PWA much harder.

### Option D: Static JSON snapshot via a CDN-cached Route Handler

| Dimension | Assessment |
|---|---|
| Complexity | Medium — route handler, cache-busting version for read-your-own-writes, client fetch + loading state |
| Cost | Near zero — served from Vercel edge and the browser cache |
| Scalability | Same row ceiling as B, but no 2 MB Data Cache limit |
| Team familiarity | Medium |

**Pros:** One download shared across `/` → `/map` navigation; cacheable by a service worker for offline (fits the planned PWA); no function invocation per view.
**Cons:** Adds a fetch after hydration (an extra mobile round trip before markers show, unless preloaded); two cache layers (CDN + browser) to bust after a write; more moving parts than B for the same row ceiling.

## Trade-off Analysis

The deciding fact is the **dataset ceiling**. With ~1.5k known playgrounds and a realistic cap of ~5k, the "load everything, filter and cluster on the client" model is correct for this product: filters respond instantly, the map works the same at every zoom level, and it suits offline use later. Option C pays a high complexity and UX cost to scale past a size Slovenia will never reach.

Between A, B and D, the question is just *where the full set is cached*. B fixes the real costs today (per-view DB scans, the admin leak, an unbounded payload) with the smallest diff and no change to the client's data flow. D is better once there is a service worker to use it — so it is **deferred, not rejected**: `getMapSnapshot()` is exactly the function a future `/api/playgrounds` route handler would call, so moving from B to D later is mostly additive.

The 2 MB Data Cache limit is the sharpest edge of B: if it is crossed, caching silently stops and we are back to Option A's cost with no error. The 1 MB budget test exists so this fails loudly in CI long before production.

## Consequences

- **Easier:** Map and home load without a DB round trip in the common case; DB load no longer grows with traffic; admins see exactly what visitors see.
- **Easier:** A single typed snapshot contract that a later route handler, service worker or offline mode can reuse.
- **Harder:** New write paths must call `invalidateMapSnapshot()`. Forgetting it shows up as "my change isn't on the map" for up to 1 hour.
- **Harder:** Out-of-band edits (MCP, dashboard, CLI import) are not instantly visible — document this in `docs/deploy.md`.
- **Revisit when:** snapshot exceeds **1 MB raw** or **5,000 rows** → reconsider D (with gzip at the edge) or C; Cache Components adopted → migrate `unstable_cache` to `"use cache: remote"` + `cacheTag`; PWA/offline work starts → promote to Option D.
- **Out of scope but noticed:** `src/proxy.ts` calls `supabase.auth.getUser()` (a network call to Supabase Auth) on every matched request, including anonymous map views. Worth its own ADR if TTFB matters.

## Action Items

1. [x] Add `src/lib/supabase/anon.ts` — cookie-less anon client for cacheable public reads.
2. [x] Add `getMapSnapshot()` (`unstable_cache`, tag `playgrounds:map`, `revalidate: 3600`) and `invalidateMapSnapshot()` in `src/lib/playgrounds.ts`; switch `/` and `/map` to it.
3. [x] Slim `MapPlayground`: remove `view_count`, truncate `description` to 160 chars, round coordinates to 5 decimals.
4. [x] Call `invalidateMapSnapshot()` from: `add/actions.ts` (before `redirect`), `admin/actions.ts`, `admin/add/actions.ts`, `admin/import/actions.ts`, `playground/[id]/actions.ts` (review create/update/delete, report), `profile/actions.ts` (account deletion removes reviews).
5. [x] Confirm `updateTag` expires `unstable_cache` tags in 16.2.4 (the docs only show `fetch` and `cacheTag` examples); if it doesn't, use `revalidateTag("playgrounds:map", { expire: 0 })`.
6. [x] Cache `getMostViewedPlaygrounds` with a 10-min TTL and no tag.
7. [x] Tests: payload budget (≤ 1 MB raw at 5,000 synthetic rows); flagged rows never appear in the snapshot; every map-affecting Server Action calls the invalidation helper.
8. [x] Document the out-of-band staleness (≤ 1 h) and how to force a refresh in `docs/deploy.md`.
9. [ ] Follow-up: write an ADR on the per-request `auth.getUser()` in the proxy.

## Implementation notes (ops 0013)

- **Packed, not just slimmed.** The size table above already shows that 160-character descriptions and no `view_count` leave about 1.4 MB at 3,000 rows. That breaks the 1 MB budget long before 5,000. Repeating a dozen keys per row cost about 140 bytes on its own. So the snapshot is a list of positional rows:
  - the 5 features as a bitmask;
  - the surface as an index;
  - the rating × 10;
  - the description cut at a word to 120 characters, and only when there is one.

  `src/lib/map-snapshot.ts` packs and unpacks it. The map and Home receive it packed and unpack it in the browser, so phones download it packed too.
- **Measured** (`tests/unit/map-snapshot.test.ts`, synthetic rows with long Slovenian names):
  - 5,000 playgrounds, half of them with a description: about 0.95 MB (the budget test);
  - 5,000, all with a long description: about 1.27 MB, still under the 2 MB Data Cache limit (tested);
  - today's scale, about 1,500: about 0.3 MB, against about 0.74 MB in the old shape.
- **Home** gets only ids from the "latest" (map tag) and "most viewed" (10 minutes, no tag) queries, and looks them up in the snapshot.
- **`updateTag` and `unstable_cache`:** the add flow redirects to `/map?added=<id>`, and the e2e test finds the new pin there. This confirms that the tag expires the snapshot for the person who saved.
- **Cache keys carry a version** (`map-snapshot-v2-packed`). The Data Cache outlives deploys, so bump the version whenever the shape changes.
- Still open: action item 9, the ADR on the proxy's per-request `auth.getUser()`.

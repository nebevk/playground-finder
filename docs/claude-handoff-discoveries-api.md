# Claude handoff: discoveries API (BL-70)

**For:** Claude Code session on `playground-finder`  
**From:** Huston (2026-10-30)  
**Repo (local):** `C:\Users\Nejc\Desktop\dev\playground-finder`  
**Repo (GitHub):** https://github.com/nebevk/playground-finder  
**Prod:** https://playground-finder-seven.vercel.app - Supabase project `playground-finder` (`hwwaoistqfomdcjayiue`)  
**Backlog:** [BL-70](backlog.md) - **Requirement:** FR-ADM-07 (review queue)  
**Decision record:** [ADR-0003](adr/0003-playground-status-and-admin-review-queue.md) (Accepted, ops 0020). Where this handoff and the ADR or code differ, the ADR and code win.  
**Built 2026-10-31 (Claude Code), ops 0023.** Where the build differs from this handoff:

- The service key is `SUPABASE_SECRET_KEY` (`createAdminClient()`), not `SUPABASE_SERVICE_ROLE_KEY`.
- The env template is `.env.local.example`.
- No new RPC: the service role bypasses RLS, so `playgrounds_near` sees every status.
- The border is OSM's (relation 218657, ODbL), not Natural Earth: Natural Earth's 1:10m border put Piran outside and Gorizia inside.
- A `DISCOVERY_SECRET` under 32 characters counts as not set (503).

## Goal

Ship a **secret-protected `POST /api/discoveries`** that accepts OpenStreetMap playground candidates, validates and dedupes them, and inserts the survivors as `status = 'pending'`, `source = 'osm'`, so they land in `/admin/pending` for Nejc to approve.

## Why

Huston (Grok Bot) will run a daily Overpass routine adding ~2 playgrounds/day. **The routine must never hold the Supabase service-role key.** It only gets a narrow shared secret; the server holds the service role and enforces every rule. Owner decision (ADR-0003): user adds publish immediately; only discoveries wait as pending.

## Non-goals

- The Overpass query / daily routine / Grok Bot automation (Huston owns it, wires it after this ships).
- Changing the review queue, RLS, or user add flow.
- Photos from OSM or anywhere else (ADR-0002 unchanged).

## Current anchors (read first)

- `supabase/migrations/20261030120000_playground_status.sql`: `status` check, `source in ('user','import','osm','other')`, `external_id` 1..100 chars, `source_notes <= 1000`, **non-partial unique index `(source, external_id)`** - use `on conflict (source, external_id) do nothing`.
- `supabase/migrations/20261021090000_db_write_rules.sql`: `description <= 2000`; check here for `name` and other column limits.
- `src/app/[locale]/admin/add/actions.ts`: `DUP_RADIUS_M = 150` + `nearbyPlaygroundsAction` - reuse the same radius (export a shared constant); note the existing nearby lookup may be RLS-filtered/published-only, discovery dedupe must cover **every status**.
- `src/lib/playground-types.ts`: `PLAYGROUND_SOURCES`, feature types.
- There is no `src/app/api/` yet - this is the first route handler; follow Next.js App Router conventions and keep it out of the `[locale]` segment and middleware i18n rewrites.

## Implement

### 1. Auth

- Env `DISCOVERY_SECRET` (server only, never `NEXT_PUBLIC_`). Request header `Authorization: Bearer <secret>`.
- Constant-time compare (`crypto.timingSafeEqual` on equal-length buffers). Missing env => `503` (fail closed); wrong/missing header => `401`. No details leaked.
- Only `POST`; other methods `405`. Small body limit (e.g. 64 KB).
- Service-role client created **inside** the handler only (`SUPABASE_SERVICE_ROLE_KEY`, already server-side for imports); never returned or logged.

### 2. Request body

```json
{
  "max": 2,
  "candidates": [
    {
      "name": "Igrisce Tivoli",
      "lat": 46.055, "lng": 14.497,
      "description": "optional",
      "features": { "optional": "same shape/keys as the add form; unknown keys rejected" },
      "source": "osm",
      "external_id": "way/123456789",
      "source_notes": "optional, e.g. OSM tags summary + Overpass timestamp"
    }
  ]
}
```

- Validate with zod (or the project's validator). 1..N candidates (hard cap N = 20 per request).
- `source` must equal `"osm"`. `external_id` must match `^(node|way|relation)/\d+$`.
- `max` optional, `1..DISCOVERY_DAILY_CAP`; default = cap.

### 3. Server validation per candidate

- Inside Slovenia: bbox prefilter (approx. lat 45.42..46.88, lng 13.37..16.61) then a point-in-polygon check against a simplified Slovenia border (commit a small GeoJSON under `src/lib/geo/`, cite its source/licence). Fail => `rejected: outside_slovenia`.
- Field lengths exactly matching DB constraints (name, description <= 2000, external_id <= 100, source_notes <= 1000). Trim; empty name => reject.
- Daily cap: env `DISCOVERY_DAILY_CAP` (default 2). Count `source='osm'` rows created today (Europe/Ljubljana day) across all statuses; insert at most `min(max, cap - today)`. Extra valid ones => `skipped: daily_cap`.

### 4. Dedupe (against every status, incl. rejected)

- By id: existing `(osm, external_id)` => `skipped: duplicate_external_id` (a rejected one must never come back). Use `on conflict do nothing` as the race-safe backstop and treat conflict as skipped, not error.
- By distance: any playground of any status within **150 m** => `skipped: nearby` (return the nearby id). Do it with service role (or a `security definer` RPC restricted to service role), so RLS does not hide pending/rejected rows. Also dedupe candidates within the same request against each other.

### 5. Insert

- `status='pending'`, `source='osm'`, `external_id`, `source_notes`, features left unknown unless given (ops 0022 three-way semantics - unticked != false). No `created_by` user, or the convention the import script uses; check NOT NULL columns.
- Do not touch the map snapshot cache (pending is invisible anyway).

### 6. Response

`200` with:

```json
{ "inserted": [{"external_id":"way/1","id":"uuid"}],
  "skipped":  [{"external_id":"way/2","reason":"duplicate_external_id"}],
  "rejected": [{"external_id":"node/3","reason":"outside_slovenia","detail":"..."}],
  "counts": {"inserted":1,"skipped":1,"rejected":1}, "cap_remaining_today": 1 }
```

`400` only for a malformed body as a whole; per-row problems go in `rejected`.

### 7. Tests

- Unit: auth (no env => 503, bad/missing secret => 401), schema validation, Slovenia polygon (Ljubljana in; Trieste, Zagreb, Graz out), length limits.
- DB/route tests: success inserts pending osm row hidden from public; second call with same external_id => skipped; rejected row with same id => skipped; row within 150 m of a published/pending/rejected one => skipped; daily cap enforced across calls.
- Optional e2e: inserted row appears in `/admin/pending`.

### 8. ODbL attribution (implement)

- On detail pages where `source='osm'`: "Podatki (c) sodelavci OpenStreetMap" / "Data (c) OpenStreetMap contributors" linking https://www.openstreetmap.org/copyright, plus link to the feature (`https://www.openstreetmap.org/<external_id>`). i18n `sl` + `en`.
- About/credits page: mention OSM data under ODbL alongside the existing map-tile credit.

### 9. Share-alike - **owner decision (Nejc) before the routine goes live**

The DB mixing OSM-derived rows with own data may be a Derivative Database under ODbL. Options:

- **A. Accept ODbL for OSM-derived data:** keep attribution, and offer the OSM-derived subset (name, coordinates, tags) publicly under ODbL on request or as a download. Simplest, honest.
- **B. Use OSM only as a lead:** store OSM coordinates/name for review only, and when publishing, admin re-verifies/re-enters data independently; do not redistribute OSM-derived fields as such. More work, weaker benefit.
- Edits by Nejc on top of an OSM row still count as derivative under A.

Claude: implement attribution regardless; do not decide A/B. Record the decision in ADR-0003 review notes or a new ADR once Nejc picks.

### 10. Ship

- Env on Vercel (Production + Preview): `DISCOVERY_SECRET` (random >= 32 bytes, e.g. `openssl rand -base64 32`), `DISCOVERY_DAILY_CAP=2`. Add to `.env.example` without value.
- `ops/handoff/0023-discoveries-api.md` (or next number) describing env + any migration/RPC.
- Update BL-70 / FR-ADM-07 status per conventions.

## Done when

- [ ] `POST /api/discoveries` live; 401/503 paths verified.
- [ ] Validation, dedupe (all statuses, id + 150 m), daily cap covered by tests, green.
- [ ] OSM attribution on osm-sourced detail + about.
- [ ] Env set on Vercel; secret handed to Huston out of band (not in git).
- [ ] Share-alike option recorded by Nejc.

## After this ships (Huston)

Store `DISCOVERY_SECRET` in Grok Bot's vault, then create the daily routine: Overpass `leisure=playground` in Slovenia, filter already-known ids, POST up to 2 candidates with Bearer secret, report counts to Nejc.
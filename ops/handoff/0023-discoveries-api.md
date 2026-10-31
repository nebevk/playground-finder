---
id: 0023
title: A secret-protected way in for OpenStreetMap discoveries, and OSM credit
status: ready
order: code-first
destructive: false
migrations: []
checksums: []
depends_on: [0020]
backlog: [BL-70]
requirements: [FR-ADM-09, FR-PG-06]
---

## Why

BL-70: Huston's daily routine will find about two OpenStreetMap playgrounds a day for the review queue. ADR-0003 says the routine must never hold the database's service key. This gives it a narrow way in instead: `POST /api/discoveries`, with a shared secret. The server holds the service role and enforces every rule. The routine itself is Huston's, after this ships.

Its data is OpenStreetMap's, under the ODbL, so playgrounds from OSM credit it.

## Changes

- **`POST /api/discoveries`** (`src/app/api/discoveries/route.ts`, rules in `src/lib/discoveries.ts`). It's the app's first route handler; the proxy's matcher already skips `/api`.
  - **Auth:** `Authorization: Bearer <DISCOVERY_SECRET>`, compared in constant time.
    - No secret set, or one under 32 characters: **503** for everyone (fails closed).
    - A wrong or missing token: **401**.
    - Other methods: 405.
  - **Body:** at most 64 KB (else 413), with 1 to 20 candidates and an optional `max` (else 400).
  - **Each candidate is judged on its own** and lands in exactly one of three lists:
    - `rejected`: not an OSM `node|way|relation/<id>`, lengths beyond the database's, unknown fields, or **outside Slovenia**;
    - `skipped`: already known in **any status** (a rejected one never comes back), **within 150 m** of a playground of any status or of an earlier candidate, or **past the daily cap**;
    - `inserted`: the rest, as `pending`, `source = 'osm'`, nobody's, with only the features the routine answered.
  - **The daily cap:** `DISCOVERY_DAILY_CAP` (default 2, at most 50) per Ljubljana day, counting every status. `max` lowers it per call.
  - **Two calls at the same time** could together go past the cap by their own batch. There is one routine, so that's accepted.
  - **Database:** no change. Lookups use the service role, so pending and rejected rows count. Inserts use `on conflict (source, external_id) do nothing` (the plain index from 0020), so a race comes back as skipped, not as an error.
- **Slovenia's border:** `src/lib/slovenia-border.json` is OSM relation 218657, simplified to about 40 m (© OpenStreetMap contributors, ODbL). Natural Earth's 1:10m border was tried first: it put Piran outside and Gorizia inside.
- **OSM credit** (FR-PG-06):
  - an OSM playground's page shows "Podatki © sodelavci OpenStreetMap" (linking openstreetmap.org/copyright), with a ↗ link to its feature, named "Poglej v OpenStreetMap", on the same row;
  - the About page gets a "Podatki" section. It says OSM-derived playgrounds are available under the ODbL, with the contact address for a copy. That is the share-alike choice the owner made on 2026-10-31: option A.
- **The 150 m radius** is now one constant, `SAME_PLAYGROUND_M`, shared by quick add, the review queue and discovery.
- **Docs:**
  - FR-ADM-09 and FR-PG-06;
  - BL-70 now lists what's left;
  - ADR-0003's follow-up notes;
  - the env vars in `.env.local.example`;
  - the handoff lists where the build differs from it.
- **Tests:**
  - unit (12): the secret, the cap setting, validation, the border (Piran and Nova Gorica in; Trieste, Gorizia and Zagreb out), the planner, the Ljubljana day, and the route's 503, 401, 400 and 413;
  - e2e (5): auth; a pending, hidden insert that is never added twice (even after a reject); skipped near a published or a rejected playground; per-candidate rejects; `max`; the OSM credit.

## Local verification (Claude Code)

- **2026-10-31, all checks:**
  - `pnpm test`: 126 pass.
  - `pnpm typecheck`, `pnpm lint` and `pnpm test:req` pass.
  - No database change.
- **`pnpm test:e2e`:** 83 passed in one full run, the 5 new ones included, with no server errors logged. The discoveries spec passed again after the credit's layout change.
- **The border check against real places:**
  - inside: Ljubljana, Maribor, Koper, Piran, Murska Sobota, Lendava, Bled, Nova Gorica, Jesenice, Bovec and Novo mesto;
  - outside: Trieste, Gorizia, Zagreb, Graz, Klagenfurt, Villach, Udine and Rijeka.
- **Phone-sized screenshot of a published discovery's page:** the credit sits on one row, with the ↗ link to the feature.

## Production steps (Cursor)

1. Preflight. The working tree must be clean, and 0020 must be `done`. (0022 being blocked on the owner doesn't stop this.)
2. No migrations. Commit and push, then watch the deploy until it is `READY`. Smoke-test the `smokePaths`.
3. **Before any secret is set**, the endpoint must refuse everyone:

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST <productionUrl>/api/discoveries
   ```

   Expect `503`.
4. **Owner (blocked step):**
   - In Vercel, under Production (and Preview, if the routine will test there), set `DISCOVERY_SECRET`, generated with `openssl rand -base64 32`.
   - Set `DISCOVERY_DAILY_CAP=2`.
   - Redeploy, because env changes need a new deployment.
   - Give the secret to Huston outside git and chat logs.
   - Then say "process ops".
5. Run *Verify in production* and record the results. Never print or paste the secret. Then `get_advisors` (`security`), and set `status: done`.

## Verify in production

HTTP checks after the owner's step. The owner runs the third one, because only they hold the secret. Its candidate is in Trieste, so nothing is written:

```bash
# A wrong secret: refused.
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer $(printf 'x%.0s' {1..40})" <productionUrl>/api/discoveries

# Not JSON: refused before anything else.
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer $DISCOVERY_SECRET" -d 'nope' <productionUrl>/api/discoveries

# The real secret, with a candidate outside Slovenia: rejected, nothing inserted.
curl -s -X POST -H "Authorization: Bearer $DISCOVERY_SECRET" -H "Content-Type: application/json" \
  -d '{"candidates":[{"name":"Trieste test","lat":45.6495,"lng":13.7768,"source":"osm","external_id":"node/1"}]}' \
  <productionUrl>/api/discoveries
```

```sql
-- Nothing came in from OSM yet.
select count(*) as from_osm from public.playgrounds where source = 'osm';
```

Expect:
- `401`, then `400`.
- JSON with `"counts":{"inserted":0,"skipped":0,"rejected":1}`, a rejected entry with `"reason":"outside_slovenia"`, and `"cap_remaining_today":2`.
- `from_osm = 0`.

## Rollback

- **Code:** `git revert` the commit and push. The endpoint is gone, and nothing else used it.
- **Env:** remove `DISCOVERY_SECRET` in Vercel. The endpoint then answers 503 even if the code stays.
- **Data:** nothing to undo unless the routine ran. Its rows are `source = 'osm'`, and the review queue rejects or deletes them.

## Result log (Cursor)

- 

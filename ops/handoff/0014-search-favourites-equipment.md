---
id: 0014
title: Search, favourites, play equipment; signed-in inserts limited to the app's columns
status: done
order: migrations-first
destructive: false
migrations: [20261021180000_equipment_and_insert_columns.sql]
checksums: [5b2e21bcc7f2e07b]
depends_on: [0013]
backlog: [BL-23, BL-15, BL-18]
requirements: [FR-MAP-10, FR-PG-04, FR-ADD-07, FR-MAP-07, NFR-SEC-07, NFR-SEC-04, GDPR-10]
---

## Why

Group 3 of the owner's three: features.

- **Search (FR-MAP-10, BL-23).**
  - A search field on Home and a search button beside "Filtri" on the map open `/search`.
  - Names (and descriptions) match as you type, ignoring accents: "fuzine" finds "Fužine Otroško Igrišče".
  - **Išči** also looks the words up as a place and lists the playgrounds within 5 km, nearest first. It uses OpenStreetMap's Nominatim, called from the server, cached for a day per query, and limited to 60 searches an hour per client.
  - The privacy page now says that the typed text, without the visitor's IP address, goes to Nominatim.
- **Favourites (FR-PG-04, BL-15).**
  - A heart on the map sheet and on each playground's page saves or removes a favourite. Visitors who aren't signed in are taken to sign in.
  - The profile lists them under "Priljubljena igrišča" (*favourite playgrounds*).
  - The table and its RLS already existed. Saving doesn't reload the page: the heart changes at once, and changes back with a message if saving fails.
- **Play equipment (FR-ADD-07, FR-MAP-07, BL-18).**
  - "Igrala" (*play equipment*: swings, slides, zipline, sandbox, climbing wall) can now be chosen when adding a playground, when its owner edits it, and in the admin forms.
  - The map's filters have an "Igrala" section; a playground must have every one selected.
  - The database accepts only those five keys. The CLI importer now drops other tags; until now its AI extraction could invent any.
- **Hardening found on the way (NFR-SEC-07).** Signed-in users could insert any column through the API, including ones the database owns:
  - a backdated `created_at`, which also slipped past 0013's hourly rate limits, since they count by `created_at`;
  - a `view_count` to top "most viewed", or a `helpful_count`;
  - a chosen `id` or `flagged` value.

  Now each table accepts only the columns the app sends, and the rest always come from their defaults.

## Changes

- **Migration `20261021180000_equipment_and_insert_columns.sql`:**
  - `playgrounds_equipment_known`: `equipment` is an array within the five keys. Added `not valid`, then validated if every row complies; step 2 checks that they do.
  - Column-level `INSERT` grants for `authenticated` on `playgrounds`, `reviews`, `photos`, `reports`, `favorites` and `review_helpful`, replacing the table-wide grants. RLS still decides which rows; the service role is unaffected.
- **Search:**
  - `src/lib/search.ts` (accent-free matching and ranking; places within 5 km);
  - `src/lib/geocode.ts` (Nominatim, shared with the admin quick-add);
  - `src/app/[locale]/search/` (page and `searchPlaceAction`);
  - `src/components/Search/SearchClient.tsx`; `place_search` in `src/lib/rate-limit.ts`;
  - entry points in `HomeLanding` and `MapControls`.
- **Favourites:**
  - `src/components/Favorites.tsx` (provider and heart);
  - `setFavoriteAction`; `src/lib/favorites.ts`;
  - `src/components/Profile/MyFavorites.tsx`;
  - the heart on `PlaygroundSheet` and the playground page. The map page passes the visitor's favourites to `MapClient`.
- **Equipment:**
  - `equipmentFrom` and `isEquipmentKey` in `playground-types`; `MapPlayground.equipment`;
  - an equipment bitmask in the packed snapshot (cache key `map-snapshot-v3-equipment`);
  - the filter in `filters.ts`, `FiltersContext` and `FiltersDrawer`;
  - `DetailsFields` (add and owner edit) and the admin edit and quick-add forms, with their actions;
  - the importer filter in `scripts/import/push.ts`.
- **i18n (sl + en):**
  - `search.*`, `favorites.*`, `profile.favorites.*`;
  - `add.step2.equipment` and `filters.equipment`;
  - `detail.equipment` now reads "Igrala";
  - `privacy.processors.osm` mentions Nominatim.
- **Tests:**
  - unit:
    - search: accents, words, ranking, places, the action's rate limit and failure;
    - the equipment filter;
    - equipment parsing, plus a check that the migration's key list equals `EQUIPMENT_KEYS`;
  - pgTAP:
    - known equipment accepted, an unknown tag refused;
    - favourites only one's own;
    - no `helpful_count`, `view_count` or backdated `created_at` on insert;
  - e2e:
    - search from Home and from the map;
    - a favourite saved, listed on the profile, and removed;
    - equipment chosen when adding shows on the playground's page.
- **Docs:** FR-MAP-07, FR-MAP-10, FR-PG-04 and FR-ADD-07 are now Done; NFR-SEC-07 notes the insert columns. BL-15, BL-18 and BL-23 are removed.

## Local verification (Claude Code)

- 2026-10-21: `pnpm test` 90 pass. `pnpm test:db` 84 pass, 10 of them new (the GDPR-04 TODO predates this). `pnpm typecheck`, `pnpm lint`, `pnpm test:req` and `pnpm ops:check` pass.
- `pnpm test:e2e` (mobile and desktop): 68 passed (1 known gap skipped), twice in a row.
  - Before that, one run failed the new favourites test: it left the page while the save was still in flight, and the heart changes before the save completes. The test now waits for the save. In the app this only means a favourite saved a moment before opening the profile can appear there one visit later.
- The step 2 pre-check and *Verify in production* were run on the local stack: `0`; `playgrounds_equipment_known | t`; the six insert-column lists exactly as listed. *Rollback*'s SQL was run inside a transaction that was rolled back.
- Checked by screenshot (production build, phone size):
  - the search field on Home;
  - search by name ("park");
  - search by place ("Šiška" → "Blizu kraja Četrtna skupnost Šiška", the district's official name, with distances; one real Nominatim lookup);
  - the heart on the map sheet, and the search button beside "Filtri";
  - the filters' "Igrala" section, and "Igrala" in the add form;
  - the profile's "Priljubljena igrišča".
- After the e2e runs, one class-only change: the map's search icon was teal, because Leaflet's own stylesheet colours links inside the map. It now has the same text colour as "Filtri", confirmed on a rebuilt production build.

## Production steps (Cursor)

1. Preflight. The working tree must be clean, and 0013 must be `done`: this push also carries the earlier commits.
2. **Pre-check (read-only).** Must return `0`:

   ```sql
   select count(*) from public.playgrounds
   where jsonb_typeof(equipment) <> 'array'
      or not equipment <@ '["swings", "slides", "zipline", "sandbox", "climbing_wall"]'::jsonb;
   ```

   If it isn't `0`, record `select id, name, equipment from public.playgrounds where …` (same condition), set `blocked` and stop without applying. An unvalidated constraint would block every update of those rows, including the view counter. Claude Code will write a cleanup.
3. `apply_migration` with name `equipment_and_insert_columns` and the exact file contents. It is safe before the push: the code in production inserts only the columns that stay granted, and never sets `equipment`.
4. Run *Verify in production* and confirm both expectations. If either fails, run *Rollback*'s SQL, set `failed` and stop.
5. Commit and push, then watch the deploy until it is `READY`. Smoke-test the `smokePaths`, plus `curl -s -o /dev/null -w "%{http_code}\n" <productionUrl>/sl/search` → `200`.
6. **Owner test on the phone** (record the result):
   - **Search:** on Home, tap the search field. Type part of a playground's name without accents, and it's listed. Type a town or neighbourhood that has playgrounds, and tap **Išči**: "Blizu kraja …" (*near …*) lists them with distances.
   - **Favourites:** on the map, open a playground and tap the heart; it fills. On its page the heart is filled too. Profile → "Priljubljena igrišča" lists it. Tap the heart again to remove it.
   - **Play equipment:** edit one of your playgrounds, tick two "Igrala" and save; the page lists them. On the map → Filtri → "Igrala", tick one of them: only matching playgrounds remain.
7. `get_advisors` (`security`): no new findings expected. Record the result and set `status: done`.

## Verify in production

```sql
-- Equipment limited to the known keys, and validated.
select conname, convalidated from pg_constraint where conname = 'playgrounds_equipment_known';

-- What signed-in users may insert.
select table_name, string_agg(column_name, ', ' order by column_name) as columns
from information_schema.column_privileges
where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'INSERT'
  and table_name in ('playgrounds', 'reviews', 'photos', 'reports', 'favorites', 'review_helpful')
group by 1 order by 1;
```

Expect:
- The first query returns 1 row: `playgrounds_equipment_known | t`.
- The second returns exactly:
  - `favorites`: `playground_id, user_id`
  - `photos`: `playground_id, storage_path, user_id`
  - `playgrounds`: `description, equipment, has_parking, has_shade, has_toilets, has_water, is_fenced, location, name, surface_type, user_id`
  - `reports`: `reason, target_id, target_type, user_id`
  - `review_helpful`: `review_id, user_id`
  - `reviews`: `comment, playground_id, rating, user_id`

## Rollback

```sql
alter table public.playgrounds drop constraint if exists playgrounds_equipment_known;
grant insert on public.playgrounds, public.reviews, public.photos, public.reports, public.favorites, public.review_helpful
  to authenticated;
```

For the app, `git revert` the deploy commit and push. The SQL restores the earlier table-wide insert grants. The new code works with or without them.

## Result log (Cursor)

- **2026-10-22T08:50Z** started (status → in-progress). Preflight: 0013 → done (owner OK except camera → 0015); prod `READY` (`9654d94`); `incoming/` untracked. Drift OK — `equipment_and_insert_columns` not in prod.
- **Pre-check:** bad equipment rows = 0.
- **Applied** `equipment_and_insert_columns`. Verify: `playgrounds_equipment_known | t`; INSERT columns match ticket expect for all 6 tables.
- **2026-10-22T08:55Z** pushed `13462bd` (MCP deploy `dpl_3Ra6ZfVyAntW4h7rqjSf8HL2jbx3` → `READY`). Smoke 200 incl. `/sl/search`. Security advisors unchanged (INFO `private.rate_limit_hits` no policies). Owner directed continue to 0015; phone search/favourites/equipment can be confirmed with that retest. **status → done**.


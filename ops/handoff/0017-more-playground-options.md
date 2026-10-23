---
id: 0017
title: More options when describing a playground (baby swings among them)
status: blocked
order: migrations-first
destructive: false
migrations: [20261023120000_more_playground_options.sql]
checksums: [8b569879aa20d83f]
depends_on: [0016]
backlog: []
requirements: [FR-ADD-07, FR-ADD-02, FR-MAP-05, FR-MAP-06, FR-MAP-07, FR-PG-01]
---

## Why

The owner asked for more choices in the add form's "Igrala" (*play equipment*), "Podlaga" (*surface*) and "Kaj ima igrišče?" (*what does the playground have?*) lists. At the very least, they wanted the enclosed swing seats for babies and toddlers.

## Changes

- **Play equipment:** 14 kinds instead of 5. The new ones:
  - Gugalnice za malčke (*baby swings*: the enclosed seats);
  - Gugalnica gnezdo (*nest swing*), Prevesna gugalnica (*seesaw*), Igrala na vzmet (*spring riders*);
  - Plezalna mreža (*climbing net*), Vrtiljak (*merry-go-round*), Trampolin, Hišica (*playhouse*), Igrala z vodo (*water play*).

  Swings are listed together, then slides and climbing, and so on.
- **Features:** Klopi (*benches*), Del za malčke (*toddler area*), Dostop z vozičkom (*pram and wheelchair access*), Razsvetljava (*lighting*).
  - They start **unknown** (null) for every playground already listed: nobody was asked. A playground's page leaves an unknown feature out, rather than showing "Brez klopi" (*no benches*) everywhere.
  - The forms answer them: an unticked box means "no", as for the first five.
  - Imports (the admin CSV import and the CLI importer) set only what the source says a playground has, and leave the rest unknown.
- **Surfaces:** now **any number per playground** (rubber under the swings, grass around them — chosen like the equipment, not one radio button). New surfaces: Gumijaste plošče (*rubber tiles*), Umetna trava (*artificial grass*), Lesni sekanci (*wood chips*), Asfalt. **Tartan is gone** — it was the same as rubber tiles; the migration folds existing "tartan" rows into rubber tiles, and the app still accepts "tartan" from older data and imports.
  - A new `surfaces` jsonb column (a list) alongside the old single `surface_type`. `surface_type` is left in place and untouched for the code already in production; a later contract ticket drops it.
- **Everywhere the options appear:**
  - the add form;
  - the owner's edit form;
  - the map's filters;
  - the playground's page and map sheet;
  - Home's lists and the link-preview card;
  - the admin edit, quick-add and import tools;
  - the CLI importer's extraction schema and prompt.
- **Migration `20261023120000_more_playground_options.sql`:**
  - four nullable feature columns;
  - a new `surfaces` jsonb column, backfilled from `surface_type` (tartan → rubber tiles), limited by a new constraint `playgrounds_surfaces_known` (the seven keys). The old inline `surface_type` check stays; `surface_type` is kept but no longer written;
  - `playgrounds_equipment_known` redefined with the 14 keys (a superset of ops 0014's, so every row complies);
  - `playgrounds_geo` recreated with the five new columns appended;
  - insert and update grants for `authenticated` on the new columns, `surfaces` among them.
- **Code tidy-up on the way:** the admin pages, the add action and the admin actions had their own copies of the feature and surface lists. They now use the shared helpers (`featuresFrom`, `surfacesFrom`, `surfacesIn`, `statedFeatures` in `src/lib/playground-types.ts`).
- **Map snapshot:** its cache key is now `map-snapshot-v5-surfaces`, because the packed shape and list order changed (surfaces is now a bitmask, like equipment).
- **i18n (sl + en):** labels for every new option, and "Brez …" for each new feature.
- **Docs:** FR-MAP-05, FR-MAP-06, FR-MAP-07, FR-PG-01 and FR-ADD-07 list the new options.
- **Tests:**
  - unit: the migration's equipment and surface lists equal the app's (from the newest migration that defines each constraint); tartan is gone from the list; form parsing dedupes surfaces, keeps list order and folds tartan into rubber tiles; imports leave unknown features null;
  - pgTAP: baby swings, several surfaces and the new features can be added; an unknown surface and bare "tartan" are refused; the new features start unknown; the owner can answer them and set several surfaces;
  - e2e: baby swings, benches and two surfaces (wood chips + sand) chosen in the add form show on the new playground's page, with "Brez razsvetljave" for the unticked lighting. A seeded playground shows neither "Klopi" nor "Brez klopi".

## Local verification (Claude Code)

- 2026-10-23: `pnpm db:reset` applies every migration cleanly. `pnpm test` 95 pass; `pnpm test:db` 88 pass, 4 of them new (the GDPR-04 TODO predates this). `pnpm typecheck`, `pnpm lint` and `pnpm test:req` pass.
- `pnpm test:e2e` (mobile and desktop): 70 passed (1 known gap skipped).
- *Verify in production* was run on the local stack and gave exactly the expected results.
- Checked by screenshot (production build, phone size): the add form's "Podlaga", "Kaj ima igrišče?" and "Igrala" lists with the new choices, and the same lists in the map's filters. Chips wrap cleanly at 375 px, and the new features have icons.

## Production steps (Cursor)

1. Preflight. The working tree must be clean, and 0016 must be `done`: this push also carries its commit.
2. **Pre-check (read-only).** Must return `0`: every existing playground's surface_type is one the backfill can map, and its equipment is within the new list.

   ```sql
   select count(*) from public.playgrounds
   where (surface_type is not null
          and surface_type not in ('tartan', 'rubber_tiles', 'sand', 'grass', 'artificial_turf', 'woodchips', 'gravel', 'asphalt'))
      or jsonb_typeof(equipment) <> 'array'
      or not equipment <@ '["swings", "baby_swings", "nest_swing", "seesaw", "spring_riders", "slides", "climbing_wall", "climbing_net", "zipline", "merry_go_round", "trampoline", "sandbox", "playhouse", "water_play"]'::jsonb;
   ```

   If it isn't `0`, record `select id, name, surface_type, equipment from public.playgrounds where …` (same condition), set `blocked` and stop without applying. A surface_type outside the backfill's map would land in `surfaces` and fail the new constraint.
3. `apply_migration` with name `more_playground_options` and the exact file contents. It is safe before the push: the code in production still writes `surface_type`, which is untouched, and never sets the new columns.
4. Run *Verify in production* and confirm all three expectations. If one fails, set `failed` and stop. Don't push, and leave the schema: the code in production works with it either way.
5. Commit and push, then watch the deploy until it is `READY`. Smoke-test the `smokePaths`.
6. **Owner test on the phone** (record the result):
   - **Add or edit:** Dodaj igrišče (or edit one of yours). The lists show the new choices:
     - "Igrala": "Gugalnice za malčke" and the others;
     - "Podlaga": "Lesni sekanci" and the others;
     - "Kaj ima igrišče?": "Klopi", "Del za malčke", "Dostop z vozičkom" and "Razsvetljava".

     Tick a few and save. The playground's page lists them, and shows "Brez …" for the unticked ones.
     Under "Podlaga" you can tick more than one surface.
   - **Filter:** on the map, Filtri → "Igrala" → "Gugalnice za malčke". Only playgrounds that have them remain.
   - **Older playgrounds:** open one nobody has edited since. Its surface still shows (what was "tartan" now reads "Gumijaste plošče"), and it shows no "Brez klopi" or "Brez razsvetljave".
7. `get_advisors` (`security`): no new findings expected. Record the result and set `status: done`.

## Verify in production

```sql
-- The new surfaces and equipment checks, both validated.
select conname, convalidated from pg_constraint
where conrelid = 'public.playgrounds'::regclass
  and conname in ('playgrounds_surfaces_known', 'playgrounds_equipment_known')
order by 1;

-- Every playground has a surfaces list, and no old "tartan" survived in it.
select
  count(*) filter (where jsonb_typeof(surfaces) <> 'array') as not_a_list,
  count(*) filter (where surfaces @> '["tartan"]') as still_tartan,
  count(*) filter (where surface_type = 'tartan' and not surfaces @> '["rubber_tiles"]') as unmapped_tartan
from public.playgrounds;

-- The new columns in the view (surfaces among them).
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'playgrounds_geo'
  and column_name in ('has_benches', 'has_toddler_area', 'is_accessible', 'has_lighting', 'surfaces')
order by 1;

-- What signed-in users may set on playgrounds.
select privilege_type, string_agg(column_name, ', ' order by column_name) as columns
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'playgrounds' and grantee = 'authenticated'
  and privilege_type in ('INSERT', 'UPDATE')
group by 1 order by 1;
```

Expect:
- The first query returns exactly 2 rows: `playgrounds_equipment_known | t` and `playgrounds_surfaces_known | t`.
- The second returns one row, all three counts `0`.
- The third returns 5 rows: `has_benches`, `has_lighting`, `has_toddler_area`, `is_accessible`, `surfaces`.
- The fourth returns (note `surface_type` is still granted — it's untouched, kept for the code in production):
  - `INSERT`: `description, equipment, has_benches, has_lighting, has_parking, has_shade, has_toddler_area, has_toilets, has_water, is_accessible, is_fenced, location, name, surface_type, surfaces, user_id`
  - `UPDATE`: `description, equipment, has_benches, has_lighting, has_parking, has_shade, has_toddler_area, has_toilets, has_water, is_accessible, is_fenced, location, name, surface_type, surfaces`

## Rollback

`git revert` the commit and push. The earlier code reads and writes `surface_type`, which this migration left in place and backfilled from, so it keeps working. **Leave the schema as it is**: narrowing the checks back would fail on any row that already uses a new value, and the `surfaces` column is harmless to the old code.

## Result log (Cursor)

- **2026-10-23T14:53Z** started (0016 done). Pre-check count(*) = 0. Applying `more_playground_options`.
- **2026-10-23T14:54Z** applied `more_playground_options` (prod version `20261023145425`). Verify: equipment_known+surfaces_known validated; not_a_list/still_tartan/unmapped_tartan all 0; geo has 5 new columns; INSERT/UPDATE grants match ticket. Pushing remaining commits (0017 + server-only fence).
- **2026-10-23T14:56Z** deploy `dpl_FUExG634Hhf5uS4RWbKNNHuCeSJf` READY on `1a72d0d`. Smoke paths 200; add form HTML includes "Gugalnice za malčke" and "Lesni sekanci". Advisors: same as 0015 (`private.rate_limit_hits` RLS INFO; `increment_playground_views` WARN; leaked-password protection WARN) — no new findings.
- **Blocked** on owner phone: add/edit new options (multi surface); map filter baby swings; older playground shows surface without "Brez klopi"/lighting. Say **process ops** when done.


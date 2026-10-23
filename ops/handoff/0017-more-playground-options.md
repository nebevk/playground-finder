---
id: 0017
title: More options when describing a playground (baby swings among them)
status: ready
order: migrations-first
destructive: false
migrations: [20261023120000_more_playground_options.sql]
checksums: [ffd6b3200b5437ab]
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
- **Surfaces:** Gumijaste plošče (*rubber tiles*), Umetna trava (*artificial grass*), Lesni sekanci (*wood chips*), Asfalt.
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
  - surfaces limited by a new constraint `playgrounds_surface_type_known`, which replaces the table's original inline check `playgrounds_surface_type_check`;
  - `playgrounds_equipment_known` redefined with the 14 keys;
  - `playgrounds_geo` recreated with the four columns appended;
  - insert and update grants for `authenticated` on the four columns.

  Both lists are supersets of the old ones, so every existing row complies.
- **Code tidy-up on the way:** the admin pages, the add action and the admin actions had their own copies of the feature and surface lists. They now use the shared ones (`featuresFrom`, `surfaceFrom`, `statedFeatures` in `src/lib/playground-types.ts`).
- **Map snapshot:** its cache key is now `map-snapshot-v4-more-options`, because the order of the equipment and surface lists changed.
- **i18n (sl + en):** labels for every new option, and "Brez …" for each new feature.
- **Docs:** FR-MAP-05, FR-MAP-06, FR-MAP-07, FR-PG-01 and FR-ADD-07 list the new options.
- **Tests:**
  - unit: the migration's equipment and surface lists equal the app's (from the newest migration that defines each constraint); parsing of forms; imports leave unknown features null;
  - pgTAP: baby swings, a new surface and the new features can be added; an unknown surface is refused; the new features start unknown; the owner can answer them;
  - e2e: baby swings, benches and wood chips chosen in the add form show on the new playground's page, with "Brez razsvetljave" for the unticked lighting. A seeded playground shows neither "Klopi" nor "Brez klopi".

## Local verification (Claude Code)

- 2026-10-23: `pnpm db:reset` applies every migration cleanly. `pnpm test` 95 pass; `pnpm test:db` 88 pass, 4 of them new (the GDPR-04 TODO predates this). `pnpm typecheck`, `pnpm lint` and `pnpm test:req` pass.
- `pnpm test:e2e` (mobile and desktop): 70 passed (1 known gap skipped).
- *Verify in production* was run on the local stack and gave exactly the expected results.
- Checked by screenshot (production build, phone size): the add form's "Podlaga", "Kaj ima igrišče?" and "Igrala" lists with the new choices, and the same lists in the map's filters. Chips wrap cleanly at 375 px, and the new features have icons.

## Production steps (Cursor)

1. Preflight. The working tree must be clean, and 0016 must be `done`: this push also carries its commit.
2. **Pre-check (read-only).** Both queries are needed:

   ```sql
   select conname from pg_constraint
   where conrelid = 'public.playgrounds'::regclass and contype = 'c'
   order by 1;

   select count(*) from public.playgrounds
   where (surface_type is not null
          and surface_type not in ('tartan', 'rubber_tiles', 'sand', 'grass', 'artificial_turf', 'woodchips', 'gravel', 'asphalt'))
      or jsonb_typeof(equipment) <> 'array'
      or not equipment <@ '["swings", "baby_swings", "nest_swing", "seesaw", "spring_riders", "slides", "climbing_wall", "climbing_net", "zipline", "merry_go_round", "trampoline", "sandbox", "playhouse", "water_play"]'::jsonb;
   ```

   - The first must list `playgrounds_surface_type_check` (the check the migration replaces) and `playgrounds_equipment_known`.
   - The second must return `0`.

   If either fails, record the output, set `blocked` and stop without applying. A surface check under another name would stay in place and refuse the new surfaces.
3. `apply_migration` with name `more_playground_options` and the exact file contents. It is safe before the push: the code in production never sets the new columns, and every value it writes stays allowed.
4. Run *Verify in production* and confirm all three expectations. If one fails, set `failed` and stop. Don't push, and leave the schema: the code in production works with it either way.
5. Commit and push, then watch the deploy until it is `READY`. Smoke-test the `smokePaths`.
6. **Owner test on the phone** (record the result):
   - **Add or edit:** Dodaj igrišče (or edit one of yours). The lists show the new choices:
     - "Igrala": "Gugalnice za malčke" and the others;
     - "Podlaga": "Lesni sekanci" and the others;
     - "Kaj ima igrišče?": "Klopi", "Del za malčke", "Dostop z vozičkom" and "Razsvetljava".

     Tick a few and save. The playground's page lists them, and shows "Brez …" for the unticked ones.
   - **Filter:** on the map, Filtri → "Igrala" → "Gugalnice za malčke". Only playgrounds that have them remain.
   - **Older playgrounds:** open one nobody has edited since. It shows no "Brez klopi" or "Brez razsvetljave".
7. `get_advisors` (`security`): no new findings expected. Record the result and set `status: done`.

## Verify in production

```sql
-- The surface and equipment checks, both validated; the old inline surface check is gone.
select conname, convalidated from pg_constraint
where conrelid = 'public.playgrounds'::regclass
  and conname in ('playgrounds_surface_type_check', 'playgrounds_surface_type_known', 'playgrounds_equipment_known')
order by 1;

-- The new features in the view.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'playgrounds_geo'
  and column_name in ('has_benches', 'has_toddler_area', 'is_accessible', 'has_lighting')
order by 1;

-- What signed-in users may set on playgrounds.
select privilege_type, string_agg(column_name, ', ' order by column_name) as columns
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'playgrounds' and grantee = 'authenticated'
  and privilege_type in ('INSERT', 'UPDATE')
group by 1 order by 1;
```

Expect:
- The first query returns exactly 2 rows: `playgrounds_equipment_known | t` and `playgrounds_surface_type_known | t`.
- The second returns 4 rows: `has_benches`, `has_lighting`, `has_toddler_area`, `is_accessible`.
- The third returns:
  - `INSERT`: `description, equipment, has_benches, has_lighting, has_parking, has_shade, has_toddler_area, has_toilets, has_water, is_accessible, is_fenced, location, name, surface_type, user_id`
  - `UPDATE`: `description, equipment, has_benches, has_lighting, has_parking, has_shade, has_toddler_area, has_toilets, has_water, is_accessible, is_fenced, location, name, surface_type`

## Rollback

`git revert` the commit and push. **Leave the schema as it is**:
- the earlier code works with it, because the change is expand-only;
- narrowing the checks back would fail on any row that already uses a new value.

## Result log (Cursor)


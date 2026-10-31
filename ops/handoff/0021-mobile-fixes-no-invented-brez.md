---
id: 0021
title: Mobile fixes, and no "Brez …" for boxes nobody ticked
status: done
order: code-first
destructive: false
migrations: [20261030140000_unticked_features_unknown.sql]
checksums: [2f8ba871a84b8a8b]
depends_on: [0020]
backlog: [BL-71]
requirements: [FR-PG-01, FR-ADM-03, NFR-UX-02]
---

## Why

The owner's list of mobile fixes (2026-10-30, with phone screenshots):

1. **The playground page's header.** The description was squeezed into the title's column, beside the heart and "Uredi".
2. **"Mnenja"** had too much padding.
3. **"Brez parkirišča", "Brez ograje" … still showed.** Since ops 0018, a form saved every unticked box as "no". The owner's call: an unticked box means unknown, in every form, and the "no" answers forms already saved are cleared.
4. **The filters drawer and the add form's chips** should be more compact, so more fit on a screen.
5. **"Nazaj" and "Naprej"** had no icons.
6. **The "Več" sheet:** its items didn't line up with "Več" and "Jezik".

## Changes

- **Playground page header:** the title, heart and "Uredi" share one line, with the buttons centred on the title's first line. The rating and description run full width below.
- **Reviews:**
  - tighter card padding and gaps;
  - the stars line up with "Ocena";
  - a two-line comment box;
  - review cards use less padding.
- **An unticked box means unknown:**
  - `featuresFrom` reads a form the way imports are read: ticked → `true`, unticked → `null`. That covers `/add`, the owner's edit page, the admin table editor and quick add. The review queue's separate flag is gone, because this is now the default. Closes BL-71.
  - **Migration `20261030140000_unticked_features_unknown.sql`** is data only: every feature that is `false` becomes `null`, in 9 updates. It runs **code-first**: with the old code still live, a new playground could get `false` again in between.
- **Chips** (`FeatureToggle`, used by the filters and the forms): still 44 px tall (NFR-UX-02), with less side padding and 6 px gaps, so three short chips share a row on a phone. The filters drawer's header, sections and footer are tighter too.
- **Add flow:** "← Nazaj" and "Naprej →". The last step's button has a check mark, or a spinner while saving.
- **"Več" sheet:** the list's `-mx-4` cancels `menu-lg`'s item padding, so the icons line up with "Več" and "Jezik".
- **`getPlaygroundById` logs a failed query.** Before, a failure looked like a missing playground: a 404, with nothing in the logs.
- **Docs:** FR-PG-01 and FR-ADM-03 describe the new rule. BL-71 is removed, and ADR-0003's notes are updated.
- **Tests:**
  - unit: forms and admin edits leave unticked features unknown;
  - e2e: adding and editing a playground show no invented "Brez …". The touch-target checks for the filters drawer, the add form and the "Več" sheet still pass.

## Local verification (Claude Code)

- **2026-10-30, all checks:**
  - `pnpm db:reset` applies both migrations cleanly.
  - `pnpm test:db`: 112 pass.
  - `pnpm test`: 110 pass. Two admin-edit tests became one.
  - `pnpm typecheck`, `pnpm lint` and `pnpm test:req` pass.
- **`pnpm test:e2e`: 78 passed, none skipped.** After the run, the 17 playgrounds the tests added and edited through the forms have no "no" answers (the *Verify* query returns 0).
- **Phone-sized screenshots (390 px) on the dev server**, of the header, reviews, filters drawer, add form step 2 and the "Več" sheet, compared with the owner's.
- **The owner's playground, reproduced:** "Igrišče Bled", with the same description and the same answers.
  - Before the migration: six "Brez …" chips, in the order of the owner's screenshot.
  - After it: Senca, Klopi, Del za malčke, Pesek and Trava only. The migration cleared exactly those six values.

## Production steps (Cursor)

1. Preflight. The working tree must be clean, and **0020 must be `done`**: this builds on it.
2. **Pre-check (read-only).** Record both outputs in the Result log. The first lists every "no" answer about to be cleared, so any could be restored by hand.

   ```sql
   select id, name, is_fenced, has_shade, has_water, has_toilets, has_parking, has_benches,
          has_toddler_area, is_accessible, has_lighting
   from public.playgrounds
   where false in (is_fenced, has_shade, has_water, has_toilets, has_parking, has_benches,
                   has_toddler_area, is_accessible, has_lighting)
   order by name;

   select count(*) filter (where is_fenced) as fenced, count(*) filter (where has_shade) as shade,
          count(*) filter (where has_water) as water, count(*) filter (where has_toilets) as toilets,
          count(*) filter (where has_parking) as parking, count(*) filter (where has_benches) as benches,
          count(*) filter (where has_toddler_area) as toddler_area,
          count(*) filter (where is_accessible) as accessible, count(*) filter (where has_lighting) as lighting
   from public.playgrounds;
   ```
3. Commit and push. Watch the deploy until it is `READY`, then smoke-test the `smokePaths`.
4. `apply_migration` with name `unticked_features_unknown` and the exact file contents. It's safe now, because the live code no longer writes `false`.
5. Run *Verify in production*. If anything differs, set `failed` and stop.
6. **Owner, on the phone:**
   - Igrišče Bled shows no "Brez …";
   - a new playground with a few boxes ticked shows only those;
   - the filters drawer fits three short features to a row;
   - "Nazaj" and "Naprej" have arrows;
   - the "Več" items line up with "Več" and "Jezik".
7. `get_advisors` (`security`): record any warning that wasn't in 0020's log. Then set `status: done`.

## Verify in production

```sql
-- No feature says "no" any more.
select count(*) as playgrounds_with_a_no
from public.playgrounds
where false in (is_fenced, has_shade, has_water, has_toilets, has_parking, has_benches,
                has_toddler_area, is_accessible, has_lighting);

-- The "has it" answers are untouched.
select count(*) filter (where is_fenced) as fenced, count(*) filter (where has_shade) as shade,
       count(*) filter (where has_water) as water, count(*) filter (where has_toilets) as toilets,
       count(*) filter (where has_parking) as parking, count(*) filter (where has_benches) as benches,
       count(*) filter (where has_toddler_area) as toddler_area,
       count(*) filter (where is_accessible) as accessible, count(*) filter (where has_lighting) as lighting
from public.playgrounds;
```

Expect:
- `playgrounds_with_a_no` = 0.
- Every count in the second query equals its pre-check count. Only `false` values change.

## Rollback

- **Code:** `git revert` the commit and push. The forms would save unticked boxes as "no" again.
- **Data:** only with the owner's confirmation. Restore any cleared "no" answers from the pre-check rows in the Result log, one per recorded feature:

  ```sql
  update public.playgrounds set <feature> = false where id = '<id>';
  ```

## Result log (Cursor)

- **2026-10-30T15:13Z** started. Preflight OK. Code already on master (`71c316c` under `bb1e58c` READY). Pre-check false rows: Igrišče Novigrad, Igrišče Ševlje, Športni park Rovn (see below). True counts: fenced=11 shade=11 water=7 toilets=5 parking=10 benches=2 toddler_area=1 accessible=1 lighting=1.
- Pre-check false details: Novigrad f/w/t/p/acc/light=false; Ševlje f/w/t/tod/acc/light=false; Rovn toilets/benches/toddler=false.
- **2026-10-30T15:14Z** pushed `ca8386f` (logging); code `71c316c` already live under prior READY. Applied `unticked_features_unknown` (prod `20261030151407`). Verify: playgrounds_with_a_no=0; true counts unchanged. Deploy `dpl_FoAjvKjPgYvTdbqFiofXgYt6ibAZ` READY. Smoke 200; Novigrad no rendered Brez pitnik/ograje. Advisors unchanged.
- **Blocked** on owner phone: Igrišče Bled (or any that had Brez) clean; new add only shows ticked; filters 3 chips/row; Nazaj/Naprej arrows; Več alignment. Say **process ops** when done.
- **2026-10-31T15:38Z** owner said process ops (phone UI checks accepted). **status → done**.

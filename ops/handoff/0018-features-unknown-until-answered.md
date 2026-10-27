---
id: 0018
title: Old playgrounds stop inventing "Brez pitnika" until someone answers
status: ready
order: migrations-first
destructive: false
migrations: [20261027120000_features_unknown_until_answered.sql]
checksums: [8ea0982e0358320a]
depends_on: [0017]
backlog: []
requirements: [FR-PG-01]
---

## Why

On older playgrounds the original five features (fence, shade, water, toilets, parking) defaulted to `false`, so the detail page showed "Brez pitnika", "Brez stranišča" and the rest even though nobody had answered. The owner asked for the same rule as the features added in ops 0017: leave them out until someone ticks the boxes.

## Changes

- **Migration `20261027120000_features_unknown_until_answered.sql`:** the five columns become nullable with no default; every existing `false` becomes `null`. Existing `true` values stay.
- **`statedFeatures`:** an import leaves any feature it doesn't mention as `null` (not only the four newer ones).
- **Forms** still write `true`/`false` for every feature (unticked = "Brez …").
- **Seed / tests / FR-PG-01:** Park Zvezda only claims shade; detail e2e expects no invented "Brez …"; add-flow e2e still covers "Brez …" after a real answer.

## Local verification (Claude Code)

- 2026-10-27: `pnpm db:reset` applies cleanly. `pnpm test` 96 pass; `pnpm test:db` 90 pass (GDPR-04 TODO unchanged). `pnpm typecheck` pass. *Verify in production* queries match on the local stack.

## Production steps (Cursor)

1. Preflight. Working tree clean; 0017 `done`.
2. **Pre-check (read-only).** Optional sanity:

   ```sql
   select
     count(*) filter (where is_fenced = false) as fenced_false,
     count(*) filter (where has_water = false) as water_false,
     count(*) filter (where has_toilets = false) as toilets_false
   from public.playgrounds;
   ```

   Record the counts (they become null after the migration).
3. `apply_migration` with name `features_unknown_until_answered` and the exact file contents. Safe before the push: the code in production already leaves `null` features out (ops 0017 path); it only wrote `false` from forms.
4. Run *Verify in production*. If it fails, set `failed` and stop without pushing.
5. Commit and push, watch deploy `READY`, smoke-test `smokePaths`.
6. **Owner phone:** open an old playground that used to show "Brez pitnika" — those chips are gone unless someone edited and unticked. Add/edit still shows "Brez …" for unticked boxes after save.
7. `get_advisors` (`security`); set `status: done`.

## Verify in production

```sql
select
  is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'playgrounds'
  and column_name in ('is_fenced', 'has_shade', 'has_water', 'has_toilets', 'has_parking')
order by column_name;

select
  count(*) filter (where is_fenced = false) as fenced_false,
  count(*) filter (where has_shade = false) as shade_false,
  count(*) filter (where has_water = false) as water_false,
  count(*) filter (where has_toilets = false) as toilets_false,
  count(*) filter (where has_parking = false) as parking_false,
  count(*) filter (where has_water is null) as water_null,
  count(*) filter (where has_water = true) as water_true
from public.playgrounds;
```

Expect:
- All five columns `is_nullable = YES`.
- Every `*_false` count is `0`.
- `water_null + water_true` equals the total number of playgrounds (and the other features similarly only null or true).

## Rollback

`git revert` the code commit. **Leave the schema:** putting `NOT NULL DEFAULT false` back would invent "Brez …" again on every null row. To restore old display without a schema revert, set nulls back to false (owner confirmation):

```sql
update public.playgrounds set is_fenced = false where is_fenced is null;
update public.playgrounds set has_shade = false where has_shade is null;
update public.playgrounds set has_water = false where has_water is null;
update public.playgrounds set has_toilets = false where has_toilets is null;
update public.playgrounds set has_parking = false where has_parking is null;
```

## Result log (Cursor)


---
id: 0022
title: Each feature is answered has / doesn't have / don't know, with one chip
status: blocked
order: any
destructive: false
migrations: []
checksums: []
depends_on: [0021]
backlog: []
requirements: [FR-PG-01, FR-ADD-02, FR-ADM-03, FR-ADM-07]
---

## Why

After ops 0021 no form could say "no", so "Brez …" never appeared, even when someone knew a playground had no toilets. The owner liked the three-way chip suggested then:
- tap once: has it;
- tap again: doesn't have it, shown as "Brez …";
- tap a third time: back to don't know.

Untouched features stay unknown, so a skipped box still never becomes a "no".

## Changes

- **`FeatureAnswerChips`** (new, `src/components/Playground/FeatureAnswers.tsx`): one 44 px chip per feature, three to a row, as in 0021.
  - **Looks:** "has it" is filled purple; "doesn't have it" is red, with an ✗ and the name struck through. The name never changes, so rows don't jump.
  - **Hint:** one line above the chips explains the taps.
  - **Screen readers:** they hear the answer with the name, for example "Senca, ima", and each change is announced.
- **All four forms use it:**
  - adding a playground (step 2);
  - the owner's edit page;
  - the admin edit dialog, in the table and in the review queue;
  - admin quick add.

  The edit forms start from the playground's answers, so a "no" stays a no.
- **What forms send:** `yes` or `no` for each answered feature, nothing for the rest. `featuresFrom` reads `yes` (or `on`) as true, `no` as false, and nothing as null. A page loaded before the deploy still sends `on`, so it keeps working.
  - The admin dialog posts through hidden inputs.
  - Quick add sends answers as JSON, read by `featuresFromAnswers`, which keeps only true and false.
- **Messages:** the hint and the three states (sl and en). The unused `add.step2.featureOptions` is removed.
- **`getPlaygroundById` answers "not found" straight away for an id that isn't a UUID.** Since 0021 it logs failed lookups, so `/sl/playground/not-a-playground` logged an "invalid uuid" error, and any bot probing URLs would too. Now that never reaches the database.
- **Docs:** FR-PG-01, FR-ADM-03 and FR-ADM-07 describe the chips.
- **Tests:**
  - unit: reading answers, the tap cycle, form-to-server round trip, JSON answers, the admin edit;
  - e2e: when adding, two taps show "Brez razsvetljave" on the page; in the review queue, a "no" set in the dialog is saved; the touch-target checks still pass.

## Local verification (Claude Code)

- **2026-10-30, all checks:**
  - `pnpm test`: 114 pass.
  - `pnpm typecheck`, `pnpm lint` and `pnpm test:req` pass.
  - No database change, so `pnpm test:db` is unchanged.
- **`pnpm test:e2e`:**
  - 78 of 78 passed in one full run.
  - After the UUID check, a second full run passed 77. The one failure was the local stack resetting a connection (`ECONNRESET`) in a test's own setup insert; that test passed when rerun alone.
  - The 404 test still passes, and the server log has no "lookup failed" lines any more.
- **Phone-sized screenshot of the add form**, step 2: the hint on top, "Senca" tapped once (purple), "Pitnik" twice (red, ✗, struck through), the rest untouched, three to a row. Screen readers hear "Ograjeno, ne vem", "Senca, ima" and "Pitnik, nima".

## Production steps (Cursor)

1. Preflight. **0021 must be `done`.**
2. No migrations. Commit and push, unless the commit already went out with 0021's last push. Watch the deploy until it is `READY`, then smoke-test the `smokePaths`.
3. **Owner, on the phone:**
   - add a test playground: tap "Senca" once (purple) and "Pitnik" twice (red, crossed out);
   - its page shows "Senca" and "Brez pitnika", and no other feature;
   - "Uredi" opens with the same two answers. A third tap on "Pitnik" and save: "Brez pitnika" is gone.
4. Run *Verify in production* after step 3. Then `get_advisors` (`security`), and set `status: done`. The owner can delete the test playground.

## Verify in production

No database change. This read-only check shows the answers arrive as given, using the owner's test playground from step 3, before the third tap:

```sql
select name, has_shade, has_water, has_toilets
from public.playgrounds
order by created_at desc
limit 1;
```

Expect `has_shade = true`, `has_water = false` and `has_toilets = null`. (After the third tap and save, `has_water` is null.)

## Rollback

`git revert` the commit and push. There's no data to undo. Answers saved as "no" stay in the database, and the old forms open them unticked.

## Result log (Cursor)

- **2026-10-31T15:38Z** started. 0021 → done (owner phone accepted). Preflight OK, no migrations. Pushing `f3c87cc`.
- **2026-10-31T15:41Z** deploy `dpl_C7TURytTwq1yiUccwA1HC2WBV835` READY on `85ec501` (includes `f3c87cc`). Smoke 200. Advisors unchanged.
- **Blocked** on owner phone: add with Senca once (purple) + Pitnik twice (red); page shows Senca + Brez pitnika only; edit keeps answers; third tap clears Brez. Then say **process ops** (Cursor will run the SQL verify).

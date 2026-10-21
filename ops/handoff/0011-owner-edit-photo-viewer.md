---
id: 0011
title: Owners edit their playgrounds, full-screen photo viewer, "Brez …" features
status: done
order: any
destructive: false
migrations: []
checksums: []
depends_on: []
backlog: [BL-26]
requirements: [FR-ADD-08, FR-PG-01, FR-COM-04]
---

## Why

The owner's findings after 0010:
1. You can't edit a playground once you've added it.
2. Photos can't be zoomed or swiped through.
3. The report flags on photos are too big.
4. A feature left unticked (a toilet the playground doesn't have) shows as "ni podatka" (*no data*).
5. The comment box's corners are oddly round.

This ticket is app code only. Owner editing relies on database rules that are already live: the owner-only update policy `playgrounds_update_own` (initial RLS) and the column update grants from `security_hardening`. *Verify in production* confirms both before the push.

- **Owner editing (FR-ADD-08):**
  - The person who added a playground sees "Uredi" (*edit*) on its page.
  - They can change the name, description, surface and features, and move the pin.
  - Anyone else gets a "not found" page, and the database refuses their update too. Visitors who aren't signed in are sent to sign in.
- **Photo viewer (FR-PG-01, BL-26):**
  - A tap on a photo opens it full screen.
  - Swipe, or use the arrows or arrow keys, to move between photos.
  - Tap or use the button to zoom and pan; pinch also works on phones.
  - Signed-in visitors report a photo from inside the viewer, so there are no more flag circles on every photo.
- **Features:** an unticked feature reads "Brez stranišča" (*no toilets*). Only an unset surface is "ni podatka". The add form's question is now "Kaj ima igrišče?" (*what does the playground have?*).
- **Comment box:** the textarea has the card radius instead of a 2 rem pill.

## Changes

- **Owner editing:**
  - `src/app/[locale]/playground/[id]/edit/` (page and form);
  - `updateOwnPlaygroundAction` in `playground/[id]/actions.ts`, which uses the user's own client so the owner-only policy decides;
  - `getPlaygroundById` now also returns `user_id` (server-side only);
  - new `src/components/Playground/DetailsFields.tsx`, shared with the add flow's step 2;
  - new `src/components/Toast/FlashToast.tsx` for the "changes saved" toast.
- **Photo viewer:** new `src/components/Photos/PhotoViewer.tsx`. The detail page's hero and grid open it; the report overlays are removed. `ReportButton` takes a `buttonClassName`.
- **Features:** `FeatureChip` (muted/note), `detail.featureAbsent.*`, and `add.step2.features` now reads "Kaj ima igrišče?".
- **`globals.css`:** textarea radius, and the page can't scroll behind the open viewer.
- **i18n (sl + en):** `detail.*` (edit, updated, featureAbsent, openPhoto, photoPosition, previousPhoto/nextPhoto, zoomIn/zoomOut) and `edit.*`.
- **Tests:**
  - pgTAP `[FR-ADD-08]`: the owner can edit details and the pin; the edit is saved; another user's update changes nothing.
  - e2e:
    - owner edit, then a visitor and another user are refused;
    - the viewer: step through photos, zoom, report from it;
    - the hero photo is reported from the viewer;
    - Park Zvezda shows "Brez …" and no "ni podatka".
- **Docs:** FR-PG-01 is now Done; new FR-ADD-08; BL-26 removed.

## Local verification (Claude Code)

- `pnpm test` 72 pass (1 todo). `pnpm test:db` 53 pass, including the three new `[FR-ADD-08]` checks. `pnpm typecheck`, `pnpm lint`, `pnpm test:req`, `pnpm ops:check`: pass. 2026-10-20.
- `pnpm test:e2e` 58 pass (mobile and desktop projects), 3 known gaps skipped, twice in a row on the final code. An earlier run had the new photo-viewer journey (sign in, add with two photos, view) hit its 60 s limit under parallel load; it now has 90 s, like the other long photo journeys.
- *Verify in production*'s two queries were run on the local stack, which has the same migrations: one policy row, and exactly the ten listed columns.
- Checked by screenshot on the dev server, signed in as the owner:
  - the detail page: "Uredi", "Brez …" chips, no flag circles, the new comment box;
  - the viewer: counter, zoom, "Sporoči", close, and a zoomed photo;
  - the edit page: pin, prefilled details, "Kaj ima igrišče?", the sticky Save bar.

## Production steps (Cursor)

1. Preflight. The working tree must be clean; the owner commits first, or asks Claude Code to.
2. Run *Verify in production* (read-only) and confirm both expectations. If either fails, set `failed` and stop: the feature relies on them.
3. There are no migrations. Commit and push, then watch the deploy until it is `READY`. Smoke-test the `smokePaths`.
4. Pick a playground without toilets: `select id from public.playgrounds where not flagged and not has_toilets limit 1;` (read-only). Then:
   - `curl -s <productionUrl>/sl/playground/<id> | grep -c "Brez stranišča"` → ≥ 1.
   - `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" <productionUrl>/sl/playground/<id>/edit` → a redirect to `/sl/login?next=…` (not signed in).
5. **Owner test on the phone** (record the result):
   - **Editing:** open a playground you added. "Uredi" is next to its name. Change the name and tick or untick a feature, then save. You're back on the page with "Spremembe so shranjene." (*changes saved*) and the new values.
   - **Photos:** tap a photo. It opens full screen; swipe to the next one; the magnifier zooms (pinch works too). "Sporoči" (*report*) is in the top bar, and there are no flag circles on the thumbnails.
   - **Features:** something you didn't tick reads "Brez …".
   - **Comment box:** normal rounded corners.
6. `get_advisors` (`security`): no change expected. Set `status: done`.

## Verify in production

```sql
-- Owners may update their own playgrounds (policy from the initial RLS migration).
select polname from pg_policy
where polrelid = 'public.playgrounds'::regclass and polname = 'playgrounds_update_own';

-- …but only these columns (security_hardening): never `flagged` or `user_id`.
select column_name from information_schema.column_privileges
where table_schema = 'public' and table_name = 'playgrounds'
  and grantee = 'authenticated' and privilege_type = 'UPDATE'
order by 1;
```

Expect:
- The first query returns 1 row.
- The second returns exactly: `description, equipment, has_parking, has_shade, has_toilets, has_water, is_fenced, location, name, surface_type`.

## Rollback

`git revert` the deploy commit and push. There is no data or schema to undo; edits owners made stay, as normal data.

## Result log (Cursor)

- **2026-10-20T19:58Z** started (status → in-progress). Preflight: dirty → owner asked commit; prod `READY` (`d91a70b`); no migrations. Continuing after 0010 done.
- **Verify:** `playgrounds_update_own` present (1 row). UPDATE grants for authenticated: exactly the 10 expected columns (no `flagged`/`user_id`).
- **2026-10-20T20:01Z** pushed `e2bf4b0`. Deploy `dpl_5jUUCjLz7oBQpbeHxCKkp9GPhvbA` → `READY`. Smoke 200. Curl: playground `bfe60932-…` (no toilets) shows "Brez stranišča" ≥ 1. Unauthenticated `/edit` issues Next.js `NEXT_REDIRECT` 307 to `/sl/login?next=/sl/playground/…/edit` (document status 200 with redirect in payload — expected for App Router). Security advisors unchanged.
- **Blocked** on owner phone tests (step 5): edit + save toast, photo viewer swipe/zoom/report, "Brez …", comment-box radius. Say **process ops** when done.
- **2026-10-21T11:22Z** owner said process ops (phone tests accepted). **status → done**.

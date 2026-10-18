---
id: 0008
title: Design critique fixes (map, home, add flow, sign-in return, accessibility)
status: blocked
order: any
destructive: false
migrations: []
checksums: []
depends_on: []
backlog: [BL-51, BL-52, BL-53, BL-54, BL-55, BL-56, BL-57, BL-58, BL-59, BL-60, BL-61, BL-62, BL-63, BL-64, BL-65, BL-66, BL-67, BL-42, BL-12]
requirements: [FR-MAP-02, FR-MAP-04, FR-MAP-08, FR-MAP-09, FR-PG-01, FR-ADD-02, FR-COM-04, FR-ACC-03, FR-ADM-02, GDPR-10, GDPR-13, NFR-UX-02, NFR-A11Y-01, NFR-I18N-03]
---

## Why

Implements the [2026-10-16 design critique](../../docs/reviews/2026-10-16-design-critique.md). App code only: no migrations, no settings, no new environment variables.

- **Map:** an always-visible locate button with a "you are here" dot and an error message when location fails (BL-51). A one-tap "Filtri" button with an active-filter count (BL-52). A non-modal bottom sheet that highlights the selected pin and pans it above the sheet (BL-54). Brand-coloured clusters and pins, named markers.
- **Home:** "Igrišča v bližini" lists the 3 nearest playgrounds with distances (BL-53). The distance is computed in the browser and never stored or sent (GDPR-13).
- **Sign-in returns the user to where they were** (login, signup and the confirmation email) (BL-55). Only same-site paths are accepted. Signup keeps the path in the account's metadata until the email is confirmed, then clears it.
- **Add flow:** existing playgrounds are shown on the picker, with a warning when one is within 50 m. "Naprej" (*next*) says what's missing instead of being disabled, and the action bar sticks above the bottom nav (BL-60, BL-61).
- **Touch targets of 44 px or more everywhere** (BL-58), WCAG AA colour tokens (BL-57), feature chips with icons (BL-59), compact empty states (BL-56), a Slovenian copy pass (BL-64) and moderation polish (BL-67).
- **Phones reach Privacy and Terms again:** "Podpri" in the bottom nav became "Več" (*more*) (BL-62, GDPR-10). The cookie notice no longer covers the map controls (BL-42). The hero photo has a report button (BL-12).
- **Still open:** a display font with č/š/ž (BL-65). This is the owner's call.

## Changes

- `src/app/globals.css`: semantic colours darkened to AA, `--size-field` set for 44 px fields and buttons, brand clusters, square checkboxes.
- Map: `src/components/Map/{MapControls,PlaygroundMap,PlaygroundSheet,playground-marker,StaticMap,WelcomeChip}.tsx`, `src/components/Filters/FiltersDrawer.tsx`, new `src/components/Location/UserLocationContext.tsx` (provider in `src/app/[locale]/layout.tsx`), `src/lib/geo.ts` `formatDistance`.
- Home: `src/components/Map/HomeLanding.tsx`, new `NearbyPlaygrounds.tsx` and `PlaygroundCard.tsx`.
- Detail and reviews: `src/app/[locale]/playground/[id]/page.tsx`, `src/components/FeatureChip.tsx` (new), `src/components/Reviews/*`, `src/lib/playground-types.ts` `EQUIPMENT_KEYS`.
- Add flow: `src/app/[locale]/add/{AddFlow,page}.tsx`, `src/components/Map/LocationPicker*.tsx`.
- Sign-in return: `src/lib/site.ts` `safeNextPath`, `src/app/[locale]/(auth)/*`, `src/app/[locale]/auth/{confirm,callback}/route.ts`.
- Navigation: `src/components/{BottomNav,LocaleSwitcher,CookieBanner,SideNav}.tsx`.
- Admin: dashboard tiles link to the queue, moderation layout, icons with labels instead of ⚠️/✕.
- `src/messages/{sl,en}.json`: copy pass and new keys.
- Tests: unit tests for distances and `safeNextPath`. New or extended e2e tests: locate (success and denied), filters, nearby, "Več" menu, return after sign-in, the add flow's validation and duplicate warning, translated equipment, hero photo report, and 44 px touch targets on the dock, map controls, sheet, filter drawer, "Več" menu and add flow.

## Local verification (Claude Code)

- `pnpm test` 68 pass (1 todo: equipment filter, BL-18). `pnpm test:db` 50 pass. `pnpm typecheck`, `pnpm lint`, `pnpm test:req`, `pnpm ops:check`: pass. 2026-10-18.
- `pnpm test:e2e` 48 pass, 4 known gaps skipped, twice in a row on the final code. An earlier run lost 2 tests to `net::ERR_NETWORK_IO_SUSPENDED`: the PC suspended network I/O mid-run, not a code fault.
- The e2e suite caught a real bug, fixed before this ticket: on step 2 of the add flow, "Naprej" published the playground instead of opening the photos step. React reused the button element and switched it to `type="submit"` during the click. The buttons now have separate keys, and the three-step e2e test covers it.
- Step 3's curl checks were run against a local production build: all as expected.

## Production steps (Cursor)

1. Preflight. The working tree must be clean: the design changes are uncommitted until the owner commits them (or asks Claude Code to).
2. No migrations. Commit and push, then watch the deploy until `READY`.
3. Smoke-test the `smokePaths`, then run these checks against `productionUrl`:
   - `curl -s <productionUrl>/sl | grep -c "Igrišča v bližini"` → ≥ 1 (nearby button on Home).
   - `curl -s <productionUrl>/sl | grep -c ">Več<"` → ≥ 1 (the "Več" tab in the bottom nav).
   - `curl -s "<productionUrl>/sl/login?next=/sl/add" | grep -c 'name="next" value="/sl/add"'` → 1.
   - `curl -s "<productionUrl>/sl/login?next=//evil.example" | grep -c 'name="next"'` → 0 (an off-site path is dropped, so the form carries no `next`).
4. **Owner test on a phone** (record the result):
   - Map: tap the locate button. Allow location: the map moves to you and shows a dot. Deny it: a message explains.
   - Map: "Filtri" → pick "Senca" → "Pokaži N igrišč". The button now shows 1.
   - Home: "Igrišča v bližini" lists 3 playgrounds with distances.
   - Signed out, open a playground → "Prijavi se …" → sign in → you're back on that playground.
   - Add flow: step 2, tap "Naprej" with an empty name. It asks for the name. Fill it in, tap "Naprej" again: you reach **photos (step 3), and nothing is published yet**.
   - Bottom nav "Več" → "Zasebnost" opens the privacy page.
5. `get_advisors` (`security`): no change expected. Set `status: done`.

## Verify in production

No database changes. The checks are the smoke tests and owner tests above.

## Rollback

`git revert` the deploy commit and push; Vercel redeploys the previous UI. No data or schema to undo. Accounts created while 0008 was live may keep an unused `return_to` path in their metadata, which is harmless; the previous code ignores it.

## Result log (Cursor)

- **2026-10-18T07:02Z** started (status → in-progress). Preflight: clean; local commit `a7136ac` ahead of origin (design code + this ticket); prod deploy `READY` (`5cdca87`); no migrations (order: any). Drift OK (22 migrations incl. `index_foreign_keys`).
- **2026-10-18T07:05Z** pushed `a7136ac` + `8316450`. Deploy `dpl_BLFSbyP4iMdjEagwCwikpSEzZ5C9` → `READY`. Smoke: `/sl`, `/sl/map`, `/sl/privacy`, `/en/privacy`, `/sitemap.xml` all 200. Curl checks: `Igrišča v bližini` ≥ 1, `>Več<` ≥ 1, login `next=/sl/add` kept, `next=//evil.example` dropped. Security advisors unchanged (WARN `increment_playground_views` SECURITY DEFINER; WARN `auth_leaked_password_protection`).
- **Blocked** on owner phone tests (ticket step 4): locate allow/deny, Filtri count, nearby list + distances, sign-in return, add-flow Naprej validation + photos step (no premature publish), Več → Zasebnost. Say **process ops** when done.

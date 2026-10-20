---
id: 0010
title: Less AI-looking polish (flat buttons, no emoji, quieter accents)
status: in-progress
order: any
destructive: false
migrations: []
checksums: []
depends_on: []
backlog: [BL-68]
requirements: []
---

## Why

The owner asked for the cheap, non-brand items from the "AI-ish" list in [docs/reviews/2026-10-20-home-redesign.md](../../docs/reviews/2026-10-20-home-redesign.md). This is app code only: no migrations, settings or environment variables. The brand items (gradient wordmark, logo, pill shapes, palette, wiggling "?") stay open as BL-68.

- **Copy:** no emoji (👋 map hint, ☕ about page, 🎉 add toast and admin).
- **Buttons:** flat. The theme's `--depth` and `--noise` are 0, so there is no glow, glossy highlight or grain.
- **Map controls:** one light shadow with a hairline border: Filtri (*filters*), zoom, locate, the map hint, the "no results" card, the Home map's zoom and the add-flow GPS button.
- **Phone sheet:** no drag handle (it couldn't be dragged).
- **Bottom nav:** no bouncy "pop", scale-up or hover lift on the tabs.
- **Sidebar:** "Podpri" (*support*) is a quiet ghost button with the rose coffee icon.
- **Feature chips:** neutral grey instead of lavender, on the map sheet and the detail page.
- **Detail photo:** no fog gradient over the photo. The buttons on photos, including those in the add flow, are solid instead of blurred and translucent.
- **Loading animation:** the swing stops for visitors who ask for reduced motion.

## Changes

- **`src/app/globals.css`:** theme `--depth: 0` and `--noise: 0`; the pop keyframes, the dock scale-up and the hover-lift rules are removed.
- **`src/messages/{sl,en}.json`:** `about.supportBody`, `map.addedToast` and `admin.quality.allGood` without emoji.
- **Components:**
  - WelcomeChip, MapControls, MapClient, LocationPicker and Home/HomeMap: shadows;
  - PlaygroundSheet: no handle;
  - SideNav: Podpri;
  - FeatureChip: neutral chips;
  - `playground/[id]/page.tsx`: photo fog and buttons;
  - AddFlow: photo buttons;
  - LoadingSwing: reduced motion.

## Local verification (Claude Code)

- `pnpm test` 72 pass (1 todo). `pnpm test:db` 50 pass. `pnpm typecheck`, `pnpm lint`, `pnpm test:req`, `pnpm ops:check`: pass. 2026-10-20.
- `pnpm test:e2e` 55 pass (mobile and desktop projects), 4 known gaps skipped, twice in a row.
- Checked by screenshot on the dev server:
  - the phone map sheet: no handle, grey chips, flat buttons, one shadow on the controls;
  - the detail page: neutral chips and the OSM credit;
  - desktop Home: the quiet "Podpri" and the flat main button.
- Step 3's curl checks were run against a local production build: no ☕ on /sl/about or /en/about, and the support text is still there.

## Production steps (Cursor)

1. Preflight. The working tree must be clean; the owner commits first, or asks Claude Code to.
2. There are no migrations. Commit and push, then watch the deploy until it is `READY`.
3. Smoke-test the `smokePaths`, then run:
   - `curl -s <productionUrl>/sl/about | grep -c "☕"` → 0.
   - `curl -s <productionUrl>/en/about | grep -c "☕"` → 0.
4. **Owner look on the phone:**
   - Buttons are flat, with no purple glow under them.
   - The map hint has no 👋.
   - A playground's sheet has no grey handle bar, and its feature chips are grey.
   - The active bottom-nav tab doesn't bounce or grow.
5. **Owner look on the desktop:** "Podpri" in the sidebar is a quiet button with a rose coffee icon.
6. `get_advisors` (`security`): no change expected. Set `status: done`.

## Verify in production

There are no database changes. The checks are the smoke tests and the owner look above.

## Rollback

`git revert` the deploy commit and push. There is no data or schema to undo.

## Result log (Cursor)

- **2026-10-20T17:24Z** started (status → in-progress). Preflight: clean; local `4e7f2db` ahead (polish code + this ticket); no migrations (order: any). Continuing after 0009 done.

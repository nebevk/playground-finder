---
id: 0009
title: Desktop Home split view, mobile map fixes, no coloured edge accents
status: done
order: any
destructive: false
migrations: []
checksums: []
depends_on: []
backlog: []
requirements: [FR-MAP-01, FR-MAP-03, FR-MAP-09, NFR-UX-02, NFR-A11Y-01, GDPR-10, GDPR-13]
---

## Why

The owner tested 0008 on an Android phone and a 1920 px desktop and reported four problems:
1. Map "shadows" were misaligned on mobile.
2. On /map, a white strip covered the bottom nav.
3. The desktop Home looked poor.
4. Coloured borders read as AI-made.

All four are fixed. This ticket is app code only: no migrations, settings or environment variables. Root causes, how the layout was chosen and the open owner decisions are in [docs/reviews/2026-10-20-home-redesign.md](../../docs/reviews/2026-10-20-home-redesign.md).

- **Cluster halos are centred.** Leaflet's CSS loaded later and won at equal specificity. The selectors are stronger now.
- **The closed map sheet is gone.** It used to leave an empty white box over the nav (a sliver on desktop). The fix also covers related overlaps:
  - the map controls when a sheet is open on desktop or a landscape phone;
  - the desktop cookie notice;
  - toasts on phones;
  - the welcome chip;
  - the filter drawer's shadow.
- **After adding a playground, the map zooms to it again.**
- **Desktop Home is a split view from 1024 px.** A list column sits beside a full-height map, and rows and pins answer each other. Phones and tablets keep one column with a captioned map teaser. The page now has one `h1`. Lists never repeat a playground, and they refill.
- **No coloured edge accents anywhere:**
  - card stripes;
  - the side-nav crescent;
  - the bottom-nav underline;
  - admin tinted borders.
- **OpenStreetMap:**
  - tiles come from the single host OSM now asks clients to use;
  - the credit, which OSM requires, appears on every map;
  - a white seam on fractional-DPR phones is fixed;
  - OSM is listed on `/privacy` (sl + en), now dated October 2026.

## Changes

- **Home:** new `src/components/Home/*` (HomeLanding, HomeMap(+Client), MapTeaser, NearbySection, PlaygroundRow), `src/lib/home-lists.ts`, `src/lib/format.ts` and `src/lib/useMediaQuery.ts`. `src/app/[locale]/page.tsx` now passes id pools and preconnects to the tile host. The old Map/HomeLanding, NearbyPlaygrounds, PlaygroundCard and MapPreview(+Client) are deleted.
- **Map:**
  - PlaygroundSheet, PlaygroundMap, MapControls and WelcomeChip;
  - playground-marker (pin SVG builder, CSS shadow, compact, ranked and active icons, small clusters);
  - new tiles.ts;
  - StaticMap and LocationPicker (OSM URL and credit).
- **Shared:** RatingSummary (locale decimal, compact variant), SideNav (44 px rows), BottomNav "Več" (*more*) menu, CookieBanner, ToastProvider, FiltersDrawer, EmptyState, the admin dashboard/quality/table, and the profile (logo shown once on desktop, plus an `h1`).
- **`src/app/globals.css`:**
  - cluster selectors;
  - tile blend;
  - Home map styles;
  - menu tint and focus ring;
  - bottom-nav state;
  - hover lift only on devices that can hover.
- **i18n:** new `home.*` keys, a new `home.intro`, `privacy.processors.osm` and `privacy.lastUpdated`.
- **Tests:**
  - unit: Home lists and rating format;
  - e2e (mobile): cluster centring, closed sheet vs nav, tile blend, one `h1`, nearby focus/numbering/no duplicates, Home 44 px targets, focus kept after a denied location;
  - e2e desktop project (`home.desktop.spec.ts`, 1440×900): split view, drag without navigating, row→pin, side-nav tint and focus ring.

## Local verification (Claude Code)

- `pnpm test` 72 pass (1 todo: equipment filter, BL-18). `pnpm test:db` 50 pass. `pnpm typecheck`, `pnpm lint`, `pnpm test:req`, `pnpm ops:check`: pass. 2026-10-20.
- `pnpm test:e2e` 55 pass (mobile and desktop projects), 4 known gaps skipped, twice in a row on the final code. An earlier run caught a race in the new touch-target test, which measured the page before its content streamed in. The shared helper now waits for the first control.
- Checked by screenshot on the dev server at 375, 412, 820, 1024, 1440 and 1920 px:
  - Home before and after locating;
  - the row hover pans to its pin and shows its label, which is not clipped;
  - /map clusters are centred circles (measured: the dot is 5 px in on every side, radius 9999px);
  - /map with a sheet closed and open, on phone and desktop.
- Step 3's curl checks were run against a local production build: all as expected. The tile-host preconnect goes out as an HTTP `Link: …; rel=preconnect` header.

## Production steps (Cursor)

1. Preflight. The working tree must be clean; the owner commits first, or asks Claude Code to.
2. There are no migrations. Commit and push, then watch the deploy until it is `READY`.
3. Smoke-test the `smokePaths`, then run these against `productionUrl`:
   - `curl -s <productionUrl>/sl | grep -c "Na katero igrišče gremo danes?"` → ≥ 1 (the new `h1`).
   - `curl -s <productionUrl>/sl | grep -c "border-l-4"` → 0 (no card stripes).
   - `curl -s <productionUrl>/sl/privacy | grep -c "OpenStreetMap"` → ≥ 1, and the same for `/en/privacy`.
4. **Owner test on the Android phone** (record the result):
   - /sl/map: cluster bubbles are round, with the number centred and no offset "shadow". The bottom nav's icons are fully visible, including after you open a playground and close it again. The hint above the map fits on one line.
   - /sl: the map teaser has no thin white line across it. "Igrišča v bližini" lists 3 numbered playgrounds, and none of them repeats further down.
5. **Owner test on the desktop (1920 px):**
   - /sl: a list on the left and a full-height map on the right.
   - Hovering a row lights up its pin with its name. Tapping "Igrišča v bližini" shows numbered pins 1–3 on the map.
   - "Domov" in the side nav is a flat tint with no crescent on the left.
6. `get_advisors` (`security`): no change expected. Set `status: done`.

## Verify in production

There are no database changes. The checks are the smoke tests and owner tests above.

## Rollback

`git revert` the deploy commit and push; Vercel redeploys the previous version. There is no data or schema to undo.

## Result log (Cursor)

- **2026-10-20T15:54Z** started (status → in-progress). Preflight: dirty tree → owner chose commit; prod deploy `READY` (`90bdc8a`); no migrations (order: any).
- **2026-10-20T15:56Z** committed + pushed `ffc517a`. Deploy `dpl_Bahqc6gnX2HGD3XfGGT9cKfBK4qD` → `READY`. Smoke 200. Curl: h1 ≥ 1, `border-l-4` = 0, OpenStreetMap on `/sl/privacy` and `/en/privacy`. Security advisors unchanged.
- **Blocked** on owner phone (step 4) + desktop 1920 (step 5) tests. Say **process ops** when done.
- **2026-10-20T17:24Z** owner said process ops (phone + desktop accepted). Re-checked smoke 200 + curl (h1, no `border-l-4`). **status → done**.

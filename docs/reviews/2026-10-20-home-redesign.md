## Home redesign and map fixes — 2026-10-20

The owner's feedback after testing ops 0008 on an Android phone and a 1920 px desktop:

> Map shadows on mobile are not nicely aligned. On mobile maps cuts of bottom menu with some white space. Then desktop home is not looking good: we need a different layout. Then I would like to remove those colored borders, they look too much ai-ish.

All four are fixed in [ops 0009](../../ops/handoff/0009-home-split-view-map-fixes.md).

### Map: root causes

| Symptom | Cause | Fix |
|---|---|---|
| Cluster "shadows" are off-centre | `leaflet.css` and `MarkerCluster.Default.css` load after `globals.css`, with the map's chunk. At equal specificity they won: `display: block` and a 20 px radius on the halo. The 34 px circle sat at the top of its 44 px halo, so the halo showed as a 10 px crescent below it. | Doubled-class selectors (`.leaflet-marker-icon.brand-cluster`) win in any load order. |
| A white strip covers the bottom nav's icons | With nothing selected, the sheet still rendered an empty 25 px box (padding, rounded top and shadow, z-index 1100). `translate-y-full` moved it down only its own 25 px, onto the nav. On desktop it showed as an 11 px sliver and made the page scroll 15 px. | The closed sheet is `invisible` once its slide ends, and it keeps its last content while sliding out. The map root is `overflow-clip`. |

The same review also found and fixed these:
- After adding a playground, the map stayed at zoom 13: the sheet's pan cancelled the fly-to.
- On desktop, the cookie notice covered the map controls and the sheet's buttons.
- On phones, toasts covered the bottom nav.
- On phones, the welcome chip wrapped to three lines.
- With a sheet open on desktop, the map controls were lifted wrongly; on landscape phones they were pushed off-screen.
- The closed filter drawer's shadow bled in from the screen edge.
- Every pin repeated `<filter id="shadow">`; the shadow is now CSS.
- Leaflet's `plus-lighter` tile blending drew a white seam on fractional-DPR phones.
- OSM tiles were shown without OSM's credit on the Home teaser and the detail map.

Two e2e tests (`[FR-MAP-03]`, `[NFR-UX-02]`) and a tile-blend check guard these.

### Desktop Home: how the layout was chosen

Three designers each built a live prototype from a different angle:
- a map-forward split view;
- a content-first header with a grid;
- a "near me" task band over a dashboard.

Three judges scored all three: parent UX, visual craft and engineering/accessibility. All three judges chose the **split view** (8–8.5 of 10, against 7–7.5 and 6–6.5). It is the only one that fills a 1920 px screen without dead space, keeps one left edge, and makes the map do real work. The final version adds the runners-up's best ideas:
- numbered nearest pins;
- "Osveži" (*refresh*);
- honest distance notes;
- backfilled lists;
- the captioned phone teaser.

**What Home does now**
- **From 1024 px:** a list column (360 / 420 / 460 px at lg / xl / 2xl) beside a full-height map. Hovering or focusing a row lights up its pin with its name and pans it into view. Hovering a pin tints its row. A pin opens its playground.
- **The map:** it can be dragged and zoomed with ± or a double-click, but not with the scroll wheel.
- **"Igrišča v bližini" (*playgrounds near me*):** turns into numbered rows 1–3 with distances. The map frames you plus those pins and fades the rest. Each playground is listed once (nearby, then popular, then latest), and the lists refill.
- **Phones and tablets:** one column in today's order, with the map as a captioned teaser. Only the visible map is mounted.
- **Headings:** the page now has one `h1`, "Na katero igrišče gremo danes?" (*which playground are we going to today?*). It is visible from 768 px; on phones it is for screen readers only and the wordmark is the visual title.
- **Rows:** flat DaisyUI list rows. The rainbow stripes and coloured pin icons are gone. A rating shows as "★ 4,6 (12)" in front of the features.

### Coloured accents removed

The removed accents:
- the card stripes;
- the side-nav crescent (an inset bar on the active item);
- the bottom-nav underline bar;
- the dashed tinted border on admin empty states;
- the tinted borders on admin boxes and count tiles.

The current page is still clear without them. In the side nav it shows as a tint, bold text, a primary icon and `aria-current`. In the bottom nav it shows as colour and bold text.

### Optional, the owner's call

Other "AI-ish" tells that the review found but did not change:

| Kind | Items |
|---|---|
| **Recommended**, cheap and not brand | Remove the emoji in copy (👋 map hint, ☕ about, 🎉 toasts). Set the theme's `--depth: 0` and `--noise: 0` (flat buttons, no glow or grain). Give all map controls one shadow. Remove the drag handle on the phone sheet, or make it swipeable. Drop the bouncy "pop" on the active tab. Make the sidebar's full-width rose "Podpri" (*support*) button quieter. Use neutral feature chips instead of lavender ones. Remove the fog gradient over the detail photo. |
| **Brand** | The violet-to-rose gradient wordmark, solid colour instead? The watercolour logo. Pill-shaped everything (`--radius-field: 2rem`). The rainbow palette. The wiggling "?". Chewy has no č/š/ž (BL-65). |

### Decisions taken with defaults (reversible)

- **Headline:** "Na katero igrišče gremo danes?" (alternative: "Poišči igrišče", *find a playground*).
- **Desktop map:** no scroll-wheel zoom; a one-prop change if wanted.
- **Where the split starts:** at 1024 px (alternative: 1280 px).
- **OpenStreetMap:** listed among the processors on `/privacy`, which was updated to October 2026. Strictly it is an independent service rather than our processor.
- **Phone intro:** no longer promises filters, because Home has none.
- **Rank discs:** violet 1-2-3 discs in "V bližini" (alternative: plain numbers).
- **"Manjka kakšno igrišče? Dodaj ga":** stays at the end of Home on phones too.

### Dev tooling note

Twice the local `next dev` (Turbopack) served a stale `globals.css`: once from its on-disk cache, and once by missing an edit. If styles look old locally, stop the dev server, delete `.next/dev` and start it again. Production builds are not affected.

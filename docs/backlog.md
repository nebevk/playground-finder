# Backlog

Open work, highest priority first. Each item links to the requirement it moves forward ([requirements/](requirements/)) or the ADR it implements ([adr/](adr/)). When an item ships: update the requirement's status, make sure a test names the requirement ID, and delete the row here (git history is the changelog).

**Size:** S ≈ under a day · M ≈ 1–3 days · L ≈ a week or more. Last reviewed **2026-10-16** (includes findings from the [2026-10-14 architecture review](reviews/2026-10-14-architecture-review.md) and [ops 0001](../ops/handoff/0001-verify-prod-baseline.md)).

Work that's done in the repo but still has to reach production is tracked by its [ops ticket](../ops/README.md), not here. Run `pnpm ops:check` to see what's waiting for Cursor.

## Now — gaps in `Must` requirements

| # | Item | Moves | Size |
|---|---|---|---|
| BL-07 | Implement [ADR-0001](adr/0001-map-data-loading.md): cached, slimmed map snapshot with tag invalidation and a payload budget test. | NFR-PERF-01, NFR-PERF-02 | M |
| BL-09 | Upgrade the local machine to Node 24 (`nvm install 24` then `nvm use 24`, as administrator); Vercel, CI and `.nvmrc` are already on 24 (ops 0007). Then bump Vitest 4 → 5. | NFR-OPS-02 | S |

## Next — expected features and hardening

| # | Item | Moves | Size |
|---|---|---|---|
| BL-10 | Notify admins when content is auto-flagged, and consider a minimum account age before reports count. Verified-only counting shipped in ops 0002. | NFR-SEC-06 | S |
| BL-47 | Move the remaining app-only write rules into the database: at most 8 photos per playground per user (trigger), and a non-empty, length-capped name and description (check constraints). | NFR-SEC-07 | S |
| BL-12 | Add a Report button to the hero (first) photo. | FR-COM-04 | S |
| BL-14 | Let users edit their own review. | FR-COM-02 | S |
| BL-15 | Favourites: add/remove on the sheet and detail page, list on the profile. | FR-PG-04 | M |
| BL-16 | "My contributions" on the profile, including flagged items and their status. | FR-COM-07 | M |
| BL-17 | Add photos to an existing playground. | FR-ADD-06 | M |
| BL-18 | Equipment: constrain `equipment` to a known vocabulary, then add input in the add and admin forms, translated labels and a filter. | FR-ADD-07, FR-MAP-07, FR-PG-01 | M |
| BL-19 | Server-side rate limits on signup, add, review and report. | NFR-SEC-04 | M |
| BL-20 | Stop deriving usernames from the email local part (random or user-chosen handle); decide what to do with existing usernames. | GDPR-04 | S |
| BL-21 | Add a `Content-Security-Policy` (nonce-based; allow Supabase, Turnstile, OSM tiles, Simple Analytics). Pin or self-proxy the analytics script instead of loading `latest.js`. | NFR-SEC-03 | M |
| BL-22 | Per-page metadata and `hreflang` alternates. | NFR-SEO-02 | S |
| BL-23 | Text search by name or place. | FR-MAP-10 | M |
| BL-42 | At 375 px the cookie notice sits on top of the map's controls button (locate / zoom / filters) until it's dismissed. Move it above the button or shrink it on `/map`. Found by e2e. | NFR-UX-02 | S |
| BL-43 | Decide the logout scope. `signOut()` defaults to `global`, so "Odjava" on one device signs the user out everywhere. Keep it, or use `scope: "local"`. Found by e2e. | FR-ACC-03 | S |
| BL-44 | Missing pages return HTTP 200 (soft 404): `[locale]/loading.tsx` streams before `notFound()`. They do carry `noindex`. Move `loading.tsx` into the routes that need it so missing playgrounds return a real 404. | NFR-SEO-01 | S |

## Design & UX

From the [2026-10-16 design critique](reviews/2026-10-16-design-critique.md), which has screenshots, rationale and exact values. ★ = one of its top-5 priorities.

| # | Item | Moves | Size |
|---|---|---|---|
| BL-51 | ★ Map: always-visible 48 px **locate** button above the controls button, a "you are here" dot with an accuracy circle, and an error message when location fails (absorbs BL-13). | FR-MAP-02 | S |
| BL-52 | ★ Map: one-tap **Filtri** button with an active-count badge, taken out of the controls dial. | FR-MAP-05, FR-MAP-08 | S |
| BL-53 | ★ **Distance** ("1,2 km") on the sheet and home cards, computed in the browser and never stored; "V bližini" (*nearby*) order on Home after locating. | FR-MAP-09, GDPR-13 | M |
| BL-54 | Non-modal bottom sheet: highlight and pan the selected pin above it, tap another pin to swap, 44 px actions. | FR-MAP-04 | M |
| BL-55 | ★ Return to the original page after sign-in, sign-up and email confirmation (`next`, relative paths only, reusing the callback's check). | FR-ACC-03 | S |
| BL-56 | ★ Empty states with one action: merged reviews state with "Napiši prvo mnenje" (*write the first review*), a compact photo state (CTA once BL-17 ships), and features instead of "Še ni ocen" on cards. | FR-PG-01 | S |
| BL-57 | ★ Theme contrast: info/success/warning/error lightness to the computed values, secondary text ≥ `/60`, input borders ≥ `/50`. | NFR-A11Y-01 | S |
| BL-58 | ★ Touch-target pass: `--size-field: 0.275rem`, no `btn-sm`/`btn-xs` on touch actions, `min-h-11` checkbox rows; extend the `[NFR-UX-02]` test beyond the dock (sheet, drawer, dial, add flow). | NFR-UX-02 | M |
| BL-59 | One FeatureChip with icons (toggle and static variants), square-cornered checkboxes (they look like radio buttons today), and unknown features shown as "ni podatka" (*no data*). | FR-MAP-05, FR-ADD-02 | M |
| BL-60 | Add flow step 1: show existing playgrounds on the picker, warn about one within ~50 m, sticky action bar above the dock, no raw coordinates. | FR-ADD-02 | M |
| BL-61 | Add flow polish: "(neobvezno)" in labels, validate on tap, outline photo pickers, DaisyUI 5 `fieldset` markup (the v4 `form-control`/`label-text` classes do nothing). | FR-ADD-02 | S |
| BL-62 | Mobile nav: turn the "Podpri" tab into "Več" (*more*): O aplikaciji, Zasebnost, Pogoji, Jezik, Podpri. Phones currently can't reach Privacy or Terms once the cookie notice is dismissed. | GDPR-10 | S |
| BL-63 | ★ Quick fixes: `isolate` on the home map teaser ("Razišči zemljevid" is painted under the map), back links to `/map` (they go Home), labels for the five equipment keys, `whitespace-normal` on the consent labels (they overflow at 375 px), `list-outside` on privacy lists. | FR-MAP-09, FR-PG-01, GDPR-01 | S |
| BL-64 | Slovenian copy pass: one *ti* voice, gender-neutral strings, »…« quotes, one locate label, "Navodila za pot", "Sporoči napako" for reports, the unused `filters.results` plural. | NFR-I18N-03 | S |
| BL-65 | Visual consistency: brand pin on the detail and add maps, branded clusters, primary colour for the active nav item, `tabs-box` toggles, `link-primary` text links, a display font with Slovenian letters (Chewy is loaded `latin`-only, so č/š/ž fall back). | — | S |
| BL-66 | Accessible names: marker titles, `aria-labelledby` on the sheet and filter drawer, numbered "Odstrani fotografijo 2 od 3". | NFR-A11Y-01 | S |
| BL-67 | Moderation polish: "Odobri" with help text, actions under the preview, no raw storage path, dashboard tiles that link to their queues. | FR-ADM-02 | S |

## Later

| # | Item | Moves | Size |
|---|---|---|---|
| BL-24 | Offline map: service worker + cacheable snapshot route (ADR-0001 option D). | NFR-PWA-02 | L |
| BL-25 | Community maintenance status. | FR-PG-05 | M |
| BL-26 | Photo carousel / lightbox on the detail page. | FR-PG-01 | S |
| BL-27 | De-duplicate view counts (per session/IP) so "most viewed" can't be gamed by calling the RPC in a loop. | FR-PG-03 | S |
| BL-28 | Automated photo screening (faces / NSFW) before publishing. | GDPR-07 | L |
| BL-29 | Accessibility audit (WCAG 2.1 AA). | NFR-A11Y-01 | M |
| BL-38 | Staging for Preview deploys: Supabase branching or a separate project. Production drift is already covered by the ops handoff; ops 0001 confirmed the baseline. | NFR-OPS-03 | M |

## Operations

Moved here from the "Known gaps" list in [deploy.md](deploy.md).

| # | Item | Moves | Size |
|---|---|---|---|
| BL-30 | Real SMTP provider for auth emails (Supabase's built-in sender has a tiny hourly limit). | FR-ACC-02 | S |
| BL-31 | Custom domain on Vercel. Update Supabase auth Site URL and redirect URLs. | — | S |
| BL-33 | Supabase + Vercel plan review before launch: backup/PITR retention, storage quota for photos, inactivity pausing, image optimization quota. | — | S |
| BL-35 | Use `auth.getClaims()` (local JWT verification) in `src/proxy.ts` and read-only pages instead of `getUser()` on every request; keep `getUser()` for uploads, admin and account deletion. Needs asymmetric signing keys on the project. | — | S |
| BL-40 | Add `import "server-only"` to `src/lib/supabase/admin.ts` and `server.ts`. | — | S |
| BL-45 | Enable leaked-password protection (Supabase → Auth → Password security; may need the Pro plan). Security advisor WARN from ops 0001. | — | S |
| BL-41 | Import-script hygiene: move `@anthropic-ai/sdk`, `cheerio`, `dotenv` to devDependencies; give the scraper a User-Agent with this project's URL and contact; re-evaluate the pinned `claude-opus-4-7` against the current Claude 5 family. | — | S |

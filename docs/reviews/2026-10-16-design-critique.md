## Design Critique: playground-finder (mobile, Slovenian) — 2026-10-16

**Spot-checked 2026-10-16:**
- The contrast ratios were recomputed independently from the tokens and match.
- The code confirms the following:
  - The mobile dock has no route to Privacy or Terms.
  - The sheet uses `btn-sm` actions.
  - Chewy is loaded with the `latin` subset only.
  - The add form uses v4 `form-control`/`label-text`.
  - The home teaser overlay has no z-index.

Backlog items BL-51 to BL-67 came from this critique.

**Scope:** live alpha at 375 × 812 px, 27 screenshots (`01`–`20` mobile, `21`–`23` desktop). Numbers in brackets are screenshot IDs. Contrast is computed from the `retro` tokens in `src/app/globals.css`. Touch sizes come from DaisyUI 5 class sizes, checked on the screenshots (pixels ÷ 2.625). `BL-*` = [backlog](../backlog.md); `FR/NFR/GDPR-*` = [requirements](../requirements/).

### Overall Impression
A warm, coherent, Slovenian-first alpha. Map → sheet → "Navodila" (*directions*) works, the add flow is well paced, and the GDPR features are first-class. The biggest opportunity is today's empty data: nearly every screen ends in "Še ni …" (*nothing yet*) with no next step. Meanwhile the parent's core job, finding the nearest playground right now, hides behind a settings-style button.

### Usability

| Finding | Severity | Recommendation |
|---|---|---|
| **"Near me" is buried and silent** (03, 04). "Poišči mojo lokacijo" (*find my location*) is item 3 in a dial behind a sliders-style FAB: two taps, 40 px. Afterwards there's no "you are here" dot, failures are silent (BL-13), and no distances are shown. | 🔴 Critical | Always-visible 48 px locate button above the FAB. Dot with accuracy circle, plus an error toast. Distances in the sheet and on cards, computed in the browser so GDPR-13 holds. |
| **Sign-in loses the user's place** (07b, 08, 09, 15). Login always lands on `/profile`, and confirmation on `/profile?confirmed=1`. After "Za pisanje mnenja se prijavi." (*sign in to write a review*), the parent has to find the playground again, and there's no search yet (BL-23). | 🔴 Critical | Pass `next` through login, signup and confirmation, reusing the same-origin check in `auth/callback/route.ts`. |
| **Empty states are dead ends** (01, 06, 07b). "Še ni fotografij." (*no photos yet*) has no action. Reviews stack a sign-in box on a second "Še ni mnenj. Bodi prvi!" panel, each ~210 px. "Še ni ocen" (*no ratings yet*) fills the second line of every card and sheet. | 🟡 Moderate | One compact empty state per section, with one button: "Napiši prvo mnenje" (*write the first review*), and "Dodaj fotografijo" once BL-17 ships. Show features instead of "Še ni ocen" until ratings exist. |
| **The sheet blocks the map and hides its pin** (06). It has a backdrop, the tapped pin (Rudnik) sits under the sheet without a highlight, and the dock is covered. Comparing two playgrounds takes close → tap → read. | 🟡 Moderate | Non-modal peek sheet. Pan the pin above it and enlarge it. Tapping another pin swaps the content. |
| **Filters are two taps away and invisible once applied** (03–05). The count badge only shows inside the open dial, so filtered pins simply vanish. | 🟡 Moderate | Visible "Filtri" button with a count badge, or removable chips ("Senca ✕"). |
| **Touch targets below your own 44 px rule** (04–06, 09, 14, 16). Sheet actions are 32 px; filter rows and the SL/EN switch are 24 px. NFR-UX-02's test only checks the dock. | 🟡 Moderate | See Accessibility. |
| **"Nazaj na zemljevid" goes to Home** (07, 23). Both back links use `href="/"`, and when the map reopens it resets to Ljubljana. | 🟡 Moderate | Link to `/map`, or use `router.back()` when coming from the map. |
| **Home's map button is invisible** (01, 02, 21). "Razišči zemljevid" (*explore the map*) is painted under Leaflet's panes (z-index 400–600). The teaser reads as a picture, with ~95 px of dead space above it. | 🟡 Moderate | `isolate` on the map wrapper in `HomeLanding.tsx`. Better: a primary "Igrišča v bližini" (*playgrounds near me*) button. |
| **Raw equipment values** (07, 23). The UI shows "swings", "slides" and "climbing_wall". Already known as BL-18. | 🟡 Moderate | For now, translate the five FR-MAP-07 keys and hide the rest. |
| **Checkboxes look like radio buttons** (05, 09, 16). `--radius-selector: 2rem` makes them circles, identical to the report dialog's radios. On signup, the two required boxes read as "pick one". | 🟡 Moderate | `rounded-md` on `.checkbox`. |
| **The add flow invites duplicates** (15). The pin map shows no existing playgrounds, and nothing warns about a nearby one. Admin quick-add already does this (FR-ADM-05). | 🟡 Moderate | Show existing pins faded. Within ~50 m, warn "Morda že obstaja: … — Odpri" (*may already exist — open*). |
| **Add-flow friction** (15b–17). After pinning, "Naprej" (*next*) slides ~11 px under the dock, under raw "46.06547, 14.50573". Step 2 disables it without saying why. "(neobvezno)" (*optional*) appears only in a 3.3:1 placeholder. Step 3 has two filled primaries. | 🟡 Moderate | Sticky action bar above the dock; no coordinates. Validate on tap. "(neobvezno)" in labels. Outline photo pickers. |
| **Phones can't reach Privacy, Terms or About** (01, 11, 12, 14). Only the desktop sidebar, signup and the cookie notice (until dismissed) link to them. Meanwhile tab 5, "Podpri" (*support us*), leaves the app for Ko-fi. | 🟡 Moderate | Make tab 5 "Več" (*more*): O aplikaciji, Zasebnost, Pogoji, Jezik, Podpri. This also serves GDPR-10. |
| **Signup consent can't wrap** (09). DaisyUI 5's `.label` sets `white-space: nowrap`, so at 375 px "Strinjam se s Politiko zasebnosti in Pogoji uporabe." already overruns the form by ~10 px. | 🟡 Moderate | `whitespace-normal` on both consent labels. |
| **Missing features are invisible** (06, 07). Only true features are listed, so "no shade" and "unknown" look the same. On a summer afternoon, shade is the deciding factor. | 🟢 Minor | List all five, with unconfirmed ones greyed out as "ni podatka" (*no data*). |
| **Admin** (18–20). "Odobri (počisti zastavico)" overflows its `btn-sm`, tiles aren't links, and "11 izbranih" (*11 selected*) labels a result count. | 🟢 Minor | "Odobri" with help text, linked tiles, and "Prikazanih: 11" (*shown: 11*). |

### Visual Hierarchy
- **What draws the eye first:**
  - **Home (01/02):** the Chewy wordmark, then the teaser's oversized pins. That's fine for a first visit, but nothing says what to tap. The intro also promises filtering "po senci, ograji in pitniku" (*by shade, fence and fountain*) with no filter on the page.
  - **Map (03):** the hint chip, then the pins, which is correct. The lone FAB has a sliders icon that says "filters", but it opens a dial.
  - **Sheet (06):** the name, then four filled-purple badges as loud as "Več podrobnosti" (*more details*). The prime second line is spent on "Še ni ocen".
  - **Detail (07):** title → map → full-width "Navodila do igrišča". Correct, because going there is the decision. Lower down, two dashed empty panels outweigh the content.
  - **Add flow (15–17):** the map in step 1 and the blue children's-faces notice in step 3, both correct. But two filled buttons compete for the final action.
- **Reading flow:** one column, title → content → action, with actions mostly in the thumb zone. The exceptions:
  - the top-left back link on detail
  - the sheet's ✕ at top right
  - the auth screens, which spend about a third of the first screen on illustration
- **Emphasis:**
  - **Primary purple:** filled primary purple does five jobs (actions, toggles, status badges, steps, checked boxes), so it no longer means "tap here". Keep it for one action per view, and use `badge-soft` or outline badges with icons for attributes.
  - **Dock:** its only coloured icon is the pink "Podpri".
  - **Profile (14):** the red "Izbriši moj račun" sits above Jezik and Odjava. Move it to a danger zone at the bottom.
  - **Desktop (21–23):** filters still sit behind a FAB, the detail CTA spans ~990 px, and the hint says "Tapni" (*tap*).

### Consistency

| Element | Issue | Recommendation |
|---|---|---|
| Feature attributes | Shown as checkboxes (filters, add form) and as filled `badge-primary` with ✓ (sheet, detail). Surfaces are `btn-sm` toggles in one place and `badge-outline` in another; equipment uses `badge-ghost`. | One FeatureChip with icons: a 44 px toggle (filters, add form) and a soft static badge (sheet, detail). |
| Map markers | Purple pin on the main map and teaser, default blue Leaflet marker on the detail (07) and add (15b) maps, and default green/yellow/orange clusters. | `playgroundMarkerIcon` everywhere; clusters in primary via `iconCreateFunction`. |
| Map controls | Zoom and locate sit in the dial on the main map. The add map has Leaflet's 30 px +/- and a purple locate circle. | One set: locate and filters visible, zoom secondary (kept for WCAG 2.5.1). |
| Active navigation | The dock uses a dark underline, the sidebar a dark neutral pill. Brand purple never marks "you are here". | Primary for the active icon, label and bar. |
| Toggles & links | `join` with `btn-ghost` (SL/EN, admin filters) renders as a half pill beside plain text. `link-hover` has no underline on touch, so "Registriraj se." looks like body text. | `tabs tabs-box` for toggles; `link link-primary` for links. |
| Form markup | Auth uses v5 `floating-label`. The add form uses v4 `form-control`, `label-text` and `input-bordered`, which do nothing in DaisyUI 5. | v5 `fieldset` with `fieldset-legend`/`label`. |
| Labels & quotes | "Navodila" on the sheet (alone, it reads as "instructions") but "Navodila do igrišča" on detail. Locate has three names, including »Najdi me« on Privacy. Quotes are « … » on About but » … « on Privacy. | "Navodila za pot" everywhere. One locate label, quoted verbatim on Privacy. »…« throughout. |
| Voice & gender | Privacy mixes *ti* and *vi* ("Tvoja lokacija" beside "Vaše pravice"). GDPR-07's "ne objavljajte" sits in a *ti* flow. Masculine "Bodi prvi!" and "ostaneš prijavljen" sit beside inclusive "Star/-a" and "Dobrodošel/-a". | *ti* everywhere; change the GDPR-07 wording only with its requirement and test. Neutral phrasing: "Napiši prvo mnenje", "Uporabljamo le nujne piškotke za ohranjanje prijave." |
| "Prijava" | Means sign-in ("Prijavi se") and also report ("Prijavi" on detail, "Prijavljena igrišča" in admin). | "Sporoči napako" (*report a problem*) for playground reports. |
| Typography | The h1 is `text-2xl` on add, profile and auth, but `text-3xl` on detail, privacy, about and the admin dashboard. The username is in `font-mono`. Chewy has only a `latin` subset, so č/š/ž fall back to another font. | One h1 size and no mono. Test the commercial name in Chewy, or use a display face with latin-ext. |

### Accessibility
- **Colour contrast:** computed from the `retro` tokens. Method: OKLCH → sRGB (out-of-gamut values clipped), alpha composited over `base-100`, WCAG 2.1 luminance. The button noise texture is ignored.

  | Pair (foreground / background) | Used for | Ratio | AA |
  |---|---|---|---|
  | base-content / base-100 | body text | 16.7:1 | pass |
  | base-content/70 / base-100 | descriptions, hints | 6.4:1 | pass |
  | base-content/60 / base-100 | step counter, consent label, coordinates | 4.55:1 | pass, no margin |
  | base-content/50 / base-100 | "Še ni ocen", placeholders, review dates | 3.3:1 | **fail** |
  | base-content/20 / base-100 | input borders (UI, needs 3:1) | 1.5:1 | **fail** |
  | primary and secondary pairs (content on colour, colour on base-100) | buttons, badges, links, wordmark, Ko-fi | 4.5–4.8:1 | pass, thin margin |
  | info-content / info | children's-faces notice (17) | 3.8:1 | **fail** |
  | success-content / success | "Hvala! 🎉" toast, admin "Odobri" | 3.1:1 | **fail** |
  | warning-content / warning · warning / base-100 | unverified-email alerts · photo notices | 3.5 · 3.5:1 | **fail** |
  | error / base-100 · error-content / error | "Izbriši moj račun", form errors · delete confirm | 4.3 · 4.1:1 | **fail** (just) |

  **Fix in `globals.css`** (same chroma and hue):
  - **info:** L 58 → 53.5 % (4.55:1 with its content colour, 4.7:1 on base-100)
  - **success:** 62 → 52 %
  - **warning:** 64 → 57.5 %
  - **error:** 58 → 54.5 %
  - **Secondary text:** alpha ≥ 0.60 for 4.5:1 (`/70` outdoors).
  - **Input borders:** alpha ≥ 0.47 for 3:1.
- **Touch targets:** at `--size-field: 0.25rem`, `btn` is 40 px, `btn-sm` 32 px and `btn-xs` 24 px.
  - **Pass:** the dock (all that `[NFR-UX-02]` measures), the 48 px FAB and the ~68 px cards.
  - **40 px:** dial items (≈ 39 measured), "Naprej"/"Nazaj", photo pickers, GPS and profile buttons.
  - **Fail:**
    - the sheet's actions (≈ 31 measured) and its ✕
    - the filter drawer's ✕, chips and "Pokaži (11)"
    - the cookie notice's "Razumem"
    - remove-photo ✕ (36 px)
    - the SL/EN switch and hint ✕ (24 px, ≈ 23 measured)
    - checkbox rows (24 px)
    - Leaflet's +/- (30 px)
    - text links such as "Nazaj na zemljevid" (~20 px)

  **Fix:** `--size-field: 0.275rem` makes every default `btn` and `input` 44 px. Then drop `btn-sm` from touch actions and add `min-h-11` to checkbox rows. The cookie notice covering the FAB is already known (BL-42).
- **Text readability:**
  - **Good:** Nunito at 16 px reads well.
  - **Risk:** the 11 px dock labels and 12 px sheet badges are small.
  - **Risk:** "Še ni ocen", the most common secondary line in production, is 14 px at 3.3:1, which is weak in sunlight.
  - **Layout:** privacy lists use `list-inside`; switch to `list-outside pl-5`.
- **Alt text & labels:**
  - **Good:** icon buttons are labelled, `aria-current` and `lang` are set, and reduced motion is respected.
  - **Gap:** markers have no `title`, so each pin is an unnamed control.
  - **Gap:** the sheet and filter drawer are dialogs without `aria-labelledby`.
  - **Gap:** every photo's alt text is just the playground name.
  - **Gap:** all remove-photo buttons say "Odstrani fotografijo" with no index.

### What Works Well
- **Directions as the main action:** "Navodila do igrišča" is the detail page's only full-width primary, which is right for a parent deciding to go. The sheet puts "Navodila" one tap from any pin.
- **A well-paced add flow:** three labelled steps, optional photos, GPS with a real error message, the children's-faces notice right above the camera button, and a payoff at the end. The map flies to the new playground with "Hvala! 🎉 Tvoje igrišče je na zemljevidu."
- **Honest filtering:** a live "Pokaži (11)" count and a separate "Ni zadetkov" (*no results*) state with "Počisti filtre".
- **GDPR in plain sight:** an unchecked consent box, the age line, "Prenesi moje podatke" and "Izbriši moj račun", a plain-language privacy page and cookieless analytics.
- **Real Slovenian:** ICU plurals with dual forms ("2 mnenji", "2 igrišči"), a warm *ti* voice and specific error messages.
- **Friendly, restrained identity:** one purple accent, pills, Nunito, gentle empty-state art, safe-area insets and a one-time map hint.

### Priority Recommendations
1. **Make "nearest playground" a one-tap answer** — it's the parent's core job, often done one-handed. Today it takes a hidden dial, shows no position dot, fails silently (BL-13) and gives no distances. Put a 48 px locate button above the FAB, draw the dot, toast failures, compute distance in the browser (GDPR-13) and show "1,2 km" in the sheet and on cards. Add a one-tap "Filtri" that shows its count.
2. **Turn empty states into contribution prompts that survive sign-in** — empty is the product today, and every "Še ni …" is a dead end. Give each section one empty state with one action ("Napiši prvo mnenje" now, "Dodaj fotografijo" with BL-17), and show features instead of "Še ni ocen" on cards. Then pass `next` through login, signup and confirmation, so the action lands back where the parent started.
3. **Meet your own 44 px rule on the map path** — NFR-UX-02 says Done, yet the sheet, filter drawer, dial, SL/EN switch and checkbox rows are 24–40 px. Set `--size-field: 0.275rem`, drop `btn-sm`/`btn-xs` from touch actions, add `min-h-11` to checkbox rows, and make the `[NFR-UX-02]` test cover more than the dock.
4. **Fix contrast in the tokens** — the GDPR-07 children's-faces notice (3.8:1), the "Hvala!" toast (3.1:1), "Še ni ocen" (3.3:1) and input borders (1.5:1) all fail, and parents read this outdoors. Apply the computed L values, and keep text at `/60` or more (`/70` outdoors) and borders at `/50` or more. That's one file, and every screen improves.
5. **Remove the details that say one thing and do another** — the hidden "Razišči zemljevid" button (`isolate`), "Nazaj na zemljevid" going to Home, raw "climbing_wall", consent checkboxes that look like radio buttons, and the consent line that can't wrap. Each takes under an hour, and each costs trust now.

### Backlog candidates

| Suggested item | Screens | Size (S/M/L) |
|---|---|---|
| Map: always-visible 48 px locate button, a "you are here" dot with accuracy circle, and an error toast. Absorbs BL-13; FR-MAP-02. | 03, 04 | S |
| Map: one-tap "Filtri" with an active-count badge, taken out of the dial; zoom stays in the dial. FR-MAP-05/08. | 03–05 | S |
| Distance on the sheet and home cards, computed client-side and never stored (GDPR-13). A "V bližini" (*nearby*) order on Home after locating. | 02, 06 | M |
| Non-modal bottom sheet: selected pin highlighted and panned above it, tap another pin to swap, 44 px actions, `aria-labelledby`. FR-MAP-04. | 06 | M |
| Return to the original page after auth: `next` (relative paths only, reusing the callback check) through login, signup and confirmation. Logged-out CTAs pass it. | 07b, 08, 09, 15 | S |
| Empty states with one action: a merged reviews state ("Napiši prvo mnenje"), a compact photo state (CTA with BL-17), and features instead of "Še ni ocen". | 01, 06, 07b | S |
| Theme tokens: L of info 53.5 %, success 52 %, warning 57.5 %, error 54.5 %; text ≥ `/60`; input border ≥ `/50`; `--size-field: 0.275rem`. NFR-A11Y-01. | all | S |
| Touch-target pass: no `btn-sm`/`btn-xs` on touch actions, `min-h-11` checkbox rows, `btn-lg` dial items. Extend the `[NFR-UX-02]` e2e test to the sheet, drawer, dial and add flow. | 04–06, 09, 14, 16 | M |
| FeatureChip with icons (toggle and soft static variants), square-cornered checkboxes, and unconfirmed features shown as "ni podatka". FR-MAP-05/06, FR-ADD-02. | 05, 06, 07, 16 | M |
| Add flow step 1: existing playgrounds faded on the picker, a ~50 m duplicate warning (reusing FR-ADM-05), a sticky action bar above the dock, and no raw coordinates. | 15, 15b | M |
| Add flow polish: "(neobvezno)" in labels, validate on tap, outline photo pickers, one-line step labels without "Korak x od 3", v5 `fieldset` markup. | 16, 17 | S |
| Mobile nav: change the "Podpri" tab to "Več" (O aplikaciji, Zasebnost, Pogoji, Jezik, Podpri). Once the cookie notice is dismissed, signed-in phone users have no route to `/privacy` or `/terms`. GDPR-10. | 01, 11, 12, 14 | S |
| Quick fixes: `isolate` on the home teaser; back links → `/map`; labels for the five FR-MAP-07 equipment keys (interim for BL-18); `whitespace-normal` on consent labels; `list-outside` on privacy lists. | 02, 07, 09, 11 | S |
| Slovenian copy pass: *ti* in Privacy (GDPR-07 only with its requirement and test), gender-neutral strings, »…«, one locate label, "Navodila za pot", "Sporoči napako", and "Pokaži 11 igrišč" via the unused `filters.results` plural. NFR-I18N-03. | 01, 06, 07b, 11, 12, 17 | S |
| Visual consistency: purple pin on the detail and add maps, branded clusters, a primary active nav state, `tabs tabs-box` toggles and `link-primary` text links. | 03, 07, 08, 14, 15b, 20, 21 | S |
| Accessible names: marker `title`, `aria-labelledby` on the sheet and drawer, numbered "Odstrani fotografijo 2 od 3". NFR-A11Y-01. | 03, 05, 06, 17b | S |
| Moderation polish: "Odobri" with help text, actions under the preview, no raw storage path, tiles that link to queues and highlight non-zero counts, "Prikazanih: 11". FR-ADM-02/03. | 18–20 | S |

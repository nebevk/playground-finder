# Functional requirements

Conventions and the ID scheme are in [README.md](README.md). Status last reviewed **2026-10-14**.

## Discovery & map (`FR-MAP`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| FR-MAP-01 | Anyone can browse the map, playground details and reviews without an account. | Must | Done | db, e2e |
| FR-MAP-02 | The map opens full-screen, centred on Ljubljana. An always-visible "Locate me" button centres it on the user's position after browser permission, marks it with a "you are here" dot, and tells the user when location is unavailable or denied. | Must | Done | e2e |
| FR-MAP-03 | Markers cluster at low zoom levels. | Must | Done | e2e |
| FR-MAP-04 | Tapping a marker opens a bottom sheet with the name, rating summary, a description of at most 2 lines, feature and surface badges, a Directions button and a link to the detail page. | Must | Done | e2e |
| FR-MAP-05 | Feature filters (fenced, shade, drinking water, toilets, parking, benches, toddler area, pram and wheelchair access, lighting). A playground matches only if it has **all** selected features; one nobody has answered counts as not having it. | Must | Done — the last four since ops 0017 | unit |
| FR-MAP-06 | Surface filter (tartan, rubber tiles, sand, grass, artificial grass, wood chips, gravel, asphalt). A playground matches if it has **any** selected surface; with none selected, all match. | Must | Done — four more surfaces since ops 0017 | unit |
| FR-MAP-07 | Equipment filter (swings, baby swings, nest swing, seesaw, spring riders, slides, climbing wall, climbing net, zip line, merry-go-round, trampoline, sandbox, playhouse, water play): a playground matches if it has **all** selected equipment. | Should | Done (ops 0014; nine more kinds in ops 0017) | unit |
| FR-MAP-08 | Filters open with one tap from the map, and the button shows how many are active. Filters show how many playgrounds match and offer "clear all". "Nothing matches your filters" and "no playgrounds yet" each have their own empty state. | Should | Done | e2e, manual |
| FR-MAP-09 | Home shows a map plus the 3 most-viewed and 3 latest playgrounds. One tap lists the 3 nearest playgrounds with their distance, computed in the browser (GDPR-13). No playground is listed twice (nearby, then popular, then latest), and the lists refill from spare rows. From 1024 px the lists sit beside a full-height map whose pins answer the rows. | Should | Done | unit, e2e |
| FR-MAP-10 | Text search by playground name or place. Names and descriptions match as you type, ignoring accents; submitting also looks the words up as a place (OpenStreetMap Nominatim, on the server, cached and rate-limited) and lists the playgrounds within 5 km. Reached from Home and the map. | Should | Done (ops 0014) | unit, e2e |

## Playground detail (`FR-PG`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| FR-PG-01 | The detail page shows photos, features, surface, equipment, rating summary and reviews. Photos open in a full-screen viewer (swipe or arrows, zoom, report). Features show as answered: every form answers each with a three-way chip (ops 0022). One tap means it has it; two taps mean it doesn't, shown as "Brez stranišča" (*no toilets*); a third tap goes back to don't know. A feature nobody answered is left out as unknown (null in the database), so skipping one never shows a "no" (owner's call, ops 0021). An unset surface shows as unknown. | Must | Done | unit, e2e |
| FR-PG-02 | "Directions" opens the device's maps app with the playground as the destination. | Must | Done | unit |
| FR-PG-03 | Opening a detail page counts one view per session. Views drive "most viewed" on Home. | Could | Done — counter is gameable, see backlog | db |
| FR-PG-04 | Signed-in users can save favourites (a heart on the map sheet and the playground's page) and see them on their profile. | Should | Done (ops 0014) | db, e2e |
| FR-PG-05 | Community maintenance status (e.g. "well maintained", "needs repair"). | Could | Not started | manual |

## Contribution (`FR-ADD`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| FR-ADD-01 | Only signed-in users can add a playground. Enforced on the page, in the Server Action and by RLS. | Must | Done | unit, db |
| FR-ADD-02 | Adding takes 3 steps: (1) pin the location on a map, (2) name (required), description, surface, features, (3) photos. The map shows existing playgrounds and warns when one is within ~50 m, and "Next" says what's missing instead of being disabled. | Must | Done | e2e |
| FR-ADD-03 | Photo rules: at most 8 per submission and **3.5 MB in total**, PNG/JPEG/WebP judged by file contents (not the claimed type), at most 3 MiB each (also enforced by the storage bucket), re-encoded on the device before upload, shrunk to ≤ 420 KB each so all 8 always fit. | Must | Done — multi-photo bug fixed in ops 0003 ([ADR-0002](../adr/0002-photo-pipeline.md)); adaptive sizing in ops 0006 | unit, db, e2e |
| FR-ADD-04 | Uploading photos requires a verified email, **enforced by the database and storage policies**, not only by the app. | Must | Done — Server Action, `photos` insert policy and Storage insert policy (ops 0002) | unit, db, e2e |
| FR-ADD-05 | After submitting, the user lands on the map focused on the new playground, with a success message. | Should | Done | e2e |
| FR-ADD-06 | Users can add photos to an existing playground, under the same photo rules (FR-ADD-03, FR-ADD-04) and at most 8 per playground per person in total. The detail page always offers "Dodaj fotografije" (*add photos*). | Should | Done — limit also enforced by the database (ops 0012) | e2e |
| FR-ADD-07 | Equipment can be entered when adding or editing a playground (also in the admin forms); the database accepts only the known keys, and only the known surfaces. | Should | Done (ops 0014; more options in ops 0017) | unit, db, e2e |
| FR-ADD-08 | The person who added a playground can edit its name, description, surface and features, and move its pin. Nobody else can (the database's owner-only policy). | Should | Done | db, e2e |

## Community (`FR-COM`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| FR-COM-01 | Signed-in users rate a playground 1–5 stars with an optional comment; one review per user per playground. Reviews are listed on the playground page with their author. | Must | Done — the list was always empty until ops 0012 (a profile join that cannot work) | db, e2e |
| FR-COM-02 | Users can edit and delete their own review. | Should | Done — edited in place on the playground's page (ops 0012) | db, e2e |
| FR-COM-03 | "Helpful" vote: one per user per review, not on your own review, with the count kept in sync automatically. | Should | Done — self-votes blocked by RLS (ops 0002) | db |
| FR-COM-04 | Signed-in users can report a playground, review or photo with reason *spam*, *incorrect info*, *privacy violation* or *other*; one report per user per target. | Must | Done | db, e2e |
| FR-COM-05 | 3 or more reports automatically flag the target for admin review. | Must | Done | db |
| FR-COM-06 | Flagged content is hidden from the public: database rows **and** photo files. | Must | Done — rows hidden by RLS; files are served only through 1-hour signed URLs, issued only while neither the photo nor its playground is flagged (ops 0003/0004) | db, e2e |
| FR-COM-07 | The profile lists the user's own contributions (playgrounds, reviews, photos), including flagged ones with their status. | Should | Done — "Moji prispevki", with an edit link on each playground (ops 0012) | e2e |

## Accounts (`FR-ACC`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| FR-ACC-01 | Sign up with email + password. A profile with a unique username is created automatically. | Must | Done | db |
| FR-ACC-02 | Email verification link that works in any browser or device and signs the user in, plus a "resend" button on the profile. An unusable link, or logging in before confirming, gets a clear message. | Must | Done — token-hash confirmation template (ops 0006) | e2e, manual |
| FR-ACC-03 | Log in and log out. Signing in or up from a page returns the user to that page afterwards (same-site paths only). | Must | Done | unit, e2e |
| FR-ACC-04 | Password reset by email that does not reveal whether an address is registered. The link works in any browser or device and isn't used up by email link scanners; an invalid or expired link, or reusing the current password, gets a clear message. | Must | Done — token-hash email template (ops 0005) | unit, e2e |

## Admin (`FR-ADM`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| FR-ADM-01 | Admin role (`profiles.is_admin`). Every `/admin` page shows the not-found page (no admin content, `noindex`) to non-admins, and users cannot grant themselves the role. The HTTP status is 404. | Must | Done | db, e2e |
| FR-ADM-02 | Moderation queue for flagged content: approve (clears flag and reports), dismiss, delete. Flagged and reported photos are shown as previews, since the bucket is private. | Must | Done — previews in ops 0007 | e2e, manual |
| FR-ADM-03 | Playgrounds table: edit, bulk delete, bulk flag. It lists published playgrounds; waiting and rejected ones are in the review queue (FR-ADM-07). Its editor answers features like every form, with the three-way chips (ops 0022). | Should | Done | unit, manual |
| FR-ADM-04 | CSV bulk import with a review step before anything is inserted. | Should | Done | unit |
| FR-ADM-05 | Quick-add with geocoding and a warning about nearby possible duplicates. | Should | Done | db |
| FR-ADM-06 | Data-quality dashboard (missing fields, no photos, no reviews). | Could | Done | manual |
| FR-ADM-07 | **Review queue** (`/admin/pending`, [ADR-0003](../adr/0003-playground-status-and-admin-review-queue.md)) for playgrounds waiting for review. Each shows its pin on OpenStreetMap and the OSM feature it came from, its features, surfaces and equipment, the source's notes, and playgrounds of any status within 150 m. *Objavi* puts it on the map at once. *Uredi* answers features with the same three-way chips; one left alone stays unknown. *Zavrni* keeps it hidden, and discovery can't add it again. Recently rejected ones can still be published. The dashboard shows how many are waiting. | Must | Done (ops 0020) | unit, db, e2e |
| FR-ADM-08 | **Publication status:** every playground is `pending`, `published` or `rejected`. Only published ones appear on the map, Home, search, link previews, the detail page and the sitemap, for everyone, admins included. Waiting and rejected ones are visible only to admins, and to their author if they have one. People's additions and admin additions are published at once (owner's decision, 2026-10-30); only discovery adds `pending` ones. Signed-in users can't set or change a status or a source (database column grants). Admins change them only through the admin actions. | Must | Done (ops 0020) | unit, db, e2e |

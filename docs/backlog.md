# Backlog

Open work, highest priority first. Each item links to the requirement it moves forward ([requirements/](requirements/)) or the ADR it implements ([adr/](adr/)). When an item ships: update the requirement's status, make sure a test names the requirement ID, and delete the row here (git history is the changelog).

**Size:** S ≈ under a day · M ≈ 1–3 days · L ≈ a week or more. Last reviewed **2026-10-20** (includes findings from the [2026-10-14 architecture review](reviews/2026-10-14-architecture-review.md), [ops 0001](../ops/handoff/0001-verify-prod-baseline.md), the [2026-10-16 design critique](reviews/2026-10-16-design-critique.md) and the [2026-10-20 Home redesign](reviews/2026-10-20-home-redesign.md)).

Work that's done in the repo but still has to reach production is tracked by its [ops ticket](../ops/README.md), not here. Run `pnpm ops:check` to see what's waiting for Cursor.

## Now — gaps in `Must` requirements

| # | Item | Moves | Size |
|---|---|---|---|
| BL-09 | Upgrade the local machine to Node 24 (`nvm install 24` then `nvm use 24`, as administrator); Vercel, CI and `.nvmrc` are already on 24 (ops 0007). Then bump Vitest 4 → 5. | NFR-OPS-02 | S |

## Next — expected features and hardening

| # | Item | Moves | Size |
|---|---|---|---|
| BL-10 | Notify admins when content is auto-flagged, and consider a minimum account age before reports count. Verified-only counting shipped in ops 0002. | NFR-SEC-06 | S |
| BL-20 | Stop deriving usernames from the email local part (random or user-chosen handle); decide what to do with existing usernames. | GDPR-04 | S |
| BL-22 | Per-page metadata and `hreflang` alternates. | NFR-SEO-02 | S |
| BL-43 | Decide the logout scope. `signOut()` defaults to `global`, so "Odjava" on one device signs the user out everywhere. Keep it, or use `scope: "local"`. Found by e2e. | FR-ACC-03 | S |
| BL-69 | Saving a review can leave its form pending: the save is stored and the response arrives, but the page never re-renders. Seen only when the e2e journey runs 24 times in parallel locally (about 1 in 6); never in two full-suite runs. `refresh()` and a client `router.refresh()` made it worse; removing `loading.tsx` or server `children` didn't help. Each hang comes with bursts of cancelled link prefetches over HTTP/1.1 (`next start`), so suspect a Next 16.2 router race. Check on Vercel (HTTP/2), retest after a Next upgrade, and consider `prefetch={false}` on the detail page's secondary links. | FR-COM-01, FR-COM-02 | M |

## Design & UX

The [2026-10-16 design critique](reviews/2026-10-16-design-critique.md) shipped in [ops 0008](../ops/handoff/0008-design-critique-fixes.md). The [2026-10-20 Home redesign](reviews/2026-10-20-home-redesign.md) (desktop split view, map fixes, no coloured edge accents) ships in [ops 0009](../ops/handoff/0009-home-split-view-map-fixes.md). What's left are brand decisions.

| # | Item | Moves | Size |
|---|---|---|---|
| BL-65 | Display font with Slovenian letters. Chewy (the wordmark and display headings) exists only in a `latin` subset, so č, š and ž fall back to another font mid-word. Pick a display font that has `latin-ext`, or keep Chewy for the wordmark only. Owner's call. | — | S |
| BL-68 | Brand look, the owner's call: a solid wordmark instead of the violet-to-rose gradient, the watercolour logo, pill shapes everywhere (`--radius-field: 2rem`), the rainbow palette and the wiggling "?". The cheap non-brand fixes shipped in [ops 0010](../ops/handoff/0010-less-ai-looking-polish.md); see the [Home redesign review](reviews/2026-10-20-home-redesign.md). | — | S |

## Later

| # | Item | Moves | Size |
|---|---|---|---|
| BL-24 | Offline map: service worker + cacheable snapshot route (ADR-0001 option D). | NFR-PWA-02 | L |
| BL-25 | Community maintenance status. | FR-PG-05 | M |
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

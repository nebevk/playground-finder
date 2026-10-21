---
id: 0013
title: Real 404s and new loaders, cached map snapshot, rate limits, Content-Security-Policy
status: blocked
order: migrations-first
destructive: false
migrations: [20261021150000_rate_limits.sql]
checksums: [135f986f5bede8a8]
depends_on: [0012]
backlog: [BL-44, BL-07, BL-19, BL-21]
requirements: [NFR-SEO-01, FR-ADM-01, NFR-PERF-01, NFR-PERF-02, NFR-SEC-04, NFR-SEC-03, GDPR-10]
---

## Why

Group 2 of the owner's three: what to fix before a public launch.

- **Real 404s and the new loaders (BL-44, NFR-SEO-01).**
  - Missing playgrounds, unknown pages, and admin pages for non-admins now answer with HTTP 404 instead of 200. The app-wide `[locale]/loading.tsx` streamed every page before `notFound()` could set the status.
  - Only the map keeps a loading screen, now the design kit's hopping pin. Other links show a small spinner on the tapped link while the next page loads: the nav tabs, "Odpri" (*open*) on the map sheet, Home's rows, "Uredi" and "Dodaj fotografije".
  - While photos upload, the kit's slide appears with "Nalagam fotografije. To lahko traja nekaj sekund." (*uploading photos, this can take a few seconds*).
  - "No playgrounds yet" uses the kit's rocking swing.
  - The kit's exported SVGs had lost their animations, so the loaders are drawn inline with the keyframes in `globals.css`. They stand still for people who prefer reduced motion.
  - No animated logos or favicons, as asked. The kit stays untracked in `public/incoming/`; that folder would be served publicly if committed.
- **Cached map snapshot (BL-07, ADR-0001, NFR-PERF-01/02).**
  - Every map and Home view used to run a full query over all playgrounds and reviews. Now one shared snapshot is cached in Vercel's Data Cache.
  - It is read without cookies, so admins see exactly what visitors see.
  - Rows are packed: about 0.3 MB at today's ~1,500 playgrounds, against ~0.74 MB before. A unit test holds it to 1 MB at 5,000.
  - Every in-app change that affects the map refreshes it at once. Changes made outside the app (SQL over MCP, the CLI import) show within an hour; `docs/deploy.md` says how to force it.
- **Rate limits (BL-19, NFR-SEC-04).**
  - Per person, in the database, so calls straight to the public API are limited too. In one hour, at most 10 new playgrounds, 20 reviews, 20 reports and 40 photos.
  - Signup, password reset and resending the confirmation: 5 per hour per client (per account for the resend).
  - Admins, service-role tools, and accounts marked `rate_limit_exempt` in `app_metadata` (only the service role can set it; the e2e users) are not limited.
  - Clients are identified by a keyed one-way hash of the IP address, kept for at most a day. The privacy page now says so (GDPR-10).
- **Bug found on the way: photos could be silently left out.** If someone tapped "Dodaj igrišče" (*add playground*) while the picker was still preparing their photos (resizing them in the browser), the playground was saved without them. An e2e run caught it. Both photo forms now hold their submit button until the photos are ready.
- **Content-Security-Policy (BL-21, NFR-SEC-03).**
  - Nonce-based, with a new nonce on every request and `'strict-dynamic'`. It allows Supabase, the OSM tiles, Turnstile, Simple Analytics and Sentry.
  - Simple Analytics is pinned to its SRI build (`sri/v11.js` with a sha384 hash) instead of `latest.js`.
  - Nonces need every page rendered per request, so the formerly static privacy, terms and about pages are now dynamic too.

## Changes

- **404s and loaders:**
  - `src/app/[locale]/loading.tsx` and `LoadingSwing.tsx` are removed.
  - New `src/app/[locale]/map/loading.tsx`, `src/components/Loader.tsx` (swing, slide, pin and `LoadingState`), and `src/components/LinkPending.tsx` (`useLinkStatus`).
  - `UploadingPhotos` in `PhotoPicker.tsx`; the `ksi-*` keyframes in `globals.css`; the "playgrounds" illustration in `EmptyState.tsx`.
- **Snapshot:**
  - New `src/lib/supabase/anon.ts` and `src/lib/map-snapshot.ts` (pack, unpack and the budget).
  - In `src/lib/playgrounds.ts`: `getMapSnapshot` (`unstable_cache`, tag `playgrounds:map`, 1 h), `invalidateMapSnapshot` (`updateTag`), and the latest and most-viewed id lists. `MapPlayground` has no `view_count` any more.
  - `invalidateMapSnapshot()` is called from 16 Server Actions: add, all admin edits, moderation, the owner's edit, reviews, reports, and account deletion.
  - `MapClient` and `HomeLanding` unpack in the browser.
- **Rate limits:**
  - Migration `20261021150000_rate_limits.sql` (expand-only). It adds the trigger function `private.enforce_rate_limit()` with triggers on `playgrounds`, `reviews`, `reports` and `photos`, raising SQLSTATE `PT429` (PostgREST answers HTTP 429). It also adds `private.rate_limit_hits`, with RLS on, and `public.consume_rate_limit()`, which only the service role may call.
  - New `src/lib/rate-limit.ts`. The auth actions check it; the add, review, report and photo actions map `PT429` to a friendly message.
  - `tests/e2e/global-setup.ts` marks the e2e users exempt.
- **CSP:** new `src/lib/csp.ts`. `src/proxy.ts` sets the nonce and policy, and next-intl passes them on. `src/app/[locale]/layout.tsx` reads the nonce and no longer has `generateStaticParams`.
- **Photo forms:** `PhotoPicker` reports `onProcessingChange`; the add flow and the add-photos page disable submit while photos are being prepared.
- **i18n (sl + en):** `add.step3.uploading`, `add.errors.rateLimited`, `detail.reviewError.rate_limited`, `auth.rateLimited`, and a fifth item in `privacy.dataCollected.items` (the hashed IP).
- **Tests:**
  - unit: the snapshot budget, the worst case and packing; every map-changing action expires the snapshot; the pages read it; a refused signup; a database 429 on add;
  - pgTAP: 15 new `[NFR-SEC-04]` checks;
  - e2e: real 404s and the admin 404; a CSP header with a fresh nonce on every request and on every script; no CSP violations on Home, the map, a playground and signup; the analytics script pinned.
- **Docs:**
  - NFR-SEC-03, NFR-SEC-04, NFR-PERF-01 and NFR-PERF-02 are now Done; NFR-SEO-01 and FR-ADM-01 now state the 404.
  - ADR-0001 is accepted, with implementation notes; `docs/deploy.md` describes the out-of-band refresh.
  - BL-07, BL-19, BL-21 and BL-44 are removed.

## Local verification (Claude Code)

- 2026-10-21: `pnpm test` 79 pass (1 todo). `pnpm test:db` 74 pass, including the 15 new `[NFR-SEC-04]` checks (the GDPR-04 TODO predates this). `pnpm typecheck`, `pnpm lint`, `pnpm test:req` and `pnpm ops:check` pass.
- `pnpm test:e2e` (mobile and desktop): 65 passed (1 known gap skipped), twice in a row on the final code.
  - The first run, before the photo fix, failed `[FR-PG-01]`: the playground was saved without its two photos. That is how the bug above was found.
- *Verify in production* was run on the local stack: 4 triggers, `f|f|t`, and `t`. *Rollback*'s SQL was run inside a transaction that was rolled back.
- CSP:
  - A browser sweep of Home, the map, a playground with a photo, sign in, sign up, privacy, a 404, the profile, the add flow and the add-photos page: no violations. The only console message is the local 404 for Vercel's insights script, which exists only on Vercel.
  - Every `<script>` in the server's HTML carries the response's nonce.
  - The analytics script loads through its SRI check and runs.
  - Turnstile, tried with Cloudflare's public test keys on a dev server, produced a token with no violations.
- Status codes on the production build:
  - 404 for a missing playground (sl and en), a malformed id, an unknown path, `/sl/admin` and `/sl/admin/moderation` when signed out;
  - `/sl/playground/<id>/photos` signed out: 307 to sign in.
- Checked by screenshot (production build, phone size): the map's pin loader, and the slide loader with its caption while a photo upload was held back.

## Production steps (Cursor)

1. Preflight. The working tree must be clean, and 0012 must be `done`: this push also carries 0012's code.
2. `apply_migration` with name `rate_limits` and the exact file contents. It is safe before the push: the code in production shows a generic "try again" if an insert is refused.
3. Run *Verify in production* and confirm all expectations. If any fails, run *Rollback*'s SQL, set `failed` and stop.
4. Commit and push, then watch the deploy until it is `READY`. Smoke-test the `smokePaths`.
5. Checks (read-only):
   - `curl -sI <productionUrl>/sl | grep -i '^content-security-policy'`: present, with `'nonce-…' 'strict-dynamic'`, `https://*.supabase.co` (your project's origin), and `upgrade-insecure-requests`.
   - `curl -s -o /dev/null -w "%{http_code}\n" <productionUrl>/sl/playground/00000000-0000-4000-8000-000000000000` → `404`. The same for `<productionUrl>/sl/admin` → `404`.
   - Vercel runtime logs: after the first map or Home view, one line `map snapshot built: N playgrounds, B bytes`. Record N and B; B should be well under 1,000,000.
6. **Owner test** (record the result). The CSP is the part that can break pages, so check on the phone, and on a laptop if one is handy:
   - Home: the map shows tiles and pins. Map: tap a pin, the sheet opens, "Odpri" opens the playground. On that playground, the photos load.
   - Sign up (log out first, or use a private window): the Turnstile check appears and completes. You don't need to finish signing up.
   - Add a playground with a photo: the slide animation shows while it uploads, then the map opens on the new pin. Delete the test playground afterwards in `/admin/playgrounds`.
   - A wrong address such as `/sl/xyz` shows the "page doesn't exist" page.
   - On a laptop: the browser console (F12) shows no "Content Security Policy" errors on Home, the map or a playground.

   If something is blank or broken, roll back the code (see *Rollback*) and record what failed.
7. `get_advisors` (`security`): record the result. `public.consume_rate_limit` is `security definer` with a fixed `search_path` and executable only by `service_role`, so a warning about it is expected to be benign. Then set `status: done`.

## Verify in production

```sql
-- The four per-person limits.
select tgname from pg_trigger
where not tgisinternal
  and tgname in ('playgrounds_rate_limit', 'reviews_rate_limit', 'reports_rate_limit', 'photos_rate_limit')
order by 1;

-- Only the service role may call the per-client limiter.
select has_function_privilege('anon', 'public.consume_rate_limit(text, integer, integer)', 'execute') as anon,
       has_function_privilege('authenticated', 'public.consume_rate_limit(text, integer, integer)', 'execute') as authenticated,
       has_function_privilege('service_role', 'public.consume_rate_limit(text, integer, integer)', 'execute') as service_role;

-- Its table has RLS on and no API grants.
select relrowsecurity from pg_class where oid = 'private.rate_limit_hits'::regclass;
```

Expect:
- The first query returns 4 rows: `photos_rate_limit`, `playgrounds_rate_limit`, `reports_rate_limit`, `reviews_rate_limit`.
- The second returns `false | false | true`.
- The third returns `true`.

## Rollback

```sql
drop trigger if exists playgrounds_rate_limit on public.playgrounds;
drop trigger if exists reviews_rate_limit on public.reviews;
drop trigger if exists reports_rate_limit on public.reports;
drop trigger if exists photos_rate_limit on public.photos;
drop function if exists private.enforce_rate_limit();
drop function if exists public.consume_rate_limit(text, integer, integer);
drop table if exists private.rate_limit_hits;
```

For the app, `git revert` the deploy commit and push, or promote the previous deployment in Vercel, which is faster if the CSP breaks pages. The two halves are independent. Without the SQL, the new code treats every attempt as allowed: the limiter fails open, and inserts just aren't counted. Without the new code, the old code shows a generic error when a limit refuses an insert.

## Result log (Cursor)

- **2026-10-21T14:26Z** started (status → in-progress). Preflight: 0012 → done; prod `READY` (`a1a64e5`); local ahead with 0013/0014 + ops commits; `incoming/` left untracked. Drift OK — `rate_limits` not in prod.
- **Applied** `rate_limits`. Verify: 4 triggers (`photos|playgrounds|reports|reviews_rate_limit`); `consume_rate_limit` execute f|f|t; `private.rate_limit_hits` RLS on.
- **2026-10-21T14:34Z** pushed `9654d94` (GitHub webhook missed; created deploy via Vercel MCP). Deploy `dpl_4ZKRzzuyJTGeMqNumofguYKeCgYX` → `READY`. Smoke 200. CSP present with nonce, strict-dynamic, supabase.co, upgrade-insecure-requests. Missing playground + signed-out `/sl/admin` → 404. Security advisors: prior WARNs unchanged; new INFO `rls_enabled_no_policy` on `private.rate_limit_hits` (expected: private table, service_role only via `consume_rate_limit`).
- **Blocked** on owner CSP/look tests (step 6). 0014 held until 0013 done. Say **process ops** when checks pass.


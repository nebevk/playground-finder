---
id: 0006
title: 8 photos fit, complete data export, deploy guard, signup link in any browser
status: done
order: code-first
destructive: false
migrations: [20261016140000_owners_see_own_flagged.sql]
checksums: [ea4c060f217968b0]
depends_on: [0005]
backlog: [BL-50, BL-04, BL-05, BL-06, BL-49]
requirements: [FR-ADD-03, GDPR-06, GDPR-10, NFR-SEC-02, FR-ACC-02, FR-COM-06]
---

## Why

Five small items:

- **BL-50, 8 photos actually fit:** phone photos came out at 645–741 KB each (ops 0003), so only ~5 fitted the 3.5 MB budget. The browser now lowers quality, then size, until each photo is ≤ 420 KB.
- **BL-04, complete "Export my data" (GDPR-06):** owners can now read their own flagged rows. Public queries filter `flagged = false` explicitly, so nobody else sees anything new. This also stops admins seeing flagged playgrounds on the public map.
- **BL-05 + BL-06, production configuration guard:** Vercel production builds now **fail** if a required setting is missing: Supabase keys, `NEXT_PUBLIC_PRIVACY_EMAIL`, or either Turnstile key. Vercel then keeps the previous deployment live. The personal-Gmail fallback on `/privacy` and `/terms` is gone. Turnstile fails closed at runtime too.
- **BL-49, signup confirmation in any browser:** a token-hash link like password reset (ops 0005). Logging in before confirming now says "confirm your email first" instead of "login failed".

## Changes

- `src/lib/image.ts`, `src/lib/photo-checks.ts`: adaptive re-encode to ≤ 420 KB.
- `supabase/migrations/20261016140000_owners_see_own_flagged.sql`: `*_select_own` policies on playgrounds, reviews, photos. `src/lib/playgrounds.ts`: explicit `flagged = false` on public queries.
- `src/lib/env-checks.ts` (new) + `next.config.ts`: production guard. `src/lib/turnstile.ts`: fails closed. `src/lib/site.ts` `getPrivacyEmail()`; `/privacy`, `/terms` without the fallback.
- `supabase/templates/confirmation.html` (new), `src/app/[locale]/auth/confirm/route.ts` (new), profile "confirmed" notice, login message for unconfirmed email. `supabase/config.toml`: local confirmations on + template.
- i18n (sl + en): `auth.emailNotConfirmed`, `profile.emailConfirmed`.
- Tests: env guard, Turnstile fail-closed, public-query filters, owner visibility (pgTAP), 8 large photos (e2e), signup confirmation from another browser (e2e).

## Local verification (Claude Code)

- `pnpm test` 57 pass; `pnpm test:db` pass (49); `pnpm test:e2e` 38 pass, 7 known gaps skipped. 2026-10-16.
- `VERCEL_ENV=production next build` without the new variables fails with `Production environment is misconfigured: NEXT_PUBLIC_PRIVACY_EMAIL / NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY is not set`. That's the guard working.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:req`, `pnpm ops:check`: pass.

## Production steps (Cursor)

1. Preflight. Also `curl -s <productionUrl>/sl/signup | grep -c challenges.cloudflare.com` and record whether Turnstile is currently live (≥ 1).
2. **Owner, before the push.** Set `status: blocked` and ask for:
   - **Vercel → Settings → Environment Variables (Production):** add `NEXT_PUBLIC_PRIVACY_EMAIL` = the monitored inbox for data requests.
   - **Turnstile:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` must **both** be set. If step 1 found no widget, create a Turnstile site first (`docs/deploy.md` Step 2, domain `playground-finder-seven.vercel.app`).
   - **Supabase → Authentication → Sign In / Providers → Email:** "Confirm email" must be **ON**. If it was off, every account so far was auto-confirmed, and "verified" meant nothing. Record which it was.
3. Commit and push; watch the deploy. If it ends in `ERROR` with `Production environment is misconfigured`, record the listed variables, set `blocked`, ask the owner to add them, then redeploy.
4. `apply_migration` name `owners_see_own_flagged` with the exact file contents (after the code is live, because the code adds the public filters).
5. Run *Verify in production*, smoke-test, and these extra checks:
   - `curl -s <productionUrl>/sl/privacy`: contains the new address; `grep -ci gmail` → `0`.
   - `curl -s -o /dev/null -w "%{redirect_url}" "<productionUrl>/sl/auth/confirm?token_hash=x&type=email"` → ends with `/sl/login?error=link_invalid`.
6. **Owner:** Supabase → *Authentication → Email Templates → Confirm signup*: subject `Potrdi e-poštni naslov · Confirm your email`, body = full contents of `supabase/templates/confirmation.html`.
7. **Owner tests:**
   - (a) On the laptop, sign up a throwaway account with a second email address. Open the confirmation email **on the phone** → expect the profile page with "E-poštni naslov je potrjen". Then delete that account (Profile → Izbriši moj račun).
   - (b) Recommended: add a test playground with **8 phone photos** → all 8 accepted and saved. Then delete it in `/admin/playgrounds`.
8. `get_advisors` (`security`), record, set `status: done`.

## Verify in production

```sql
select policyname from pg_policies
where schemaname = 'public'
  and policyname in ('playgrounds_select_own', 'reviews_select_own', 'photos_select_own')
order by 1;
```

Expect: 3 rows (`photos_select_own`, `playgrounds_select_own`, `reviews_select_own`).

## Rollback

Code: promote the previous Vercel deployment. Template: Email Templates → Confirm signup → reset to default. Migration, only with the owner's confirmation, as `revert_owners_see_own_flagged`:

```sql
drop policy if exists "playgrounds_select_own" on public.playgrounds;
drop policy if exists "reviews_select_own" on public.reviews;
drop policy if exists "photos_select_own" on public.photos;
```

## Result log (Cursor)

- **2026-10-16T21:00Z** started (status → in-progress). Preflight: Turnstile live on `/sl/signup` (`challenges.cloudflare.com` count ≥ 1). Owner confirmed before push: `NEXT_PUBLIC_PRIVACY_EMAIL=ne.bevk@gmail.com` set in Vercel; both Turnstile keys set; Supabase "Confirm email" **ON** (was already on per owner).
- **Push** — code commit `24c073c`, ops log `4e2d5f0` (code-first).
- **Vercel** — production `READY` for SHA `4e2d5f0`, deploy `dpl_FCw6MwtSCPQHpM4Yi47qKm4D6QC8`. Env guard passed (no misconfigured failure).
- **Applied** `owners_see_own_flagged` after code live.
- **Verify policies** — `photos_select_own`, `playgrounds_select_own`, `reviews_select_own`. Pass.
- **Smoke** — all `smokePaths` HTTP 200. Turnstile still live on signup.
- **Extra:** `/sl/privacy` contains `ne.bevk@gmail.com`. Ticket expected `grep -ci gmail → 0`, but owner chose a Gmail contact — count is 2 (expected for this address). `/sl/auth/confirm?token_hash=x&type=email` → `/sl/login?error=link_invalid`. Pass.
- **Advisors (security)** — same baseline as prior tickets; no new warnings.
- **2026-10-16T21:01Z** status → `blocked`: owner must paste Confirm signup template, then run signup-on-phone test (and optional 8-photo test).
- **2026-10-16T21:07Z** owner confirmed Confirm signup template updated (subject + body from `supabase/templates/confirmation.html`). Still waiting on phone signup test (and optional 8-photo test).
- **2026-10-16T21:10Z** owner confirmed signup confirmation email received and test account deleted. Optional 8-photo test not run. status → `done`.

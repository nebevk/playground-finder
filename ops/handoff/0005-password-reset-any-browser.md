---
id: 0005
title: Password reset link that works in any browser
status: done
order: code-first
destructive: false
migrations: []
checksums: []
depends_on: []
backlog: []
requirements: [FR-ACC-04, FR-ACC-02]
---

## Why

**Bug (reported by the owner):** tapping the password-reset link just opens the login page.

Reproduced locally: the link only works in the browser that requested the reset. Supabase's default link uses PKCE, which keeps a one-time secret in a cookie of the requesting browser. Opened anywhere else (a mail app's built-in browser, another browser, another device), the code exchange fails and `/auth/callback` silently redirected to the login page.

Fix:

- **New reset email template** (`supabase/templates/recovery.html`, Slovenian + English) with a token-hash link: `{{ .SiteURL }}/reset-password?token_hash=…&type=recovery`. It needs no cookie, so it works in any browser.
- The reset page verifies the token **only when the new password is submitted**, so email link scanners (Outlook Safe Links, previews) can't use it up.
- Clear messages for an invalid or expired link and for "new password equals the old one" (before, these showed "login failed").
- `/auth/callback` (still used by signup confirmation) now explains a failed link instead of showing a silent login page.

## Changes

- `supabase/templates/recovery.html` (new), wired locally in `supabase/config.toml`.
- `src/app/[locale]/(auth)/actions.ts`: `updatePasswordAction` verifies the token on submit; `forgotPasswordAction`'s redirect target.
- `src/app/[locale]/reset-password/*`: accepts `token_hash`, new messages.
- `src/app/[locale]/auth/callback/route.ts`, `(auth)/login/page.tsx`: `?error=link_invalid` message.
- `src/messages/{sl,en}.json`: `auth.samePassword`, `auth.linkInvalid`.
- Tests: `tests/e2e/password-reset.spec.ts` (same browser, **another browser**, link scanner first, invalid link, callback message); unit tests for the action.

## Local verification (Claude Code)

- `pnpm test:e2e`: 35 pass, twice in a row; the 5 new reset tests pass, including another browser and scanner-first. 2026-10-16.
- `pnpm test` 48 pass; `pnpm test:db` pass; `pnpm typecheck`, `pnpm lint`, `pnpm test:req`, `pnpm ops:check` pass.
- Confirmed the local reset email uses the new template (subject "Ponastavitev gesla · Reset your password", link `/reset-password?token_hash=…&type=recovery`).

## Production steps (Cursor)

**Order matters:** deploy the code first, then change the template. The new page also accepts old-style links (via `/auth/callback`). Changing the template first would send links the old code can't handle.

1. Preflight, then commit and push; wait for the production deployment to be `READY`.
2. Smoke checks, plus:
   - `curl -s "<productionUrl>/sl/reset-password?token_hash=x&type=recovery"` → HTTP 200, page contains `name="token_hash"`.
   - `curl -s -o /dev/null -w "%{redirect_url}" "<productionUrl>/sl/auth/callback?code=x"` → ends with `/sl/login?error=link_invalid`.
3. **Owner (or Cursor, if a tool can edit Supabase Auth email templates):** Supabase dashboard → *Authentication → Email Templates → Reset Password*:
   - **Subject:** `Ponastavitev gesla · Reset your password`
   - **Body:** the full contents of `supabase/templates/recovery.html`. The HTML comment at the top is invisible in emails.

   Then *Authentication → URL Configuration*: **Site URL** must be exactly `https://playground-finder-seven.vercel.app` (no trailing slash), because the link is built from it. Set `status: blocked` until the owner confirms.
4. **Owner test:** on a laptop, request a reset at `/sl/forgot-password`, then open the email **on the phone** (mail app) and set a new password. Expect to land on the profile page. Supabase's built-in email sender allows only a few emails per hour; if no email arrives, wait and retry (BL-30 is the real fix).
5. Record the results and set `status: done`.

## Verify in production

No database changes. Verification is steps 2 and 4.

## Rollback

Restore Supabase's default *Reset Password* template (dashboard → Email Templates → Reset Password → "Reset to default"), then promote the previous Vercel deployment if needed. Reset links already sent with the new template stop working once the code is rolled back.

## Result log (Cursor)

- **2026-10-16T10:12Z** started (status → in-progress). Code-first: committed `58ede1c`, pushed with ops log `4a58584`. Preflight: tree cleaned by commit; prior prod deploy was `READY`.
- **Vercel** — production `READY` for SHA `4a58584`, deploy `dpl_4wVn7XNFAH3mAvNcjDU6LiWP4Ry7`. Inspector: https://vercel.com/kvebens-projects/playground-finder/4wVn7XNFAH3mAvNcjDU6LiWP4Ry7
- **Smoke** — all `smokePaths` HTTP 200.
  - `/sl/reset-password?token_hash=x&type=recovery` → 200, page contains `name="token_hash"`.
  - `/sl/auth/callback?code=x` → redirects to `/sl/login?error=link_invalid`.
- **2026-10-16T10:13Z** status → `blocked`: Supabase MCP has no Auth email-template API. Owner must:
  1. Dashboard → Authentication → Email Templates → Reset Password: Subject `Ponastavitev gesla · Reset your password`; Body = full contents of `supabase/templates/recovery.html`.
  2. Authentication → URL Configuration: Site URL exactly `https://playground-finder-seven.vercel.app` (no trailing slash).
  3. Test: request reset on laptop at `/sl/forgot-password`, open the email on the phone, set a new password → expect profile page. Then reply so this ticket can be marked done.
- **2026-10-16T11:14Z** owner confirmed Site URL already correct; email template updated; phone reset test works. status → `done`.

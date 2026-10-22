---
id: 0015
title: Turnstile works on every form (camera uploads failed), gold rating stars
status: in-progress
order: any
destructive: false
migrations: []
checksums: []
depends_on: [0014]
backlog: []
requirements: [NFR-SEC-02, FR-ADD-06]
---

## Why

From the owner's 0013 phone test:

1. **Uploading a photo straight from the camera failed** with "Preverjanje proti neželeni vsebini ni uspelo." (*the anti-spam check failed*).
2. **The rating stars should change colour.** They were the theme's orange-red `warning`, which reads as an error.

**Cause of 1.** The bug is older than 0013's CSP. Turnstile was rendered *implicitly*: Cloudflare's script draws widgets once, when it first loads. A form reached afterwards by an in-app link got no widget, and so no token. For example: the add flow loads Turnstile, then you open a playground and "Dodaj fotografije". This was reproduced locally, with Cloudflare's test keys:
- the old component: the add flow had a token, and the add-photos page reached by in-app navigation had no widget at all;
- the new one: both had a token.

The same could happen to sign-up and password reset.

There are two further ways a token goes bad: it is single-use (a retry after any failed submit reused it), and it lasts 5 minutes (it can run out while the camera app is open).

## Changes

- **`src/components/Turnstile.tsx`:**
  - Explicit rendering (`?render=explicit`, `turnstile.render` on every mount, `remove` on unmount).
  - A fresh token whenever `resetKey` changes. The four forms pass their action state, so every answer from the server, which uses the token up, is followed by a new token.
  - A fresh token when the page comes back into view with one older than 4 minutes, as when returning from the camera app.
- **`src/lib/turnstile.ts`:** a form with no token at all is now logged (`verifyTurnstile: no token in the form`). Rejected tokens were already logged with Cloudflare's error codes, so the two causes can be told apart.
- **Stars:** new theme colours `--color-star` (gold, `#f9b818`) and `--color-star-edge` (`#cf8600`). They replace `fill-warning stroke-warning` on every rating star: the rating summary, reviews, the review form and "Moji prispevki".

## Local verification (Claude Code)

- 2026-10-22: `pnpm test` 90 pass; `pnpm typecheck` and `pnpm lint` pass. `pnpm test:e2e` 68 passed (1 known gap skipped); Turnstile isn't configured in e2e.
- Turnstile, on a dev server with Cloudflare's test keys, along the path above: the old component gave no widget or token on the add-photos page, and the new component gave a token there.
- Stars checked by screenshot on a production build: gold with a darker edge in the rating summary and on reviews.

## Production steps (Cursor)

1. Preflight. The working tree must be clean, and 0014 must be `done`.
2. No migrations. Commit and push, then watch the deploy until it is `READY`. Smoke-test the `smokePaths`.
3. **Owner test on the phone** (record the result):
   - Open a playground from the map or Home, tap "Dodaj fotografije", take a photo with the camera and send it. It is added, with no "Preverjanje …" error.
   - Do the same after waiting about 5 minutes in the camera app before sending.
   - The stars (rating summary, reviews, review form) are gold.
4. If an anti-spam error still appears, check the Vercel runtime logs from that time for `verifyTurnstile:` lines and record them. `no token in the form` means the widget didn't run; `token rejected` comes with Cloudflare's error codes, such as `timeout-or-duplicate`. Set `blocked` if so; otherwise set `status: done`.

## Verify in production

No database changes. Read-only check after the deploy:

```bash
curl -s <productionUrl>/sl/signup | grep -c "render=explicit"
```

Expect `≥ 1`: the page loads Turnstile in explicit mode.

## Rollback

`git revert` the commit and push. There is no data or schema to undo.

## Result log (Cursor)

- **2026-10-22T08:55Z** started (status → in-progress). Preflight: 0014 → done; no migrations; continuing per owner (camera fix).


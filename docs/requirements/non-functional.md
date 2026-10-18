# Non-functional requirements

Conventions and the ID scheme are in [README.md](README.md). Status last reviewed **2026-10-14**.

## Mobile UX & accessibility (`NFR-UX`, `NFR-A11Y`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| NFR-UX-01 | Mobile-first: every public page works at 375 px width with no horizontal scrolling. | Must | Done | e2e |
| NFR-UX-02 | Touch targets are at least 44×44 px. The bottom navigation is always reachable on mobile. | Must | Done | e2e |
| NFR-A11Y-01 | WCAG 2.1 AA basics: every page has one `h1`, controls have accessible names, everything is reachable by keyboard, text contrast ≥ 4.5:1. | Should | Partial — the contrast and accessible-name failures from the [2026-10-16 design critique](../reviews/2026-10-16-design-critique.md) are fixed; no full audit yet (BL-29) | manual |

## Localization (`NFR-I18N`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| NFR-I18N-01 | Slovenian is the default locale (`/` → `/sl`). English is available through a language switcher. | Must | Done | e2e |
| NFR-I18N-02 | `sl.json` and `en.json` contain exactly the same keys. | Must | Done | unit |
| NFR-I18N-03 | No hardcoded user-facing strings. The brand name exists only as the `app.name` key, so it can change without code changes. | Must | Done | unit, e2e |

## Security (`NFR-SEC`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| NFR-SEC-01 | Row Level Security is enabled on every table in the `public` schema. | Must | Done | db |
| NFR-SEC-02 | Cloudflare Turnstile is verified server-side on public submission forms (signup, password reset, add playground). In production, a missing secret key **blocks** submissions instead of letting them through. | Must | Done — fails closed; Vercel production builds require both keys (ops 0006) | unit |
| NFR-SEC-03 | Responses send security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` and a `Content-Security-Policy`. | Should | Partial — no CSP | e2e |
| NFR-SEC-04 | Server-side rate limits on submissions (signup, add playground, review, report). | Should | Not started | manual |
| NFR-SEC-05 | Users cannot write moderation or privilege columns (`is_admin`, `flagged`, `helpful_count`). Admin actions run server-side behind `requireAdmin()`. | Must | Done | db |
| NFR-SEC-06 | One person cannot hide content alone: auto-flagging (FR-COM-05) only counts reports from verified accounts. | Should | Done — ops 0002 (no minimum account age) | db |
| NFR-SEC-07 | Every rule the app enforces on writes is also enforced by RLS or constraints, because the API is public. In particular, a photo row may only reference a file in the uploader's own storage folder. | Must | Partial — photo rows and files are tied to the verified uploader's own folder (ops 0002); "at most 8 photos" and "name is not empty" are still app-only (BL-47) | db |

## Performance (`NFR-PERF`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| NFR-PERF-01 | Map data comes from a shared cache that is refreshed on writes, not from a full-table query on every page view. See [ADR-0001](../adr/0001-map-data-loading.md). | Should | Not started | unit |
| NFR-PERF-03 | Every foreign key is indexed, so cascading deletes (account deletion) and per-user lookups stay fast. | Should | Done — ops 0007 | db |
| NFR-PERF-02 | The map snapshot stays ≤ 1 MB of raw JSON at 5,000 playgrounds ([ADR-0001](../adr/0001-map-data-loading.md)). | Should | Not started | unit |

## Platform (`NFR-PWA`, `NFR-SEO`, `NFR-OPS`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| NFR-PWA-01 | Installable: the web manifest has a name, icons (including a maskable one) and `display: standalone`. | Should | Done | e2e |
| NFR-PWA-02 | Previously loaded map data still works offline. | Could | Not started | e2e |
| NFR-SEO-01 | `sitemap.xml` lists public pages and playgrounds; `robots.txt` blocks `/admin`. | Should | Done | e2e |
| NFR-SEO-02 | Every public page has its own title and description, plus `hreflang` alternates for `sl` and `en`. | Should | Partial — only detail, about and terms pages set metadata; no `hreflang` | e2e |
| NFR-OPS-01 | All migrations apply cleanly to an empty database (`pnpm db:reset`), and DB tests pass in CI. | Must | Done | db |
| NFR-OPS-02 | Local development, CI and Vercel use the same supported Node.js LTS version. | Should | Partial — Node 24 LTS pinned for Vercel (`engines`), CI and `.nvmrc` (ops 0007); the local machine still runs Node 20 | manual |
| NFR-OPS-03 | The production schema never lags the deployed code. Migrations are backward-compatible (expand, then contract) and go through [ops tickets](../../ops/README.md) that apply them before the code is pushed. Every new migration has a ticket, and a migration is never edited after verification. | Should | Partial — the handoff and `pnpm ops:check` (in CI) exist; the production baseline is unconfirmed until ticket 0001 runs | manual |
| NFR-OPS-04 | Server and browser errors in production reach an error tracker (Sentry, EU region): errors only, no personal data, one-time tokens in URLs scrubbed. Phones don't download the SDK unless it's configured. Admins can trigger a test error at `/admin/sentry-test`. | Should | Done — live once `NEXT_PUBLIC_SENTRY_DSN` is set (ops 0007) | unit, e2e |

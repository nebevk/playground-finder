# Non-functional requirements

Conventions and the ID scheme are in [README.md](README.md). Status last reviewed **2026-10-14**.

## Mobile UX & accessibility (`NFR-UX`, `NFR-A11Y`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| NFR-UX-01 | Mobile-first: every public page works at 375 px width with no horizontal scrolling. | Must | Done | e2e |
| NFR-UX-02 | Touch targets are at least 44×44 px. The bottom navigation is always reachable on mobile. | Must | Done | e2e |
| NFR-A11Y-01 | WCAG 2.1 AA basics: every page has one `h1`, controls have accessible names, everything is reachable by keyboard, text contrast ≥ 4.5:1. | Should | Partial — not audited | manual |

## Localization (`NFR-I18N`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| NFR-I18N-01 | Slovenian is the default locale (`/` → `/sl`). English is available through a language switcher. | Must | Done | e2e |
| NFR-I18N-02 | `sl.json` and `en.json` contain exactly the same keys. | Must | Done | unit |
| NFR-I18N-03 | No hardcoded user-facing strings. The brand name exists only as the `app.name` key, so it can change without code changes. | Must | Partial — equipment values and a few admin glyphs are untranslated | unit |

## Security (`NFR-SEC`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| NFR-SEC-01 | Row Level Security is enabled on every table in the `public` schema. | Must | Done | db |
| NFR-SEC-02 | Cloudflare Turnstile is verified server-side on public submission forms (signup, password reset, add playground). In production, a missing secret key **blocks** submissions instead of letting them through. | Must | Partial — a missing secret lets everything through, with only a warning | unit |
| NFR-SEC-03 | Responses send security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` and a `Content-Security-Policy`. | Should | Partial — no CSP | e2e |
| NFR-SEC-04 | Server-side rate limits on submissions (signup, add playground, review, report). | Should | Not started | manual |
| NFR-SEC-05 | Users cannot write moderation or privilege columns (`is_admin`, `flagged`, `helpful_count`). Admin actions run server-side behind `requireAdmin()`. | Must | Done | db |
| NFR-SEC-06 | One person cannot hide content alone: auto-flagging (FR-COM-05) only counts reports from verified accounts. | Should | Not started — 3 throwaway accounts can hide any playground | db |
| NFR-SEC-07 | Every rule the app enforces on writes is also enforced by RLS or constraints, because the API is public. In particular, a photo row may only reference a file in the uploader's own storage folder. | Must | Not started — `photos.storage_path` is unconstrained | db |

## Performance (`NFR-PERF`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| NFR-PERF-01 | Map data comes from a shared cache that is refreshed on writes, not from a full-table query on every page view. See [ADR-0001](../adr/0001-map-data-loading.md). | Should | Not started | unit |
| NFR-PERF-02 | The map snapshot stays ≤ 1 MB of raw JSON at 5,000 playgrounds ([ADR-0001](../adr/0001-map-data-loading.md)). | Should | Not started | unit |

## Platform (`NFR-PWA`, `NFR-SEO`, `NFR-OPS`)

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| NFR-PWA-01 | Installable: the web manifest has a name, icons (including a maskable one) and `display: standalone`. | Should | Done | e2e |
| NFR-PWA-02 | Previously loaded map data still works offline. | Could | Not started | e2e |
| NFR-SEO-01 | `sitemap.xml` lists public pages and playgrounds; `robots.txt` blocks `/admin`. | Should | Done | e2e |
| NFR-SEO-02 | Every public page has its own title and description, plus `hreflang` alternates for `sl` and `en`. | Should | Partial — only detail, about and terms pages set metadata; no `hreflang` | e2e |
| NFR-OPS-01 | All migrations apply cleanly to an empty database (`pnpm db:reset`), and DB tests pass in CI. | Must | Done | db |
| NFR-OPS-02 | Local development, CI and Vercel use the same supported Node.js LTS version. | Should | Partial — local Node is 20 (end of life since April 2026) | manual |
| NFR-OPS-03 | The production schema never lags the deployed code. Migrations are backward-compatible (expand, then contract) and go through [ops tickets](../../ops/README.md) that apply them before the code is pushed. Every new migration has a ticket, and a migration is never edited after verification. | Should | Partial — the handoff and `pnpm ops:check` (in CI) exist; the production baseline is unconfirmed until ticket 0001 runs | manual |

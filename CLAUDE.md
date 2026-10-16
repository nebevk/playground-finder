# playground-finder

> **Note:** "playground-finder" is a working name. A commercial name is TBD — do not hardcode branding into components or copy. Use i18n keys like `app.name` so it can be swapped later.

A mobile-first, community-driven app to help parents in Slovenia find the perfect playground.

## Planning Documents

- [docs/README.md](docs/README.md) — index of all docs
- [docs/requirements/](docs/requirements/) — functional, non-functional and GDPR requirements with stable IDs (`FR-*`, `NFR-*`, `GDPR-*`), status, and how each is tested. **Source of truth for what the app must do.**
- [docs/requirements/gdpr.md](docs/requirements/gdpr.md) — GDPR/ZVOP-2 compliance requirements (must-read before touching auth, uploads, or user data)
- [docs/backlog.md](docs/backlog.md) — prioritized open work, linked to requirement IDs
- [docs/adr/](docs/adr/) — architecture decision records
- [docs/plan.md](docs/plan.md) — original project plan, phases, and initial schema (historical)
- [docs/daisyui-llms.txt](docs/daisyui-llms.txt) — **DaisyUI v5 reference** — consult before writing any DaisyUI component markup. Contains component APIs, class names, and usage patterns.

## Tech Stack

- **Framework:** Next.js 14+ (App Router) + TypeScript
- **Styling:** Tailwind CSS + DaisyUI
- **Backend:** Supabase (PostgreSQL + PostGIS, Auth, Storage)
- **Maps:** React Leaflet + `react-leaflet-cluster` + OpenStreetMap
- **i18n:** `next-intl` — locales: `sl` (primary), `en`
- **State:** React Context (NOT Pinia — that's Vue)
- **Hosting:** Vercel
- **Spam:** Cloudflare Turnstile

## Conventions

- **Mobile-first:** design for 375px width first; desktop is secondary.
- **Touch targets:** min 44×44px. Bottom nav is always accessible.
- **Slovenian is the primary language.** Never ship hardcoded user-facing strings — always use `next-intl` `t()` and add keys to both `sl.json` and `en.json`.
- **DaisyUI over custom CSS.** Use DaisyUI semantic classes (`btn`, `drawer`, `card`) before writing raw Tailwind. Reference [docs/daisyui-llms.txt](docs/daisyui-llms.txt) for exact class names.
- **PostGIS over lat/lng.** Use `geography(Point, 4326)` and `ST_DWithin` for proximity queries.
- **RLS is mandatory** on every table. Never expose a table without Row Level Security policies.

## GDPR Guardrails (Non-Negotiable)

- Signup requires an unchecked "I agree to Privacy Policy" checkbox.
- Every user must be able to delete their account and export their data.
- Photo uploads show a Slovenian disclaimer about children's faces.
- The `/privacy` page must exist in both `sl` and `en`.
- See [docs/requirements/gdpr.md](docs/requirements/gdpr.md) for the full checklist.

## Security

- RLS policies on all tables.
- Cloudflare Turnstile on all public submission forms.
- Email verification required before image upload.
- 3+ reports on content auto-flags it for admin review.

## Environments

- **Local:** Docker Desktop + Supabase CLI. `pnpm db:start` boots local stack; `pnpm db:reset` re-applies all migrations + seed; `pnpm db:types` regenerates `src/lib/supabase/types.ts`.
- **Tests:** `pnpm test` (unit), `pnpm test:db` (pgTAP, needs the local stack), `pnpm test:e2e` (Playwright on a production build against the local stack), `pnpm test:req` (every Done/Partial requirement has a test). Test titles carry requirement IDs, e.g. `[GDPR-01]`.
- **Production:** Supabase cloud (linked) + Vercel. Live alpha at `playground-finder-seven.vercel.app`. Auto-deploys on push to `master`.

## MCP integrations (Cursor)

The owner runs Cursor with **Supabase MCP** (production project linked) and **Vercel MCP** (project linked) configured. Prefer MCP for production operations whenever you're inside a Cursor session.

**Preferred flows:**
- **Apply a new migration to production:** write the SQL file under `supabase/migrations/` **and an ops ticket** in `ops/handoff/` ([ops/README.md](ops/README.md)); the Cursor agent applies it via Supabase MCP when the owner says "process ops". Do NOT instruct the user to manually `pnpm supabase db push` or paste SQL into the dashboard — the MCP path is faster and the user has chosen it as the canonical flow.
- **Inspecting prod state** (table contents, RLS policies, recent deploys, env vars): ask via MCP rather than guessing.
- **Local migrations** still go through the Supabase CLI (`pnpm db:reset`) because MCP targets the cloud project.

**If you are Claude Code (not Cursor)**, you cannot reach production. Anything that needs a production action (migration, storage or auth setting, env var) goes through an ops ticket. Follow [ops/README.md](ops/README.md) → *Writing a ticket*:
1. Write the migration (expand-only).
2. Verify on the local stack.
3. Write `ops/handoff/NNNN-*.md`.
4. Run `pnpm ops:check --stamp NNNN` and set `status: ready`.
5. Tell the user to say **"process ops"** in Cursor.

Read the *Result log* of earlier tickets to learn production state. Never prescribe the manual CLI.

**Security note:** the Supabase service role / personal access tokens used by MCP have full database access. Treat any migration applied via MCP as immediately live — there is no preview-environment step.

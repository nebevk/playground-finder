# playground-finder

> **Note:** "playground-finder" is a working name. A commercial name is TBD — do not hardcode branding into components or copy. Use i18n keys like `app.name` so it can be swapped later.

A mobile-first, community-driven app to help parents in Slovenia find the perfect playground.

## Planning Documents

- [docs/plan.md](docs/plan.md) — full project plan, phases, and database schema
- [docs/gdpr.md](docs/gdpr.md) — GDPR/ZVOP-2 compliance requirements (must-read before touching auth, uploads, or user data)
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
- See [docs/gdpr.md](docs/gdpr.md) for the full checklist.

## Security

- RLS policies on all tables.
- Cloudflare Turnstile on all public submission forms.
- Email verification required before image upload.
- 3+ reports on content auto-flags it for admin review.

## Environments

- **Local:** Docker Desktop + Supabase CLI. `pnpm db:start` boots local stack; `pnpm db:reset` re-applies all migrations + seed; `pnpm db:types` regenerates `src/lib/supabase/types.ts`.
- **Production:** Supabase cloud (linked) + Vercel. Live alpha at `playground-finder-seven.vercel.app`. Auto-deploys on push to `master`.

## MCP integrations (Cursor)

The owner runs Cursor with **Supabase MCP** (production project linked) and **Vercel MCP** (project linked) configured. Prefer MCP for production operations whenever you're inside a Cursor session.

**Preferred flows:**
- **Apply a new migration to production:** write the SQL file under `supabase/migrations/`, then ask the Cursor agent to apply it via Supabase MCP. Do NOT instruct the user to manually `pnpm supabase db push` or paste SQL into the dashboard — the MCP path is faster and the user has chosen it as the canonical flow.
- **Inspecting prod state** (table contents, RLS policies, recent deploys, env vars): ask via MCP rather than guessing.
- **Local migrations** still go through the Supabase CLI (`pnpm db:reset`) because MCP targets the cloud project.

**If you are Claude Code (not Cursor)** and cannot invoke the MCP tools directly: write the migration / propose the change, then explicitly tell the user "ask your Cursor agent to apply this via Supabase MCP" rather than prescribing the manual CLI.

**Security note:** the Supabase service role / personal access tokens used by MCP have full database access. Treat any migration applied via MCP as immediately live — there is no preview-environment step.

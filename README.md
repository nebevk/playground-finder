# Kje so Igrala

> Odkrij otroška igrišča po Sloveniji.

A mobile-first, community-driven app for finding playgrounds across Slovenia. Built with Next.js, Supabase (PostGIS), DaisyUI, and React Leaflet.

`kje-so-igrala` is the brand. `playground-finder` is the working name in code and the repo — see [docs/plan.md](docs/plan.md) for the full project plan.

## Quickstart

Requires Node 20+, pnpm (via corepack), and Docker Desktop.

```bash
pnpm install
pnpm db:start        # boot local Supabase via Docker
pnpm dev             # http://localhost:3000
```

Useful scripts:

| | |
|---|---|
| `pnpm dev` | Next dev server |
| `pnpm build` | Production build |
| `pnpm db:start` / `db:stop` | Local Supabase (Docker) |
| `pnpm db:reset` | Wipe DB, re-apply migrations + seed |
| `pnpm db:types` | Regenerate Supabase TS types |

## Project docs

- [docs/plan.md](docs/plan.md) — features, phases, schema
- [docs/deploy.md](docs/deploy.md) — production deployment guide
- [docs/gdpr.md](docs/gdpr.md) — GDPR / ZVOP-2 compliance notes
- [docs/daisyui-llms.txt](docs/daisyui-llms.txt) — DaisyUI v5 reference
- [CLAUDE.md](CLAUDE.md) — conventions for AI coding agents

## Production

Live at https://playground-finder-seven.vercel.app/sl (alpha — invite testers only).

Deploy on push to `master` via Vercel + Supabase. Full instructions in [docs/deploy.md](docs/deploy.md).

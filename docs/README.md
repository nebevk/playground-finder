# Docs

| Doc | Use it for |
|---|---|
| [requirements/](requirements/) | **What the app must do** — functional, non-functional and GDPR requirements, each with a stable ID, status and how it's tested |
| [backlog.md](backlog.md) | **What's next** — prioritized open work, linked to requirement IDs |
| [adr/](adr/) | **Why it's built this way** — architecture decision records |
| [reviews/](reviews/) | Point-in-time reviews — [architecture 2026-10-14](reviews/2026-10-14-architecture-review.md), [design critique 2026-10-16](reviews/2026-10-16-design-critique.md), [Home redesign 2026-10-20](reviews/2026-10-20-home-redesign.md) |
| [deploy.md](deploy.md) | Provisioning Supabase + Vercel, environment variables, rollback |
| [../ops/](../ops/README.md) | **Shipping to production** — the Claude Code → Cursor handoff: migration/deploy tickets that Cursor executes via Supabase + Vercel MCP |
| [plan.md](plan.md) | Original vision, build phases and initial schema (historical — requirements and backlog are now the source of truth) |
| [daisyui-llms.txt](daisyui-llms.txt) | DaisyUI v5 reference — read before writing component markup |

## Testing

Each automated test names the requirement ID it checks. See [requirements/README.md](requirements/README.md#traceability-requirement--test).

| Command | Runs |
|---|---|
| `pnpm test` | Unit tests (Vitest) — no services needed |
| `pnpm test:db` | Database tests (pgTAP) — needs `pnpm db:start` |
| `pnpm test:e2e` | Browser tests (Playwright, 375 px) — needs `pnpm db:start`; builds the app and serves it with `next start` (reuses a server already on :3000) |
| `pnpm test:req` | Requirement coverage report: fails if a `Done`/`Partial` requirement has no test |
| `pnpm ops:check` | Ops handoff ledger: every new migration has a ticket and is unchanged since it was verified |

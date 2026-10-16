# Ops handoff: Claude Code → Cursor

Production changes (database migrations, deploys, settings) go through **tickets** in [`handoff/`](handoff/). Claude Code prepares and verifies a change locally and writes a ticket. Cursor, which has the Supabase and Vercel MCP connections, executes it against production and records what happened in the same ticket.

| Who | Does |
|---|---|
| **Claude Code** | Writes code + migration, verifies on the local stack (`pnpm db:reset`, tests), writes the ticket, stamps checksums, sets `status: ready`. Commits when the owner asks. |
| **Cursor agent** | On "process ops": preflight checks, applies migrations via Supabase MCP, verifies in prod, pushes to `master`, watches the Vercel deploy, smoke-tests, fills in the ticket's **Result log**, sets the final status. |
| **Owner** | Says "process ops" in Cursor, confirms anything destructive, and does the steps tickets mark `blocked` (dashboard settings, secrets). |

`pnpm ops:check` validates the ledger and lists ready tickets. It runs in CI.

## Ticket lifecycle

```
draft ──► ready ──► in-progress ──► done
                         │
                         ├──► failed   (stopped; nothing further applied — see Result log)
                         └──► blocked  (waiting for the owner — see Result log)
```

## Rules

1. **Only tickets execute.** Cursor applies nothing to production that isn't in a `ready` ticket, and runs a ticket's steps exactly as written.
2. **Migrations before code.** Vercel deploys every push to `master`, so a `migrations-first` ticket's migrations are applied **before** its commit is pushed. Migrations must be backward-compatible with the code already in production (*expand*); removals happen in a later `code-first` ticket after the code stops using them (*contract*).
3. **What runs is what was tested.** Each migration's checksum is stamped after local verification. `pnpm ops:check` fails if the file changed since, and Cursor must not apply a migration whose check fails.
4. **Applied migrations are immutable.** Fix forward with a new migration. `ops:check` flags edits to migrations of `done` tickets.
5. **Schema changes use `apply_migration`, never `execute_sql`.** `execute_sql` is for read-only verification queries only. Never run `supabase db push` against production. Migrations applied over MCP are recorded under a new version timestamp, so prod and repo are compared **by name**, not version.
6. **Destructive needs a human.** If a ticket has `destructive: true`, or any statement drops, truncates or deletes data, Cursor quotes the statements and waits for the owner's explicit "yes".
7. **Stop at the first failure.** Set the ticket to `failed`, write the error, and do not push or continue to the next ticket.

## Procedure for Cursor ("process ops")

### Preflight (once per run)

1. `git status`: the working tree must be clean. If it isn't, ask the owner whether to commit or stash first.
2. `pnpm -s ops:check` must pass. Note the `ready` tickets, lowest id first.
3. **Drift check** (Supabase MCP `list_migrations`). Compare migration *names* (file name without the `YYYYMMDDHHMMSS_` prefix and `.sql`):
   - Every repo migration at or before `baseline` in [`config.json`](config.json), and every migration of a `done` ticket, must be in production.
   - No migration of a `ready` ticket may already be in production. If one is, someone applied it by hand: stop and report.
   - Report any production migration the repo doesn't have.
4. **Deploy health** (Vercel): the latest production deployment must be `READY`. Don't stack changes on a broken deploy.

### Per ticket (lowest id first)

The owner can name a ticket to run out of order ("process ops 0005"). That's allowed when every ticket in its `depends_on` is `done`. A `blocked` ticket doesn't stop unrelated tickets the owner names.

1. Set `status: in-progress` and add a timestamped "started" line to the Result log.
2. If `destructive: true`, quote the statements and wait for the owner's confirmation.
3. Run **Production steps** in the order the ticket's `order` says:
   - `migrations-first` (default): apply migrations, verify, then commit and push.
   - `code-first`: commit and push, wait for `READY`, then apply migrations and verify.
   - `any`: no ordering constraint (e.g. read-only tickets).
4. **Apply a migration** with Supabase MCP `apply_migration`: `name` = file name without prefix and extension (e.g. `20261015120000_photos_verified_email.sql` → `photos_verified_email`), `query` = the file's exact contents.
5. **Verify** every query under *Verify in production* with `execute_sql` and compare with the ticket's *Expect*.
6. **Push and watch the deploy.** Commit the ticket update as `ops(NNNN): <title>` and `git push origin master`. With the Vercel tools, find the production deployment for that commit and wait for `READY`. On `ERROR`, fetch the build logs, record them and set `failed`.
7. **Smoke-test** each `smokePaths` entry from `config.json` against `productionUrl` (expect HTTP 200), plus the ticket's own checks.
8. **Advisors**: run Supabase MCP `get_advisors` (`security`) and record any warnings that weren't in the previous ticket's log.
9. Fill in the Result log (migration names and the versions production recorded, verification output, deployment URL, advisors) and set `status: done`. Commit. A results-only commit doesn't need its own push; it goes out with the next one.

If a step needs something Cursor can't do (e.g. a Vercel env var with no tool for it, or a Supabase dashboard setting), set `status: blocked`, write exactly what the owner must do, and stop. After the owner confirms, continue from that step.

## Writing a ticket (Claude Code)

1. Write the migration under `supabase/migrations/` as `YYYYMMDDHHMMSS_snake_name.sql`. Keep it expand-only, idempotent where practical (`drop policy if exists` before `create policy`), and with a top comment stating the ticket id and intent.
2. Verify locally: `pnpm db:reset && pnpm test:db`, plus `pnpm test` / `pnpm test:e2e` when app code changed. Turn the relevant pgTAP `todo` into a real assertion.
3. Copy [`TEMPLATE.md`](TEMPLATE.md) to `handoff/NNNN-slug.md` (next free number). Fill in every section: *Verify in production* needs exact SQL with an expected result, and *Rollback* needs exact SQL.
4. `pnpm ops:check --stamp NNNN`, then set `status: ready` and run `pnpm ops:check` again.
5. Tell the owner the ticket is ready and that they can say **"process ops"** in Cursor. Commit only when the owner asks.

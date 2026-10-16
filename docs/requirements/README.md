# Requirements

What the app must do, how well, and how each requirement is checked.

| File | Covers |
|---|---|
| [functional.md](functional.md) | Features: map, playground detail, contribution, community, accounts, admin (`FR-*`) |
| [non-functional.md](non-functional.md) | Mobile UX, i18n, security, performance, platform (`NFR-*`) |
| [gdpr.md](gdpr.md) | GDPR + Slovenian ZVOP-2 obligations (`GDPR-*`) — **read before touching auth, uploads or user data** |

Open work lives in [../backlog.md](../backlog.md). Architecture decisions live in [../adr/](../adr/).

## How requirements are written

Each requirement is one table row:

| Column | Meaning |
|---|---|
| **ID** | Stable, never reused. `FR-<AREA>-NN`, `NFR-<AREA>-NN` or `GDPR-NN`. Delete a requirement by marking it `Dropped`, not by removing the row. |
| **Requirement** | One testable statement. Acceptance criteria go in the same cell. |
| **Pri** | `Must` (launch blocker) · `Should` (expected) · `Could` (nice to have) |
| **Status** | `Done` · `Partial` (with the gap named) · `Not started` · `Dropped`. Status describes the **repository**. Whether a database change is live in production is tracked by its ops ticket ([`ops/handoff/`](../../ops/handoff/)), referenced as e.g. "ops 0002". |
| **Verify** | How it is checked: `unit` · `db` · `e2e` · `manual` (comma-separated) |

## Traceability: requirement → test

Every automated test names the requirement ID it checks, in its title:

```ts
it("[GDPR-01] rejects signup when consent is not given", ...)    // Vitest
test("[NFR-UX-02] bottom nav targets are ≥ 44 px", ...)          // Playwright
SELECT ok(..., '[NFR-SEC-01] RLS is enabled on every table');     -- pgTAP
```

| Verify | Test location | Runner | Needs |
|---|---|---|---|
| `unit` | `tests/unit/**/*.test.ts` | `pnpm test` (Vitest) | nothing |
| `db` | `supabase/tests/**/*.test.sql` | `pnpm test:db` (pgTAP via Supabase CLI) | `pnpm db:start` |
| `e2e` | `tests/e2e/**/*.spec.ts` | `pnpm test:e2e` (Playwright, production build) | `pnpm db:start` (seeded; `pnpm db:reset` for a clean slate) |

`pnpm test:req` checks the mapping: every `Done` or `Partial` requirement must have at least one test in **each** automated layer listed in its Verify column. It fails CI when one is missing, and lists `Not started` and `manual` requirements so they stay visible.

Known gaps in `Partial` requirements are written as `it.todo(...)` / `test.fixme(...)` with the same ID, so the gap shows up in test output until it is fixed.

## Changing a requirement

1. Edit the row (status, wording, verify).
2. Add or update the test that names its ID.
3. Run `pnpm test:req`.
4. If the change comes from a design choice, link the ADR in the row.

---
id: NNNN
title: Short imperative title
status: draft                 # draft | ready | in-progress | done | failed | blocked
order: migrations-first       # migrations-first | code-first | any
destructive: false            # true → Cursor waits for the owner's explicit confirmation
migrations: []                # file names in supabase/migrations, in apply order
checksums: []                 # written by: pnpm ops:check --stamp NNNN
depends_on: []                # ticket ids that must be done first
backlog: []                   # e.g. [BL-01]
requirements: []              # e.g. [FR-ADD-04]
---

## Why

What changes for users or for security, and which requirement or backlog item it closes.

## Changes

- `supabase/migrations/…` — what it does
- `src/…` — what changed (or "none")

## Local verification (Claude Code)

- `pnpm db:reset && pnpm test:db` — result, date
- `pnpm test` / `pnpm test:e2e` — result, date

## Production steps (Cursor)

1. `apply_migration` name `…` with the contents of `supabase/migrations/…`
2. Verify (below)
3. Commit and push, watch the deploy, smoke-test

## Verify in production

```sql
-- what this proves
select …;
```

Expect: …

## Rollback

Only with the owner's confirmation:

```sql
…
```

## Result log (Cursor)

- 

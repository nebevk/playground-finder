---
id: 0001
title: Verify production matches the migration baseline (read-only)
status: ready
order: any
destructive: false
migrations: []
checksums: []
depends_on: []
backlog: [BL-38, BL-33, BL-07]
requirements: [NFR-OPS-03, NFR-SEC-01]
---

## Why

First run of the handoff loop. It changes nothing. It confirms that production has every migration up to the baseline in `ops/config.json` (`20260612120000_playground_views`), so later tickets start from a known state. It also records real numbers that upcoming work needs: data volume for [ADR-0001](../../docs/adr/0001-map-data-loading.md), storage use for the plan review (BL-33), and the current Supabase advisor warnings as a baseline for later tickets.

## Changes

None. Read-only queries and status checks.

## Local verification (Claude Code)

- `pnpm ops:check` — passes, 2026-10-15
- `pnpm db:reset && pnpm test:db` — 37 tests pass (4 known-gap TODOs), 2026-10-15

## Production steps (Cursor)

1. Preflight from `ops/README.md`. The drift check is the main point of this ticket: list every repo migration, and say whether each one is in production (by name). Also list any production migration the repo doesn't have.
2. Run every query under *Verify in production* with `execute_sql` and paste the results into the Result log.
3. `get_advisors` with type `security`, then with type `performance`. Paste both lists, since they are the baseline for later tickets.
4. Vercel: get the latest production deployment's state, URL and git commit SHA, and compare the SHA with `git rev-parse origin/master`.
5. Smoke-test `productionUrl` + every `smokePaths` entry from `ops/config.json` (expect 200).
6. No push is needed. Set `status: done`, or `failed` if migrations are missing or unknown, and commit the ticket.

## Verify in production

```sql
-- RLS on every public table (NFR-SEC-01)
select c.relname as table_without_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
```

Expect: 0 rows.

```sql
-- Public tables
select table_name from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE' order by 1;
```

Expect: `favorites, photos, playgrounds, profiles, reports, review_helpful, reviews`.

```sql
-- Data volume (ADR-0001, BL-33). Aggregates only, no personal data.
select
  (select count(*) from public.playgrounds)                     as playgrounds,
  (select count(*) from public.playgrounds where flagged)       as playgrounds_flagged,
  (select count(*) from public.photos)                          as photos,
  (select count(*) from public.reviews)                         as reviews,
  (select count(*) from public.reports)                         as reports,
  (select count(*) from auth.users)                             as users,
  (select count(*) from auth.users where email_confirmed_at is null) as users_unverified,
  (select count(*) from public.profiles where is_admin)         as admins;
```

Expect: any values; record them.

```sql
-- Photo storage use and bucket settings (BL-03, BL-33)
select b.id, b.public, b.file_size_limit, b.allowed_mime_types,
       count(o.id) as objects,
       pg_size_pretty(coalesce(sum((o.metadata->>'size')::bigint), 0)) as total_size
from storage.buckets b left join storage.objects o on o.bucket_id = b.id
group by b.id, b.public, b.file_size_limit, b.allowed_mime_types;
```

Expect: `playground-photos` with `public = true` (known gap BL-03); record size and object count.

## Rollback

Nothing to roll back.

## Result log (Cursor)

- 

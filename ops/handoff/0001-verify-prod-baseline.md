---
id: 0001
title: Verify production matches the migration baseline (read-only)
status: done
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

- **2026-10-16T06:32Z** started (status → in-progress). Preflight: working tree cleaned via commit `f3ec41a`; `pnpm ops:check` pass; latest Vercel prod deploy `READY` (`dpl_4ycFc3emRU9qRBVH6w4NBpWjpZa1`, SHA `a4a26cd` — matches `origin/master` at start; local HEAD was one commit ahead with docs/ops/tests only).
- **Drift check** (compare by name): all 17 repo migrations present in production. No production-only migrations. Ready ticket has no migrations to apply.
  | repo file | prod version | prod name |
  |---|---|---|
  | `20260416120001_extensions.sql` | `20260520075955` | `extensions` |
  | `20260416120002_profiles.sql` | `20260520080003` | `profiles` |
  | `20260416120003_playgrounds.sql` | `20260520080007` | `playgrounds` |
  | `20260416120004_photos.sql` | `20260520080011` | `photos` |
  | `20260416120005_reviews.sql` | `20260520080017` | `reviews` |
  | `20260416120006_favorites.sql` | `20260520080021` | `favorites` |
  | `20260416120007_reports.sql` | `20260520080027` | `reports` |
  | `20260416120008_rls.sql` | `20260520080036` | `rls` |
  | `20260416120009_storage.sql` | `20260520080045` | `storage` |
  | `20260416120010_playgrounds_view.sql` | `20260520080051` | `playgrounds_view` |
  | `20260420120001_review_helpful.sql` | `20260520080100` | `review_helpful` |
  | `20260420130001_admin_role.sql` | `20260520080106` | `admin_role` |
  | `20260520081500_harden_public_api_surface.sql` | `20260520081843` | `harden_public_api_surface` |
  | `20260529120000_security_hardening.sql` | `20260601085016` | `security_hardening` |
  | `20260601120000_playgrounds_geo_rating.sql` | `20260612092905` | `playgrounds_geo_rating` |
  | `20260601130000_playgrounds_near.sql` | `20260612092912` | `playgrounds_near` |
  | `20260612120000_playground_views.sql` (baseline) | `20260612105116` | `playground_views` |
- **Verify: RLS** — 0 rows (every public base table has RLS). Pass.
- **Verify: public tables** — `favorites, photos, playgrounds, profiles, reports, review_helpful, reviews`. Pass.
- **Verify: data volume** — playgrounds=10, flagged=0, photos=0, reviews=0, reports=0, users=2, users_unverified=0, admins=1.
- **Verify: storage** — bucket `playground-photos`, `public=true` (known gap BL-03), `file_size_limit=10485760` (10 MiB), mime=`image/png,image/jpeg,image/webp`, objects=0, total_size=`0 bytes`.
- **Advisors (security baseline)**
  - WARN `anon_security_definer_function_executable` / `authenticated_security_definer_function_executable`: `public.increment_playground_views(uuid)` callable by anon + authenticated ([lint 0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [lint 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)). Intentional for view counts; note for later hardening if abused.
  - WARN `auth_leaked_password_protection`: HaveIBeenPwned check disabled ([docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)) — owner dashboard action.
- **Advisors (performance baseline)**
  - INFO `unindexed_foreign_keys` (5): `favorites.playground_id`, `photos.user_id`, `reports.user_id`, `review_helpful.user_id`, `reviews.user_id` ([lint 0001](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)).
  - INFO `unused_index` (3): `playgrounds_location_idx`, `playgrounds_user_id_idx`, `reports_target_idx` ([lint 0005](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)).
  - WARN `multiple_permissive_policies` (50 findings): overlapping admin+own / admin+public policies on `photos`, `playgrounds`, `reports`, `reviews` for several roles ([lint 0006](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)).
- **Vercel** — production `READY`, URL `https://playground-finder-2snwrlz4g-kvebens-projects.vercel.app` (alias `https://playground-finder-seven.vercel.app`), commit `a4a26cd`. Inspector: https://vercel.com/kvebens-projects/playground-finder/4ycFc3emRU9qRBVH6w4NBpWjpZa1
- **Smoke** — all `smokePaths` HTTP 200: `/sl`, `/sl/map`, `/sl/privacy`, `/en/privacy`, `/sitemap.xml`.
- **2026-10-16T06:33Z** status → `done`. No schema changes; no migrations applied.

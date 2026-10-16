---
id: 0002
title: Enforce photo, vote and report rules in the database
status: done
order: migrations-first
destructive: false
migrations: [20261016090000_trust_boundary_rls.sql]
checksums: [70941edb96e69467]
depends_on: [0001]
backlog: [BL-01, BL-10, BL-11, BL-36]
requirements: [FR-ADD-03, FR-ADD-04, FR-COM-03, NFR-SEC-06, NFR-SEC-07]
---

## Why

Phase 1 of the [2026-10-14 architecture review](../../docs/reviews/2026-10-14-architecture-review.md): rules the app checks in Server Actions must also hold for direct API calls, because the publishable key is public. After this ticket:

- **Photo rows and files need a verified email** (FR-ADD-04). Before, only the Server Action checked it.
- **Photos can only reference the uploader's own folder** (NFR-SEC-07). Before, a photo row could point at any file, including someone else's.
- **No "helpful" votes on your own review** (FR-COM-03). Before, this was blocked only in the UI.
- **Only verified accounts count toward auto-flagging** (NFR-SEC-06), so three throwaway accounts can no longer hide a playground. Unverified reports are still stored for admins.
- **The production bucket caps files at 3 MiB**, matching the app and `supabase/config.toml`. Ticket 0001 found production at 10 MiB.

This is expand-only: the deployed app already satisfies every rule (its upload path is `<user id>/<playground id>/…`). It contains no app code change.

## Changes

- `supabase/migrations/20261016090000_trust_boundary_rls.sql`: adds `private.is_verified()`, replaces three insert policies, adds the verified-only count in `auto_flag_on_reports()`, sets the bucket limit.
- `supabase/tests/*.test.sql`: the `[FR-ADD-04]` and `[FR-COM-03]` TODOs are now real assertions; new tests for `[NFR-SEC-07]`, `[NFR-SEC-06]`, `[FR-ADD-03]`.
- `tests/e2e/account.spec.ts`: new test uploading a photo through the real Storage path as a verified user.
- Docs: requirement statuses, backlog.

## Local verification (Claude Code)

- `pnpm db:reset && pnpm test:db`: 45 pass (2 remaining TODOs are BL-03 and BL-20, unrelated), 2026-10-16
- `pnpm test:e2e`: 29 pass, 7 known gaps skipped, including the new photo-upload test, 2026-10-16
- `pnpm test`, `pnpm test:req`, `pnpm ops:check`, `pnpm typecheck`, `pnpm lint`: pass, 2026-10-16

## Production steps (Cursor)

1. Preflight (`ops/README.md`).
2. `apply_migration` name `trust_boundary_rls` with the exact contents of `supabase/migrations/20261016090000_trust_boundary_rls.sql`.
3. Run *Verify in production*. Everything is read-only.
4. Commit and push, watch the deploy, smoke-test.
5. `get_advisors` `security`: compare with ticket 0001's list. No new warnings are expected. `private` isn't an API-exposed schema, so `is_verified()` shouldn't trigger lint 0028/0029.

## Verify in production

```sql
-- The three replaced insert policies
select schemaname || '.' || tablename as tbl, policyname, with_check
from pg_policies
where (schemaname, tablename, policyname) in (
  ('public', 'photos', 'photos_insert_authed'),
  ('storage', 'objects', 'playground_photos_insert_authed'),
  ('public', 'review_helpful', 'review_helpful_insert_own'))
order by 1;
```

Expect: 3 rows.
- `public.photos`: `with_check` mentions `is_verified` and `storage_path ~~`.
- `public.review_helpful`: mentions `NOT (EXISTS`.
- `storage.objects`: mentions `foldername` and `is_verified`.

```sql
-- Helper function: security definer, empty search_path, executable by API roles
select p.prosecdef, p.proconfig,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
from pg_proc p where p.oid = 'private.is_verified()'::regprocedure;
```

Expect: `true`, `{search_path=""}`, `true`.

```sql
-- Auto-flag counts only verified reporters; bucket limit
select
  (select prosrc like '%email_confirmed_at is not null%' from pg_proc
    where oid = 'public.auto_flag_on_reports()'::regprocedure) as verified_only_count,
  (select file_size_limit from storage.buckets where id = 'playground-photos') as bucket_limit;
```

Expect: `true`, `3145728`.

## Rollback

Only with the owner's confirmation. Apply it as a migration named `revert_trust_boundary_rls` and record it here; Claude Code then adds the matching file to the repo.

```sql
drop policy if exists "photos_insert_authed" on public.photos;
create policy "photos_insert_authed" on public.photos
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "playground_photos_insert_authed" on storage.objects;
create policy "playground_photos_insert_authed" on storage.objects
  for insert with check (bucket_id = 'playground-photos' and auth.role() = 'authenticated'
                         and owner_id = (select auth.uid())::text);
drop policy if exists "review_helpful_insert_own" on public.review_helpful;
create policy "review_helpful_insert_own" on public.review_helpful
  for insert with check ((select auth.uid()) = user_id);
drop function if exists private.is_verified();
-- auto_flag_on_reports(): re-create the body from supabase/migrations/20260416120007_reports.sql
update storage.buckets set file_size_limit = 10485760 where id = 'playground-photos';
```

## Result log (Cursor)

- **2026-10-16T07:56Z** started (status → in-progress). Preflight: clean tree after commit `8ac7a0e`; `pnpm ops:check` pass; prod deploy `READY` (`dpl_7zuLkzhnvoAmauJZtH5bxbThSyXx`, SHA `55364ab`); drift OK — `trust_boundary_rls` not yet in prod.
- **Applied** `apply_migration` name=`trust_boundary_rls`. Prod recorded version `20261016075718` / name `trust_boundary_rls`.
- **Verify policies** — 3 rows as expected:
  - `public.photos` / `photos_insert_authed`: `with_check` includes `private.is_verified()` and `storage_path ~~ … || '/%'`
  - `public.review_helpful` / `review_helpful_insert_own`: includes `NOT (EXISTS …)`
  - `storage.objects` / `playground_photos_insert_authed`: includes `foldername` + `is_verified`
- **Verify `private.is_verified()`** — `prosecdef=true`, `proconfig={search_path=""}`, `authenticated_can_execute=true`. Pass.
- **Verify auto-flag + bucket** — `verified_only_count=true`, `bucket_limit=3145728`. Pass.
- **Push** — `8ac7a0e` (migration + tests/docs) and `9b98881` (ops log). Migration applied **before** push (migrations-first).
- **Vercel** — production `READY` for SHA `9b98881`, deploy `dpl_DDyXMgyeihk1HfESZFZJxNiGiu6a`. Inspector: https://vercel.com/kvebens-projects/playground-finder/DDyXMgyeihk1HfESZFZJxNiGiu6a
- **Smoke** — all `smokePaths` HTTP 200: `/sl`, `/sl/map`, `/sl/privacy`, `/en/privacy`, `/sitemap.xml`.
- **Advisors (security)** — same as ticket 0001 baseline; **no new warnings**. Still present: `increment_playground_views` anon/authenticated SECURITY DEFINER (intentional), `auth_leaked_password_protection` disabled (owner dashboard). `private.is_verified()` did not trigger lint 0028/0029.
- **2026-10-16T07:59Z** status → `done`.

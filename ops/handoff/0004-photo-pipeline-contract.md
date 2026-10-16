---
id: 0004
title: Photo pipeline 2/2 — private bucket, no client writes (contract)
status: done
order: migrations-first
destructive: false
migrations: [20261016110100_photos_private_bucket.sql]
checksums: [479c76d63cd94fb8]
depends_on: [0003]
backlog: [BL-03]
requirements: [FR-COM-06, GDPR-09, GDPR-14]
---

## Why

Part 2 of [ADR-0002](../../docs/adr/0002-photo-pipeline.md). Once ticket 0003's code is live (it serves signed URLs and uploads with the service role), this closes the old paths:

- **The bucket becomes private.** Public photo URLs stop working; only signed URLs for unflagged photos do (GDPR-14).
- **Clients can no longer upload or overwrite files directly.** Every stored byte has passed the server's metadata check (GDPR-09).

**Contract step:** apply only after ticket 0003 is `done`, i.e. its code is deployed. Run before that, it would break photo display and uploads for the old code. No app code changes here.

## Changes

- `supabase/migrations/20261016110100_photos_private_bucket.sql`: `public = false`, drops the `playground_photos_insert_authed` and `playground_photos_update_own` Storage policies.
- `supabase/config.toml`: local bucket `public = false` (local only).
- pgTAP: `[FR-COM-06] [GDPR-14] bucket is private` is now a real assertion; `[GDPR-09] clients cannot write to the photo bucket directly`.

## Local verification (Claude Code)

- Same runs as ticket 0003's final state, with both migrations applied: `pnpm test:db` 46 pass, `pnpm test:e2e` 30 pass. 2026-10-16.

## Production steps (Cursor)

1. Preflight. Confirm ticket 0003 is `done` and the latest production deployment includes its commit.
2. Note one photo path from the owner's 0003 test playground (*Before* query below).
3. `apply_migration` name `photos_private_bucket` with the exact contents of the migration file.
4. Run *Verify in production*.
5. **Public URL is dead:** `curl -s -o /dev/null -w "%{http_code}" "<SUPABASE_URL>/storage/v1/object/public/playground-photos/<path from step 2>"`. Expect `400` or `404`, not `200`. Get the project URL from Supabase MCP (`get_project_url`).
6. **Signed URL still works:** ask the owner to reload the test playground's page and confirm the photos still show.
7. **Deletion removes files (GDPR-15):** ask the owner to delete the test playground in `/admin/playgrounds`, then run the *After deletion* query.
8. Commit and push (tests and config only), watch the deploy, smoke-test, run `get_advisors` (`security`).

## Verify in production

*Before* (step 2):

```sql
select storage_path from public.photos order by created_at desc limit 1;
```

After applying:

```sql
select
  (select public from storage.buckets where id = 'playground-photos') as bucket_public,
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('playground_photos_insert_authed', 'playground_photos_update_own')) as client_write_policies,
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'playground_photos_read_unflagged') as read_policy;
```

Expect: `false`, `0`, `1`.

*After deletion* (step 7):

```sql
-- Files of the deleted playground are gone too (no orphans left behind)
select count(*) as orphan_files
from storage.objects o
where o.bucket_id = 'playground-photos'
  and not exists (select 1 from public.photos p where p.storage_path = o.name);
```

Expect: `0`.

## Rollback

Only with the owner's confirmation, applied as `revert_photos_private_bucket` (it restores the 0002 policies):

```sql
update storage.buckets set public = true where id = 'playground-photos';
create policy "playground_photos_insert_authed" on storage.objects
  for insert with check (
    bucket_id = 'playground-photos' and auth.role() = 'authenticated'
    and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_verified()));
create policy "playground_photos_update_own" on storage.objects
  for update using (bucket_id = 'playground-photos' and owner_id = (select auth.uid())::text);
```

## Result log (Cursor)

- **2026-10-16T11:15Z** started after 0003/0005 marked done. Preflight: 0003 `done` and its code is on production master; deploy `READY` (`87cf2fe`).
- **Before path:** `f20e1439-baad-42d8-bde0-12aaff56075f/b334cb62-2285-44cb-bb5e-f5d625dcbe9c/4-66cbbcda-e9ee-4c69-8f62-9ebb6082ae1a.webp`
- **Applied** `photos_private_bucket` → prod version `20261016111456`.
- **Verify** — `bucket_public=false`, `client_write_policies=0`, `read_policy=1`. Pass.
- **Public URL** — curl → HTTP `400` (not 200). Pass.
- **Smoke** — all `smokePaths` HTTP 200.
- **Advisors (security)** — same baseline as 0002/0003; no new warnings.
- **2026-10-16T11:15Z** status → `blocked`: owner must (1) reload the test playground and confirm photos still show via signed URLs; (2) delete that playground in `/admin/playgrounds`, then reply so the orphan-files query can run.
- **2026-10-16T12:08Z** owner deleted the test playground. After-deletion query: `orphan_files=0` (also `photos=0`, `storage_objects=0`). status → `done`.

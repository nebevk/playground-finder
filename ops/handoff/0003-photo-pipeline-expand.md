---
id: 0003
title: Photo pipeline 1/2 — server-checked uploads and signed URLs (expand)
status: ready
order: migrations-first
destructive: false
migrations: [20261016110000_photos_read_unflagged.sql]
checksums: [0cb04429e3368965]
depends_on: [0002]
backlog: [BL-02, BL-03]
requirements: [FR-ADD-03, FR-COM-06, GDPR-09, GDPR-14, GDPR-15, GDPR-16]
---

## Why

Implements [ADR-0002](../../docs/adr/0002-photo-pipeline.md), part 1 of 2. Fixes:

- **Bug, live in production:** adding a playground with ~3+ normal photos fails (`Body exceeded 1 MB limit`). That's why production has 0 photos.
- **GPS leaks (GDPR-09):** the browser now always re-encodes, and the server rejects any file still carrying EXIF/XMP metadata. It checks the real file type from the bytes and uploads with the service role.
- **Flagged photos stay public (GDPR-14, FR-COM-06):** the code now serves photos as 1-hour signed URLs. A new Storage read policy only allows them while neither the photo nor its playground is flagged. The bucket stays public until ticket 0004.
- **"Deleted" photos stay public (GDPR-15):** admin deletes now remove the files too.
- **Photos in link previews (GDPR-16):** user photos are no longer used as Open Graph images.

This is expand-only. The new code works with the bucket still public, which I tested locally by withholding the 0004 migration. The migration only adds a read policy and an index.

## Changes

- `supabase/migrations/20261016110000_photos_read_unflagged.sql`: Storage select policy and `photos(storage_path)` index.
- `next.config.ts`: Server Action body limit 4 MB, under Vercel's 4.5 MB.
- `src/lib/photo-checks.ts` (new): limits, magic-byte type check, EXIF/XMP detection.
- `src/lib/image.ts`, `src/app/[locale]/add/AddFlow.tsx`: always re-encode, refuse on failure, 3.5 MB total budget, new messages (sl + en).
- `src/app/[locale]/add/actions.ts`: byte checks, service-role upload, total-size check.
- `src/lib/playgrounds.ts`: signed URLs. `src/app/[locale]/playground/[id]/page.tsx`: no photo in Open Graph.
- `src/lib/photo-storage.ts` (new) + `src/app/[locale]/admin/actions.ts`: deletes remove files.
- Tests: `photo-checks.test.ts`, `admin-actions.test.ts`, action tests, pgTAP storage tests, e2e multi-photo + photo display (signed URL, anonymous visitor, no `og:image`).

**Production prerequisite:** `SUPABASE_SECRET_KEY` must be set in Vercel (Production). Admin actions and account deletion already need it. Without it, uploads fail with "upload failed".

## Local verification (Claude Code)

- Final state (0003 + 0004 migrations): `pnpm test:db` 46 pass (1 known TODO: BL-20); `pnpm test:e2e` 30 pass, 7 known gaps skipped; `pnpm test` 44 pass. 2026-10-16.
- **Interim state** (this ticket only: public bucket + this migration + new code): the 4 photo e2e tests pass, including anonymous viewing through signed URLs. 2026-10-16.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:req`, `pnpm ops:check`: pass.

## Production steps (Cursor)

1. Preflight. If the Vercel tools can list env var names, confirm `SUPABASE_SECRET_KEY` exists for Production; if not, note that it couldn't be checked.
2. `apply_migration` name `photos_read_unflagged` with the exact contents of `supabase/migrations/20261016110000_photos_read_unflagged.sql`.
3. Run *Verify in production*.
4. Commit and push, watch the deploy, smoke-test.
5. **Owner check.** Ask the owner to add a test playground at `/sl/add` with **3 photos** from their phone, then open its page and confirm the photos show. Wait for their confirmation. Then run the *Photo check* query below and record the result. Ask the owner to **keep** this playground: ticket 0004 uses it.
6. `get_advisors` (`security`): compare with 0002's list.

## Verify in production

```sql
-- Read policy and index
select
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'playground_photos_read_unflagged') as read_policy,
  (select count(*) from pg_indexes where schemaname = 'public' and indexname = 'photos_storage_path_idx') as path_index;
```

Expect: `1`, `1`.

**Photo check** (after the owner's test):

```sql
-- Newest photos: stored as re-encoded images, in the uploader's folder, with matching files
select p.storage_path, p.flagged, o.metadata->>'mimetype' as mimetype, (o.metadata->>'size')::int as bytes
from public.photos p left join storage.objects o on o.bucket_id = 'playground-photos' and o.name = p.storage_path
order by p.created_at desc limit 5;
```

Expect: the test photos, each with a file (`mimetype` `image/webp` or `image/jpeg`, `bytes` in the low hundreds of KB), path `<uuid>/<uuid>/<n>-<uuid>.<ext>`.

## Rollback

Code: promote the previous Vercel deployment. Migration: only with the owner's confirmation, applied as `revert_photos_read_unflagged`:

```sql
drop policy if exists "playground_photos_read_unflagged" on storage.objects;
drop index if exists public.photos_storage_path_idx;
```

## Result log (Cursor)

- 

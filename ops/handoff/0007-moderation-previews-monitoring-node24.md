---
id: 0007
title: Moderation photo previews, error tracking, FK indexes, Node 24
status: ready
order: migrations-first
destructive: false
migrations: [20261016200000_index_foreign_keys.sql]
checksums: [39409ae8cfa72050]
depends_on: [0006]
backlog: [BL-48, BL-32, BL-46, BL-09, BL-34]
requirements: [FR-ADM-02, NFR-OPS-04, NFR-PERF-03, NFR-OPS-02]
---

## Why

- **BL-48, moderation previews:** the queue showed reported photos only as a file path. Since the bucket became private (ops 0004), admins couldn't see them at all. Flagged and reported photos now appear as previews: 10-minute links signed with the service role, on the admin-only page.
- **BL-32, error tracking (Sentry):** production errors currently disappear into Vercel logs. Settings: off until a DSN is set; errors only (no tracing, no session replay, which could record children's photos on screen); no IPs, cookies or user identity; one-time tokens in URLs (reset and confirmation links) scrubbed. Phones download the SDK (75 KB gzip, lazily after the page) only when it's configured. Admins can trigger a test error at `/sl/admin/sentry-test`.
- **BL-46:** index the 5 foreign keys the performance advisor flagged in ops 0001.
- **BL-09:** Node 24 LTS for Vercel (`engines.node: 24.x`), CI and `.nvmrc`. Node 20 is end of life and Node 22 leaves LTS in April 2027.
- **BL-34:** removed the stale `i18n_check.txt`.

## Changes

- `supabase/migrations/20261016200000_index_foreign_keys.sql` + pgTAP check that every foreign key is indexed.
- `src/lib/photo-storage.ts` `adminPhotoPreviewUrls`, `src/app/[locale]/admin/moderation/page.tsx`, i18n `admin.moderation.{photoAlt,openPhoto,photoMissing}`.
- `@sentry/nextjs` 11.8; `src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/lib/sentry-options.ts` (scrubbing), `src/lib/sentry-client.ts`, `src/app/[locale]/admin/sentry-test/route.ts`; `/privacy` lists Sentry only when configured.
- `package.json` `engines`, `.nvmrc`, CI `node-version-file`.
- Tests: moderation preview (e2e); Sentry options and scrubbing (unit); a test error reaching a local stand-in Sentry, with the URL token absent (e2e, `tests/e2e/sentry-sink.ts`); the test-error route is a 404 for non-admins.

## Local verification (Claude Code)

- `pnpm test` 61 pass (also under Node 24.22: 61 pass, typecheck OK). `pnpm test:db` 50 pass. `pnpm test:e2e` 41 pass, twice in a row, 7 known gaps skipped. 2026-10-16.
- Bundle check: without a DSN, the Sentry SDK chunk is never requested by the browser (checked on `/sl`, `/sl/map`, `/sl/login`, `/sl/privacy`).
- `pnpm typecheck`, `pnpm lint`, `pnpm test:req`, `pnpm ops:check`: pass.

## Production steps (Cursor)

1. Preflight.
2. `apply_migration` name `index_foreign_keys` with the exact file contents. Run *Verify in production*, then `get_advisors` (`performance`): `unindexed_foreign_keys` should be gone.
3. Commit and push; watch the deploy. **This is the first build on Node 24.** If Vercel rejects the version, the owner sets *Project → Settings → General → Node.js Version* to 24.x and redeploys. Record what happened. Then smoke-test.
4. **Owner: set up Sentry** (set `blocked` until done):
   - At sentry.io, create the organization in the **EU (Frankfurt) data region**. The DSN host must end in `.de.sentry.io`. Create a project of type *Next.js* and copy the DSN.
   - In the project, *Settings → Security & Privacy*: turn on **Prevent Storing of IP Addresses**; leave the data scrubber on.
   - In Vercel (Production), set `NEXT_PUBLIC_SENTRY_DSN` to the DSN, then **redeploy**. `NEXT_PUBLIC_` values are baked in at build time.
5. **Owner test:** signed in as admin, open `https://playground-finder-seven.vercel.app/sl/admin/sentry-test`; an error page is expected. Within a minute, Sentry → Issues should show "Sentry test error (triggered by an admin via /admin/sentry-test)". Open it: there should be no IP address and no user/email. Cursor records the outcome.
6. `curl -s <productionUrl>/sl/privacy | grep -c "Sentry"` → ≥ 1 after the redeploy.
7. Optional owner check: if anything is flagged, `/sl/admin/moderation` shows photo previews.
8. `get_advisors` (`security`), then set `status: done`.

## Verify in production

```sql
select indexname from pg_indexes
where schemaname = 'public' and indexname in (
  'favorites_playground_id_idx', 'photos_user_id_idx', 'reports_user_id_idx',
  'review_helpful_user_id_idx', 'reviews_user_id_idx')
order by 1;
```

Expect: 5 rows.

## Rollback

Sentry: remove `NEXT_PUBLIC_SENTRY_DSN` and redeploy (tracking off, SDK no longer downloaded). Node: revert `engines` and `.nvmrc`. Indexes are harmless; if needed, apply as `revert_index_foreign_keys` with the owner's confirmation:

```sql
drop index if exists public.favorites_playground_id_idx, public.photos_user_id_idx,
  public.reports_user_id_idx, public.review_helpful_user_id_idx, public.reviews_user_id_idx;
```

## Result log (Cursor)

- 

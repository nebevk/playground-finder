-- Schema-level guarantees. Runs against a freshly migrated database (`pnpm test:db`).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- [NFR-OPS-01] all migrations applied: the core tables exist.
select tables_are(
  'public',
  array['favorites', 'photos', 'playgrounds', 'profiles', 'reports', 'review_helpful', 'reviews'],
  '[NFR-OPS-01] migrations create exactly the expected public tables'
);

-- [NFR-SEC-01] RLS is mandatory on every table.
select is(
  (select array_agg(c.relname::text order by c.relname)
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  null,
  '[NFR-SEC-01] RLS is enabled on every table in the public schema'
);

-- [GDPR-03] data minimisation: profiles hold no personal data beyond a username.
select columns_are(
  'public', 'profiles',
  array['id', 'username', 'avatar_url', 'created_at', 'is_admin'],
  '[GDPR-03] profiles store only id, username, avatar, timestamps and the admin flag'
);

-- [GDPR-08] privacy violation is a report reason.
select ok(
  pg_get_constraintdef((select oid from pg_constraint where conname = 'reports_reason_check'))
    like '%privacy_violation%',
  '[GDPR-08] reports accept the privacy_violation reason'
);

-- [FR-ADD-03] direct Storage API uploads are capped like the app (3 MiB, images only).
select is(
  (select row(file_size_limit, allowed_mime_types)::text from storage.buckets where id = 'playground-photos'),
  row(3145728::bigint, array['image/png', 'image/jpeg', 'image/webp'])::text,
  '[FR-ADD-03] the photo bucket accepts only PNG/JPEG/WebP up to 3 MiB'
);

-- [FR-COM-06] [GDPR-14] flagged photo files must not stay publicly downloadable.
select todo('BL-03: bucket is public, so flagged files stay reachable by URL', 1);
select is(
  (select public from storage.buckets where id = 'playground-photos'),
  false,
  '[FR-COM-06] [GDPR-14] the playground-photos bucket is private'
);

select * from finish();
rollback;

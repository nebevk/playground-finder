-- Publication status (ADR-0003): a playground waiting for review, or rejected, is seen only by admins
-- (and its author, if it has one); nobody but the admin actions, through the service role, can
-- publish, reject or hide one.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- ── helpers (session-local) ─────────────────────────────────────────────────
create function pg_temp.new_user(p_email text) returns uuid language sql as $$
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  values (gen_random_uuid(), p_email, now(), '{}'::jsonb)
  returning id
$$;

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;

-- ── fixtures (as postgres) ──────────────────────────────────────────────────
create temp table ids (k text primary key, v uuid);
grant select on ids to anon, authenticated;
insert into ids values
  ('author', pg_temp.new_user('author@example.com')),
  ('admin',  pg_temp.new_user('reviewer@example.com'));
update public.profiles set is_admin = true where id = (select v from ids where k = 'admin');
create function pg_temp.id(p_k text) returns uuid language sql as $$ select v from ids where k = p_k $$;

-- Two discoveries (one waiting, one rejected), and a waiting playground with an author: no path
-- makes one today, but the author's own policy must still cover it.
insert into public.playgrounds (id, name, location, user_id, status, source, external_id) values
  ('00000000-0000-0000-0000-0000000002a1', 'Waiting', 'SRID=4326;POINT(14.50 46.05)', null, 'pending', 'osm', 'node/1'),
  ('00000000-0000-0000-0000-0000000002a2', 'Declined', 'SRID=4326;POINT(14.51 46.05)', null, 'rejected', 'osm', 'way/2'),
  ('00000000-0000-0000-0000-0000000002a3', 'Mine, waiting', 'SRID=4326;POINT(14.52 46.05)', pg_temp.id('author'), 'pending', 'user', null);

-- ── the columns ─────────────────────────────────────────────────────────────
select lives_ok(
  $$ insert into public.playgrounds (id, name, location)
     values ('00000000-0000-0000-0000-0000000002b1', 'Plain', 'SRID=4326;POINT(14.53 46.05)') $$,
  '[FR-ADM-08] a playground can still be added without saying anything about review'
);
select is(
  (select status || ' ' || source from public.playgrounds where id = '00000000-0000-0000-0000-0000000002b1'),
  'published user',
  '[FR-ADM-08] such a playground is published at once (owner decision, ADR-0003), with source "user"'
);
select throws_ok(
  $$ insert into public.playgrounds (name, location, status) values ('Odd', 'SRID=4326;POINT(14.5 46.0)', 'hidden') $$,
  '23514', null,
  '[FR-ADM-08] a status is pending, published or rejected'
);
select throws_ok(
  $$ insert into public.playgrounds (name, location, source) values ('Odd', 'SRID=4326;POINT(14.5 46.0)', 'google') $$,
  '23514', null,
  '[FR-ADM-08] a source is one the app knows'
);
select throws_ok(
  $$ insert into public.playgrounds (name, location, source, external_id)
     values ('Orphan id', 'SRID=4326;POINT(14.5 46.0)', null, 'node/3') $$,
  '23514', null,
  '[FR-ADM-08] an external id needs its source'
);
select throws_ok(
  $$ insert into public.playgrounds (name, location, source, external_id)
     values ('Again', 'SRID=4326;POINT(14.5 46.0)', 'osm', 'way/2') $$,
  '23505', null,
  '[FR-ADM-07] a rejected discovery can''t be added again'
);

-- A photo on the waiting discovery, as if a later source brought one. Files are written as postgres.
insert into storage.objects (bucket_id, name, owner_id) values
  ('playground-photos', pg_temp.id('author') || '/2a1/0.jpg', pg_temp.id('author'));
insert into public.photos (playground_id, user_id, storage_path) values
  ('00000000-0000-0000-0000-0000000002a1', pg_temp.id('author'), pg_temp.id('author') || '/2a1/0.jpg');

-- ── visitors ────────────────────────────────────────────────────────────────
select pg_temp.act_as_anon();
select is(
  (select count(*)::int from public.playgrounds
    where id in ('00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-0000000002a2',
                 '00000000-0000-0000-0000-0000000002a3')),
  0,
  '[FR-ADM-08] visitors see no waiting or rejected playground'
);
select is(
  (select count(*)::int from public.playgrounds_geo where status <> 'published'),
  0,
  '[FR-ADM-08] nor through the view the map and the sitemap read'
);
select is(
  (select count(*)::int from public.playgrounds_geo where id = '00000000-0000-0000-0000-0000000002b1'),
  1,
  '[FR-ADM-08] published playgrounds stay visible'
);
select is(
  (select count(*)::int from storage.objects where name like '%/2a1/%'),
  0,
  '[FR-ADM-08] visitors can''t read the photo files of a waiting playground'
);
reset role;

-- ── signed-in users ─────────────────────────────────────────────────────────
select pg_temp.act_as(pg_temp.id('author'));
select is(
  (select array_agg(name order by name) from public.playgrounds where status <> 'published'),
  array['Mine, waiting'],
  '[FR-ADM-08] [GDPR-06] a signed-in user sees their own unpublished playground and nobody else''s'
);
select throws_ok(
  $$ insert into public.playgrounds (name, location, user_id, status)
     values ('Self-published', 'SRID=4326;POINT(14.6 46.1)', auth.uid(), 'published') $$,
  '42501', null,
  '[FR-ADM-08] [NFR-SEC-05] users can''t choose a status when adding a playground'
);
select throws_ok(
  $$ insert into public.playgrounds (name, location, user_id, source)
     values ('Disguised', 'SRID=4326;POINT(14.6 46.1)', auth.uid(), 'osm') $$,
  '42501', null,
  '[FR-ADM-08] [NFR-SEC-05] nor a source'
);
select throws_ok(
  $$ update public.playgrounds set status = 'published' where id = '00000000-0000-0000-0000-0000000002a3' $$,
  '42501', null,
  '[FR-ADM-08] [NFR-SEC-05] authors can''t publish their own waiting playground'
);
select lives_ok(
  $$ insert into public.playgrounds (name, location, user_id)
     values ('Added today', 'SRID=4326;POINT(14.6 46.1)', auth.uid()) $$,
  '[FR-ADM-08] adding a playground works as before'
);
select is(
  (select status from public.playgrounds where name = 'Added today'),
  'published',
  '[FR-ADM-08] and it is published at once (owner decision, ADR-0003)'
);
reset role;

-- ── admins ──────────────────────────────────────────────────────────────────
select pg_temp.act_as(pg_temp.id('admin'));
select is(
  (select array_agg(name order by name) from public.playgrounds_geo
    where id in ('00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-0000000002a2',
                 '00000000-0000-0000-0000-0000000002a3')
      and lat is not null),
  array['Declined', 'Mine, waiting', 'Waiting'],
  '[FR-ADM-07] admins see waiting and rejected playgrounds, with their coordinates, for the queue'
);
select is(
  (select count(*)::int from storage.objects where name like '%/2a1/%'),
  1,
  '[FR-ADM-07] admins can read a waiting playground''s photo files (so the visitors'' 0 above is the policy, not a missing file)'
);
select throws_ok(
  $$ update public.playgrounds set status = 'published' where id = '00000000-0000-0000-0000-0000000002a1' $$,
  '42501', null,
  '[FR-ADM-07] [NFR-SEC-05] even admins publish only through the admin actions (service role), not their own client'
);
reset role;

select * from finish();
rollback;

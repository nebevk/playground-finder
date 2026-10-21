-- Rate limits (NFR-SEC-04): per person in the database, per client through consume_rate_limit.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- ── helpers (session-local) ─────────────────────────────────────────────────
create function pg_temp.new_user(p_email text, p_app_meta jsonb default '{}') returns uuid language sql as $$
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
  values (gen_random_uuid(), p_email, now(), '{}'::jsonb, p_app_meta)
  returning id
$$;

-- As a signed-in user; the JWT carries app_metadata, as Supabase's does.
create function pg_temp.act_as(p_uid uuid, p_app_meta jsonb default '{}') returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'app_metadata', p_app_meta)::text,
    true
  );
  execute 'set local role authenticated';
end $$;

-- ── fixtures (as postgres) ──────────────────────────────────────────────────
create temp table ids (k text primary key, v uuid);
grant select on ids to anon, authenticated;
insert into ids values
  ('busy',   pg_temp.new_user('busy@example.com')),
  ('exempt', pg_temp.new_user('exempt@example.com', '{"rate_limit_exempt": true}')),
  ('admin',  pg_temp.new_user('boss@example.com'));
update public.profiles set is_admin = true where id = (select v from ids where k = 'admin');
create function pg_temp.id(p_k text) returns uuid language sql as $$ select v from ids where k = p_k $$;

-- 21 playgrounds to review and report (one review and one report per person per target).
insert into public.playgrounds (id, name, location)
select ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'Target ' || g, 'SRID=4326;POINT(14.5 46.05)'
from generate_series(1, 21) g;

-- ── per person ───────────────────────────────────────────────────────────────
select pg_temp.act_as(pg_temp.id('busy'));
select lives_ok(
  $$ insert into public.playgrounds (name, location, user_id)
     select 'Mine ' || g, 'SRID=4326;POINT(14.51 46.06)', auth.uid() from generate_series(1, 10) g $$,
  '[NFR-SEC-04] ten new playgrounds in an hour are fine'
);
select throws_ok(
  $$ insert into public.playgrounds (name, location, user_id) values ('One too many', 'SRID=4326;POINT(14.51 46.06)', auth.uid()) $$,
  'PT429', null,
  '[NFR-SEC-04] the 11th playground in an hour is refused (HTTP 429)'
);

select lives_ok(
  $$ insert into public.reviews (playground_id, user_id, rating)
     select ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid, auth.uid(), 4 from generate_series(1, 20) g $$,
  '[NFR-SEC-04] twenty reviews in an hour are fine'
);
select throws_ok(
  $$ insert into public.reviews (playground_id, user_id, rating) values ('00000000-0000-0000-0000-000000000121', auth.uid(), 4) $$,
  'PT429', null,
  '[NFR-SEC-04] the 21st review in an hour is refused'
);

select lives_ok(
  $$ insert into public.reports (target_type, target_id, user_id, reason)
     select 'playground', ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid, auth.uid(), 'spam'
     from generate_series(1, 20) g $$,
  '[NFR-SEC-04] twenty reports in an hour are fine'
);
select throws_ok(
  $$ insert into public.reports (target_type, target_id, user_id, reason)
     values ('playground', '00000000-0000-0000-0000-000000000121', auth.uid(), 'spam') $$,
  'PT429', null,
  '[NFR-SEC-04] the 21st report in an hour is refused'
);

-- 40 photos over five of the targets (8 each, the per-playground cap), then one more.
select lives_ok(
  $$ insert into public.photos (playground_id, user_id, storage_path)
     select ('00000000-0000-0000-0000-0000000001' || lpad(t::text, 2, '0'))::uuid, auth.uid(),
            auth.uid() || '/' || t || '/' || n || '.jpg'
     from generate_series(1, 5) t, generate_series(1, 8) n $$,
  '[NFR-SEC-04] forty photos in an hour are fine'
);
select throws_ok(
  $$ insert into public.photos (playground_id, user_id, storage_path)
     values ('00000000-0000-0000-0000-000000000106', auth.uid(), auth.uid() || '/6/1.jpg') $$,
  'PT429', null,
  '[NFR-SEC-04] the 41st photo in an hour is refused'
);
reset role;

select pg_temp.act_as(pg_temp.id('exempt'), '{"rate_limit_exempt": true}');
select lives_ok(
  $$ insert into public.playgrounds (name, location, user_id)
     select 'Exempt ' || g, 'SRID=4326;POINT(14.52 46.07)', auth.uid() from generate_series(1, 12) g $$,
  '[NFR-SEC-04] accounts the service role marked rate_limit_exempt are not limited'
);
reset role;

select pg_temp.act_as(pg_temp.id('admin'));
select lives_ok(
  $$ insert into public.playgrounds (name, location, user_id)
     select 'Admin ' || g, 'SRID=4326;POINT(14.53 46.08)', auth.uid() from generate_series(1, 12) g $$,
  '[NFR-SEC-04] admins are not limited'
);
reset role;

-- Someone can't exempt themselves: app_metadata isn't writable from the API, and user metadata
-- (which is) doesn't count.
select pg_temp.act_as(pg_temp.id('busy'));
select throws_ok(
  $$ insert into public.playgrounds (name, location, user_id) values ('Still too many', 'SRID=4326;POINT(14.51 46.06)', auth.uid()) $$,
  'PT429', null,
  '[NFR-SEC-04] the limit still applies on the next attempt'
);
reset role;

-- ── per client (signups and emails) ──────────────────────────────────────────
select is(
  (select array_agg(public.consume_rate_limit('signup:test-client', 3, 3600)) from generate_series(1, 4)),
  array[true, true, true, false],
  '[NFR-SEC-04] consume_rate_limit allows p_max hits per window, then refuses'
);
select ok(
  public.consume_rate_limit('signup:another-client', 3, 3600),
  '[NFR-SEC-04] each client key has its own count'
);
select ok(
  not has_function_privilege('anon', 'public.consume_rate_limit(text, integer, integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.consume_rate_limit(text, integer, integer)', 'execute'),
  '[NFR-SEC-04] only the service role may call consume_rate_limit'
);
select ok(
  not exists (select 1 from information_schema.role_table_grants
              where table_schema = 'private' and table_name = 'rate_limit_hits' and grantee in ('anon', 'authenticated')),
  '[NFR-SEC-04] the hits table is not reachable through the API'
);

select * from finish();
rollback;

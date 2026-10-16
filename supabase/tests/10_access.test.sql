-- Row-level access as anon and as signed-in users, plus the triggers behind community features.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- ── helpers (session-local) ─────────────────────────────────────────────────
create function pg_temp.new_user(p_email text, p_verified boolean default true)
returns uuid language sql as $$
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  values (gen_random_uuid(), p_email, case when p_verified then now() end, '{}'::jsonb)
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
  ('owner',      pg_temp.new_user('owner@example.com')),
  ('r1',         pg_temp.new_user('r1@example.com')),
  ('r2',         pg_temp.new_user('r2@example.com')),
  ('r3',         pg_temp.new_user('r3@example.com')),
  ('unverified', pg_temp.new_user('fresh@example.com', false)),
  ('dup1',       pg_temp.new_user('same@one.si')),
  ('dup2',       pg_temp.new_user('same@two.si'));

create function pg_temp.id(p_k text) returns uuid language sql as $$ select v from ids where k = p_k $$;

insert into public.playgrounds (id, name, location, user_id, flagged) values
  ('00000000-0000-0000-0000-0000000000a1', 'Visible',  'SRID=4326;POINT(14.5058 46.0569)', pg_temp.id('owner'), false),
  ('00000000-0000-0000-0000-0000000000a2', 'Flagged',  'SRID=4326;POINT(14.5100 46.0600)', pg_temp.id('owner'), true),
  ('00000000-0000-0000-0000-0000000000a3', 'Maribor',  'SRID=4326;POINT(15.6459 46.5547)', null, false);

insert into public.reviews (id, playground_id, user_id, rating, comment, flagged) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', pg_temp.id('owner'), 5, 'Super', false),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', pg_temp.id('r1'),    1, 'Spam',  true);

-- ── accounts ────────────────────────────────────────────────────────────────
select is(
  (select count(*)::int from public.profiles where id = pg_temp.id('owner')),
  1,
  '[FR-ACC-01] a profile is created automatically on signup'
);
select is(
  (select array_agg(username order by username) from public.profiles
    where id in (pg_temp.id('dup1'), pg_temp.id('dup2'))),
  array['same', 'same1'],
  '[FR-ACC-01] usernames stay unique when email local parts collide'
);
select todo('BL-20: username is derived from the email local part', 1);
select isnt(
  (select username from public.profiles where id = pg_temp.id('owner')),
  'owner',
  '[GDPR-04] the public username does not reveal the email address'
);

-- ── anonymous visitors ──────────────────────────────────────────────────────
select pg_temp.act_as_anon();
select is(
  (select array_agg(name order by name) from public.playgrounds_geo
    where id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2')),
  array['Visible'],
  '[FR-MAP-01] [FR-COM-06] anon can browse playgrounds but not flagged ones'
);
select is(
  (select array_agg(comment) from public.reviews
    where playground_id = '00000000-0000-0000-0000-0000000000a1'),
  array['Super'],
  '[FR-MAP-01] [FR-COM-06] anon can read reviews but not flagged ones'
);
select throws_ok(
  $$ insert into public.playgrounds (name, location) values ('Anon', 'SRID=4326;POINT(14.5 46.0)') $$,
  '42501', null,
  '[FR-ADD-01] anon cannot add a playground'
);
select lives_ok(
  $$ select public.increment_playground_views('00000000-0000-0000-0000-0000000000a1') $$,
  '[FR-PG-03] anon can register a view'
);
reset role;
select is(
  (select view_count from public.playgrounds where id = '00000000-0000-0000-0000-0000000000a1'),
  1,
  '[FR-PG-03] a registered view increments view_count'
);

-- ── signed-in users ─────────────────────────────────────────────────────────
select pg_temp.act_as(pg_temp.id('r1'));
select lives_ok(
  format($$ insert into public.playgrounds (name, location, user_id)
            values ('Mine', 'SRID=4326;POINT(14.6 46.1)', %L) $$, pg_temp.id('r1')),
  '[FR-ADD-01] a signed-in user can add a playground as themselves'
);
select throws_ok(
  format($$ insert into public.playgrounds (name, location, user_id)
            values ('Forged', 'SRID=4326;POINT(14.6 46.1)', %L) $$, pg_temp.id('owner')),
  '42501', null,
  '[FR-ADD-01] a user cannot add a playground on behalf of someone else'
);
select throws_ok(
  format($$ update public.profiles set is_admin = true where id = %L $$, pg_temp.id('r1')),
  '42501', null,
  '[FR-ADM-01] [NFR-SEC-05] a user cannot make themselves admin'
);
select throws_ok(
  $$ update public.playgrounds set flagged = false where name = 'Mine' $$,
  '42501', null,
  '[NFR-SEC-05] owners cannot change the flagged column'
);
select throws_ok(
  $$ update public.reviews set helpful_count = 99 where id = '00000000-0000-0000-0000-0000000000b1' $$,
  '42501', null,
  '[NFR-SEC-05] users cannot forge helpful_count'
);

-- reviews
select throws_ok(
  format($$ insert into public.reviews (playground_id, user_id, rating)
            values ('00000000-0000-0000-0000-0000000000a3', %L, 6) $$, pg_temp.id('r1')),
  '23514', null,
  '[FR-COM-01] ratings outside 1–5 are rejected'
);
select lives_ok(
  format($$ insert into public.reviews (id, playground_id, user_id, rating, comment)
            values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', %L, 4, 'Lepo') $$,
         pg_temp.id('r1')),
  '[FR-COM-01] a signed-in user can review a playground'
);
select throws_ok(
  format($$ insert into public.reviews (playground_id, user_id, rating)
            values ('00000000-0000-0000-0000-0000000000a3', %L, 3) $$, pg_temp.id('r1')),
  '23505', null,
  '[FR-COM-01] only one review per user per playground'
);
select lives_ok(
  $$ update public.reviews set rating = 5, comment = 'Res lepo' where id = '00000000-0000-0000-0000-0000000000b3' $$,
  '[FR-COM-02] the database lets users edit their own review'
);

-- helpful votes
select lives_ok(
  format($$ insert into public.review_helpful (review_id, user_id)
            values ('00000000-0000-0000-0000-0000000000b1', %L) $$, pg_temp.id('r1')),
  '[FR-COM-03] a user can mark a review helpful'
);
select throws_ok(
  format($$ insert into public.review_helpful (review_id, user_id)
            values ('00000000-0000-0000-0000-0000000000b1', %L) $$, pg_temp.id('r1')),
  '23505', null,
  '[FR-COM-03] one helpful vote per user per review'
);
select todo('BL-11: self-votes are blocked only in the UI', 1);
select throws_ok(
  format($$ insert into public.review_helpful (review_id, user_id)
            values ('00000000-0000-0000-0000-0000000000b3', %L) $$, pg_temp.id('r1')),
  '42501', null,
  '[FR-COM-03] users cannot vote their own review helpful'
);
reset role;
select is(
  (select helpful_count from public.reviews where id = '00000000-0000-0000-0000-0000000000b1'),
  1,
  '[FR-COM-03] helpful_count is kept in sync by trigger'
);

-- photos need a verified email
select pg_temp.act_as(pg_temp.id('unverified'));
select todo('BL-01: only the Server Action checks email verification', 1);
select throws_ok(
  format($$ insert into public.photos (playground_id, user_id, storage_path)
            values ('00000000-0000-0000-0000-0000000000a1', %L, 'x/y/z.jpg') $$, pg_temp.id('unverified')),
  '42501', null,
  '[FR-ADD-04] the database rejects photos from unverified users'
);
reset role;

-- favourites are private
select pg_temp.act_as(pg_temp.id('owner'));
insert into public.favorites (user_id, playground_id) values (pg_temp.id('owner'), '00000000-0000-0000-0000-0000000000a1');
select pg_temp.act_as(pg_temp.id('r2'));
select is(
  (select count(*)::int from public.favorites),
  0,
  '[FR-PG-04] users cannot see other users'' favourites'
);
reset role;

-- ── reports and auto-flagging ───────────────────────────────────────────────
select pg_temp.act_as(pg_temp.id('r1'));
select throws_ok(
  $$ insert into public.reports (target_type, target_id, user_id, reason)
     values ('playground', '00000000-0000-0000-0000-0000000000a1', auth.uid(), 'bogus') $$,
  '23514', null,
  '[FR-COM-04] unknown report reasons are rejected'
);
select lives_ok(
  $$ insert into public.reports (target_type, target_id, user_id, reason)
     values ('playground', '00000000-0000-0000-0000-0000000000a1', auth.uid(), 'privacy_violation') $$,
  '[FR-COM-04] [GDPR-08] a user can report a playground as a privacy violation'
);
select throws_ok(
  $$ insert into public.reports (target_type, target_id, user_id, reason)
     values ('playground', '00000000-0000-0000-0000-0000000000a1', auth.uid(), 'spam') $$,
  '23505', null,
  '[FR-COM-04] one report per user per target'
);
select pg_temp.act_as(pg_temp.id('r2'));
insert into public.reports (target_type, target_id, user_id, reason)
  values ('playground', '00000000-0000-0000-0000-0000000000a1', auth.uid(), 'spam');
reset role;
select is(
  (select flagged from public.playgrounds where id = '00000000-0000-0000-0000-0000000000a1'),
  false,
  '[FR-COM-05] two reports do not flag the target'
);
select pg_temp.act_as(pg_temp.id('r3'));
insert into public.reports (target_type, target_id, user_id, reason)
  values ('playground', '00000000-0000-0000-0000-0000000000a1', auth.uid(), 'other');
reset role;
select is(
  (select flagged from public.playgrounds where id = '00000000-0000-0000-0000-0000000000a1'),
  true,
  '[FR-COM-05] the third report flags the target for admin review'
);

-- ── admin quick-add duplicate check (as postgres, so flagged rows count too) ─
select is(
  -- Scoped to this file's fixtures: seed.sql has other Ljubljana playgrounds within 1 km.
  (select array_agg(name order by distance_m) from public.playgrounds_near(46.0569, 14.5058, 1000)
    where id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
                 '00000000-0000-0000-0000-0000000000a3')),
  array['Visible', 'Flagged'],
  '[FR-ADM-05] playgrounds_near returns nearby playgrounds nearest-first and skips far-away ones'
);

-- ── right to be forgotten ───────────────────────────────────────────────────
insert into public.photos (playground_id, user_id, storage_path)
  values ('00000000-0000-0000-0000-0000000000a3', pg_temp.id('r1'), 'r1/a3/0.jpg');
delete from auth.users where id = pg_temp.id('r1');

select is(
  (select count(*)::int from public.profiles where id = pg_temp.id('r1'))
  + (select count(*)::int from public.reviews where user_id = pg_temp.id('r1'))
  + (select count(*)::int from public.review_helpful where user_id = pg_temp.id('r1'))
  + (select count(*)::int from public.reports where user_id = pg_temp.id('r1'))
  + (select count(*)::int from public.photos where user_id = pg_temp.id('r1')),
  0,
  '[GDPR-05] deleting an account removes profile, reviews, helpful votes, reports and photo rows'
);
select is(
  (select user_id from public.playgrounds where name = 'Mine'),
  null,
  '[GDPR-05] playgrounds the user submitted stay, anonymised'
);
select is(
  (select helpful_count from public.reviews where id = '00000000-0000-0000-0000-0000000000b1'),
  0,
  '[GDPR-05] helpful counts drop when a deleted user''s votes go'
);

select * from finish();
rollback;

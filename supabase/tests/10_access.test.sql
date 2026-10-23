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
select lives_ok(
  $$ update public.playgrounds
       set description = 'Edited', has_toilets = true, surface_type = 'sand',
           location = 'SRID=4326;POINT(14.61 46.11)'
     where name = 'Mine' $$,
  '[FR-ADD-08] the person who added a playground can edit its details and move its pin'
);
select is(
  (select count(*)::int from public.playgrounds
    where name = 'Mine' and description = 'Edited' and has_toilets and surface_type = 'sand'),
  1,
  '[FR-ADD-08] the edit is saved'
);
-- Someone else's playground: the owner-only policy matches no rows, so nothing changes.
update public.playgrounds set name = 'Hijacked' where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select name from public.playgrounds where id = '00000000-0000-0000-0000-0000000000a1'),
  'Visible',
  '[FR-ADD-08] nobody else can edit a playground'
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
  format($$ insert into public.reviews (playground_id, user_id, rating, comment)
            values ('00000000-0000-0000-0000-0000000000a3', %L, 4, 'Lepo') $$,
         pg_temp.id('r1')),
  '[FR-COM-01] a signed-in user can review a playground'
);
-- Only the columns the app sends (ops 0014): ids, timestamps, counters and flags come from their
-- defaults, so nobody can backdate past the rate limits, inflate a count or pick an id.
select throws_ok(
  format($$ insert into public.reviews (playground_id, user_id, rating, helpful_count)
            values ('00000000-0000-0000-0000-0000000000a1', %L, 4, 99) $$, pg_temp.id('r1')),
  '42501', null,
  '[NFR-SEC-07] users cannot set a new review''s helpful_count'
);
select throws_ok(
  format($$ insert into public.playgrounds (name, location, user_id, view_count)
            values ('Popular', 'SRID=4326;POINT(14.5 46.05)', %L, 1000) $$, pg_temp.id('r1')),
  '42501', null,
  '[NFR-SEC-07] users cannot set a new playground''s view_count'
);
select throws_ok(
  format($$ insert into public.reports (target_type, target_id, user_id, reason, created_at)
            values ('playground', '00000000-0000-0000-0000-0000000000a1', %L, 'spam', '2000-01-01') $$, pg_temp.id('r1')),
  '42501', null,
  '[NFR-SEC-07] users cannot backdate what they add (rate limits count by created_at)'
);
select throws_ok(
  format($$ insert into public.reviews (playground_id, user_id, rating)
            values ('00000000-0000-0000-0000-0000000000a3', %L, 3) $$, pg_temp.id('r1')),
  '23505', null,
  '[FR-COM-01] only one review per user per playground'
);
select lives_ok(
  $$ update public.reviews set rating = 5, comment = 'Res lepo'
     where playground_id = '00000000-0000-0000-0000-0000000000a3' and user_id = auth.uid() $$,
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
select throws_ok(
  format($$ insert into public.review_helpful (review_id, user_id)
            select id, %1$L from public.reviews
            where playground_id = '00000000-0000-0000-0000-0000000000a3' and user_id = %1$L $$, pg_temp.id('r1')),
  '42501', null,
  '[FR-COM-03] users cannot vote their own review helpful'
);
reset role;
select is(
  (select helpful_count from public.reviews where id = '00000000-0000-0000-0000-0000000000b1'),
  1,
  '[FR-COM-03] helpful_count is kept in sync by trigger'
);

-- photos need a verified email and must live in the uploader's own folder (rows and files)
select pg_temp.act_as(pg_temp.id('unverified'));
select throws_ok(
  format($$ insert into public.photos (playground_id, user_id, storage_path)
            values ('00000000-0000-0000-0000-0000000000a1', %L, %L) $$,
         pg_temp.id('unverified'), pg_temp.id('unverified') || '/a1/0.jpg'),
  '42501', null,
  '[FR-ADD-04] the database rejects photo rows from unverified users'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id)
            values ('playground-photos', %L, %L) $$,
         pg_temp.id('unverified') || '/a1/0.jpg', pg_temp.id('unverified')),
  '42501', null,
  '[FR-ADD-04] storage rejects photo files from unverified users'
);
select pg_temp.act_as(pg_temp.id('owner'));
select lives_ok(
  format($$ insert into public.photos (playground_id, user_id, storage_path)
            values ('00000000-0000-0000-0000-0000000000a1', %L, %L) $$,
         pg_temp.id('owner'), pg_temp.id('owner') || '/a1/0.jpg'),
  '[FR-ADD-04] [NFR-SEC-07] a verified user can add a photo row in their own folder'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id)
            values ('playground-photos', %L, %L) $$,
         pg_temp.id('owner') || '/a1/0.jpg', pg_temp.id('owner')),
  '42501', null,
  '[GDPR-09] clients cannot write to the photo bucket directly, even verified users in their own folder'
);
select pg_temp.act_as(pg_temp.id('r2'));
select throws_ok(
  format($$ insert into public.photos (playground_id, user_id, storage_path)
            values ('00000000-0000-0000-0000-0000000000a1', %L, %L) $$,
         pg_temp.id('r2'), pg_temp.id('owner') || '/a1/0.jpg'),
  '42501', null,
  '[NFR-SEC-07] a photo row cannot point at another user''s file'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id)
            values ('playground-photos', %L, %L) $$,
         pg_temp.id('owner') || '/a1/1.jpg', pg_temp.id('r2')),
  '42501', null,
  '[NFR-SEC-07] a user cannot upload into another user''s folder'
);

-- At most 8 photos per playground per person, however many batches (BL-47).
select pg_temp.act_as(pg_temp.id('r3'));
select lives_ok(
  format($$ insert into public.photos (playground_id, user_id, storage_path)
            select '00000000-0000-0000-0000-0000000000a3', %1$L, %1$L || '/a3/' || g || '.jpg'
            from generate_series(1, 8) g $$, pg_temp.id('r3')),
  '[NFR-SEC-07] a person can add up to 8 photos to a playground'
);
select throws_ok(
  format($$ insert into public.photos (playground_id, user_id, storage_path)
            values ('00000000-0000-0000-0000-0000000000a3', %1$L, %1$L || '/a3/9.jpg') $$, pg_temp.id('r3')),
  '23514', null,
  '[NFR-SEC-07] a 9th photo of the same playground by the same person is rejected'
);

-- Names and texts: a real name, bounded lengths (BL-47).
select throws_ok(
  format($$ insert into public.playgrounds (name, location, user_id)
            values ('   ', 'SRID=4326;POINT(14.6 46.1)', %L) $$, pg_temp.id('r3')),
  '23514', null,
  '[NFR-SEC-07] a playground needs a name that isn''t blank'
);
select throws_ok(
  format($$ insert into public.playgrounds (name, location, user_id)
            values (repeat('a', 121), 'SRID=4326;POINT(14.6 46.1)', %L) $$, pg_temp.id('r3')),
  '23514', null,
  '[NFR-SEC-07] a playground name is at most 120 characters'
);
select throws_ok(
  format($$ insert into public.playgrounds (name, description, location, user_id)
            values ('Long', repeat('a', 2001), 'SRID=4326;POINT(14.6 46.1)', %L) $$, pg_temp.id('r3')),
  '23514', null,
  '[NFR-SEC-07] a playground description is at most 2000 characters'
);
select throws_ok(
  format($$ insert into public.reviews (playground_id, user_id, rating, comment)
            values ('00000000-0000-0000-0000-0000000000a1', %L, 4, repeat('a', 2001)) $$, pg_temp.id('r3')),
  '23514', null,
  '[NFR-SEC-07] a review comment is at most 2000 characters'
);
reset role;

-- Reading a file (which is what creating a signed URL needs) only while neither the photo
-- nor its playground is flagged. Files are written as postgres: clients can't write them.
insert into storage.objects (bucket_id, name, owner_id) values
  ('playground-photos', pg_temp.id('owner') || '/a1/0.jpg', pg_temp.id('owner')),
  ('playground-photos', pg_temp.id('owner') || '/a1/flagged.jpg', pg_temp.id('owner')),
  ('playground-photos', pg_temp.id('owner') || '/a2/0.jpg', pg_temp.id('owner'));
insert into public.photos (playground_id, user_id, storage_path, flagged) values
  ('00000000-0000-0000-0000-0000000000a1', pg_temp.id('owner'), pg_temp.id('owner') || '/a1/flagged.jpg', true),
  ('00000000-0000-0000-0000-0000000000a2', pg_temp.id('owner'), pg_temp.id('owner') || '/a2/0.jpg', false);
select pg_temp.act_as_anon();
select is(
  (select array_agg(name order by name) from storage.objects
    where bucket_id = 'playground-photos' and name like pg_temp.id('owner') || '/%'),
  array[pg_temp.id('owner') || '/a1/0.jpg'],
  '[FR-COM-06] [GDPR-14] visitors can read only photos that aren''t flagged, on playgrounds that aren''t flagged'
);
reset role;

-- Owners can read their own flagged rows (right of access: "Export my data"); others can't.
select pg_temp.act_as(pg_temp.id('owner'));
select is(
  (select count(*)::int from public.playgrounds where id = '00000000-0000-0000-0000-0000000000a2')
  + (select count(*)::int from public.photos where storage_path like '%/a1/flagged.jpg'),
  2,
  '[GDPR-06] owners can read their own flagged playgrounds and photos'
);
select pg_temp.act_as(pg_temp.id('r1'));
select is(
  (select count(*)::int from public.reviews where id = '00000000-0000-0000-0000-0000000000b2'),
  1,
  '[GDPR-06] owners can read their own flagged reviews'
);
select pg_temp.act_as(pg_temp.id('r2'));
select is(
  (select count(*)::int from public.playgrounds where id = '00000000-0000-0000-0000-0000000000a2')
  + (select count(*)::int from public.reviews where id = '00000000-0000-0000-0000-0000000000b2')
  + (select count(*)::int from public.photos where storage_path like '%/a1/flagged.jpg'),
  0,
  '[FR-COM-06] other users still cannot read flagged playgrounds, reviews or photos'
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

-- Only verified reporters count: 1 unverified + 2 verified reports must not hide Maribor.
select pg_temp.act_as(pg_temp.id('unverified'));
insert into public.reports (target_type, target_id, user_id, reason)
  values ('playground', '00000000-0000-0000-0000-0000000000a3', auth.uid(), 'spam');
select pg_temp.act_as(pg_temp.id('r1'));
insert into public.reports (target_type, target_id, user_id, reason)
  values ('playground', '00000000-0000-0000-0000-0000000000a3', auth.uid(), 'spam');
select pg_temp.act_as(pg_temp.id('r2'));
insert into public.reports (target_type, target_id, user_id, reason)
  values ('playground', '00000000-0000-0000-0000-0000000000a3', auth.uid(), 'spam');
reset role;
select is(
  (select flagged from public.playgrounds where id = '00000000-0000-0000-0000-0000000000a3'),
  false,
  '[NFR-SEC-06] reports from unverified accounts do not count toward auto-flagging'
);
select pg_temp.act_as(pg_temp.id('r3'));
insert into public.reports (target_type, target_id, user_id, reason)
  values ('playground', '00000000-0000-0000-0000-0000000000a3', auth.uid(), 'spam');
reset role;
select is(
  (select flagged from public.playgrounds where id = '00000000-0000-0000-0000-0000000000a3'),
  true,
  '[NFR-SEC-06] three verified reports still flag the target'
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

-- Equipment: only the keys the app knows (ops 0014).
select pg_temp.act_as(pg_temp.id('r2'));
select lives_ok(
  format($$ insert into public.playgrounds (name, location, user_id, equipment)
            values ('With swings', 'SRID=4326;POINT(14.5 46.05)', %L, '["swings", "slides"]') $$, pg_temp.id('r2')),
  '[FR-ADD-07] a playground can list known equipment'
);
select throws_ok(
  format($$ insert into public.playgrounds (name, location, user_id, equipment)
            values ('With a moat', 'SRID=4326;POINT(14.5 46.05)', %L, '["swings", "moat"]') $$, pg_temp.id('r2')),
  '23514', null,
  '[FR-ADD-07] unknown equipment is rejected'
);

-- More options (ops 0017): baby swings and the rest, more surfaces, features that start unknown.
select lives_ok(
  format($$ insert into public.playgrounds (name, location, user_id, equipment, surface_type,
                                            has_benches, has_toddler_area, is_accessible, has_lighting)
            values ('For babies', 'SRID=4326;POINT(14.5 46.05)', %L, '["baby_swings", "nest_swing", "water_play"]',
                    'woodchips', true, true, false, false) $$, pg_temp.id('r2')),
  '[FR-ADD-07] a user can add a playground with baby swings, a newer surface and the newer features'
);
select throws_ok(
  format($$ insert into public.playgrounds (name, location, user_id, surface_type)
            values ('On lava', 'SRID=4326;POINT(14.5 46.05)', %L, 'lava') $$, pg_temp.id('r2')),
  '23514', null,
  '[FR-ADD-02] an unknown surface is rejected'
);
select is(
  (select has_benches from public.playgrounds where name = 'With swings'),
  null::boolean,
  '[FR-PG-01] the newer features start out unknown'
);
update public.playgrounds set has_lighting = true where name = 'For babies';
select is(
  (select has_lighting from public.playgrounds where name = 'For babies'),
  true,
  '[FR-ADD-08] the owner can answer the newer features'
);

-- Favourites: each person's own (FR-PG-04).
select lives_ok(
  format($$ insert into public.favorites (playground_id, user_id)
            values ('00000000-0000-0000-0000-0000000000a1', %L) $$, pg_temp.id('r2')),
  '[FR-PG-04] a user can save a favourite'
);
select throws_ok(
  format($$ insert into public.favorites (playground_id, user_id)
            values ('00000000-0000-0000-0000-0000000000a1', %L) $$, pg_temp.id('r1')),
  '42501', null,
  '[FR-PG-04] nobody can save a favourite for someone else'
);
select is(
  (select array_agg(user_id) from public.favorites),
  array[pg_temp.id('r2')],
  '[FR-PG-04] people see only their own favourites'
);
select lives_ok(
  $$ delete from public.favorites where playground_id = '00000000-0000-0000-0000-0000000000a1' and user_id = auth.uid() $$,
  '[FR-PG-04] a user can remove a favourite'
);
reset role;
select is(
  (select count(*)::int from public.favorites where user_id = pg_temp.id('r2')),
  0,
  '[FR-PG-04] the favourite is gone'
);

select * from finish();
rollback;

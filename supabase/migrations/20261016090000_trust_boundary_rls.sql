-- ops 0002: enforce in the database the rules the app already enforces (NFR-SEC-07).
-- The publishable key is public, so every rule a Server Action checks must also hold for
-- direct PostgREST / Storage calls. Expand-only: the deployed app already satisfies all of it.

-- Is the calling user's email verified? SECURITY DEFINER because auth.users is not readable
-- by API roles; lives in `private`, which PostgREST does not expose.
create or replace function private.is_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select u.email_confirmed_at is not null from auth.users u where u.id = auth.uid()),
    false
  );
$$;
revoke execute on function private.is_verified() from public;
grant execute on function private.is_verified() to anon, authenticated;

-- FR-ADD-04 + NFR-SEC-07: photo rows only from verified users, pointing into their own folder
-- (the app stores files at `<user id>/<playground id>/<n>-<uuid>.<ext>`).
drop policy if exists "photos_insert_authed" on public.photos;
create policy "photos_insert_authed" on public.photos
  for insert with check (
    (select auth.uid()) = user_id
    and (select private.is_verified())
    and storage_path like (select auth.uid())::text || '/%'
  );

-- Same rules for the files themselves.
drop policy if exists "playground_photos_insert_authed" on storage.objects;
create policy "playground_photos_insert_authed" on storage.objects
  for insert with check (
    bucket_id = 'playground-photos'
    and auth.role() = 'authenticated'
    and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_verified())
  );

-- FR-COM-03: no "helpful" votes on your own review.
drop policy if exists "review_helpful_insert_own" on public.review_helpful;
create policy "review_helpful_insert_own" on public.review_helpful
  for insert with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.reviews r
      where r.id = review_id and r.user_id = (select auth.uid())
    )
  );

-- NFR-SEC-06: only reports from verified accounts count toward auto-flagging, so throwaway
-- accounts can't hide content. Unverified reports are still stored for admins to see.
create or replace function public.auto_flag_on_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int;
begin
  select count(*) into cnt
  from public.reports r
  join auth.users u on u.id = r.user_id
  where r.target_type = new.target_type
    and r.target_id = new.target_id
    and u.email_confirmed_at is not null;

  if cnt >= 3 then
    if new.target_type = 'playground' then
      update public.playgrounds set flagged = true where id = new.target_id;
    elsif new.target_type = 'review' then
      update public.reviews set flagged = true where id = new.target_id;
    elsif new.target_type = 'photo' then
      update public.photos set flagged = true where id = new.target_id;
    end if;
  end if;

  return new;
end;
$$;

-- FR-ADD-03: production's bucket allowed 10 MiB; match supabase/config.toml and the app (3 MiB).
update storage.buckets
set file_size_limit = 3145728
where id = 'playground-photos' and (file_size_limit is null or file_size_limit > 3145728);

drop policy if exists "playground_photos_read_all" on storage.objects;

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

drop policy if exists "playgrounds_select_admin_flagged" on public.playgrounds;
drop policy if exists "photos_select_admin_flagged" on public.photos;
drop policy if exists "reviews_select_admin_flagged" on public.reviews;
drop policy if exists "reports_select_admin" on public.reports;
drop policy if exists "playgrounds_update_admin" on public.playgrounds;
drop policy if exists "playgrounds_delete_admin" on public.playgrounds;
drop policy if exists "photos_update_admin" on public.photos;
drop policy if exists "photos_delete_admin" on public.photos;
drop policy if exists "reviews_update_admin" on public.reviews;
drop policy if exists "reviews_delete_admin" on public.reviews;

create policy "playgrounds_select_admin_flagged" on public.playgrounds
  for select using ((select private.is_admin()));
create policy "photos_select_admin_flagged" on public.photos
  for select using ((select private.is_admin()));
create policy "reviews_select_admin_flagged" on public.reviews
  for select using ((select private.is_admin()));
create policy "reports_select_admin" on public.reports
  for select using ((select private.is_admin()));

create policy "playgrounds_update_admin" on public.playgrounds
  for update using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "playgrounds_delete_admin" on public.playgrounds
  for delete using ((select private.is_admin()));

create policy "photos_update_admin" on public.photos
  for update using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "photos_delete_admin" on public.photos
  for delete using ((select private.is_admin()));

create policy "reviews_update_admin" on public.reviews
  for update using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "reviews_delete_admin" on public.reviews
  for delete using ((select private.is_admin()));

drop function if exists public.is_admin();

revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.auto_flag_on_reports() from anon, authenticated, public;
revoke execute on function public.sync_review_helpful_count() from anon, authenticated, public;
alter default privileges in schema public revoke execute on functions from anon, authenticated, public;

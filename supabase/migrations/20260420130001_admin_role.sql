alter table public.profiles add column is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Admins can see flagged rows (regular SELECT policies already allow non-flagged for everyone).
create policy "playgrounds_select_admin_flagged" on public.playgrounds
  for select using ((select public.is_admin()));
create policy "photos_select_admin_flagged" on public.photos
  for select using ((select public.is_admin()));
create policy "reviews_select_admin_flagged" on public.reviews
  for select using ((select public.is_admin()));
create policy "reports_select_admin" on public.reports
  for select using ((select public.is_admin()));

-- Admins can edit/delete any playground/photo/review (bypasses owner-only).
create policy "playgrounds_update_admin" on public.playgrounds
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "playgrounds_delete_admin" on public.playgrounds
  for delete using ((select public.is_admin()));

create policy "photos_update_admin" on public.photos
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "photos_delete_admin" on public.photos
  for delete using ((select public.is_admin()));

create policy "reviews_update_admin" on public.reviews
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "reviews_delete_admin" on public.reviews
  for delete using ((select public.is_admin()));

alter table public.profiles enable row level security;
alter table public.playgrounds enable row level security;
alter table public.photos enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;

-- profiles: public read; self update
create policy "profiles_select_all" on public.profiles
  for select using (true);
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- playgrounds: public read of non-flagged; authed insert; owner update/delete
create policy "playgrounds_select_public" on public.playgrounds
  for select using (flagged = false);
create policy "playgrounds_insert_authed" on public.playgrounds
  for insert with check ((select auth.uid()) = user_id);
create policy "playgrounds_update_own" on public.playgrounds
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "playgrounds_delete_own" on public.playgrounds
  for delete using ((select auth.uid()) = user_id);

-- photos: same pattern
create policy "photos_select_public" on public.photos
  for select using (flagged = false);
create policy "photos_insert_authed" on public.photos
  for insert with check ((select auth.uid()) = user_id);
create policy "photos_update_own" on public.photos
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "photos_delete_own" on public.photos
  for delete using ((select auth.uid()) = user_id);

-- reviews: same pattern
create policy "reviews_select_public" on public.reviews
  for select using (flagged = false);
create policy "reviews_insert_authed" on public.reviews
  for insert with check ((select auth.uid()) = user_id);
create policy "reviews_update_own" on public.reviews
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reviews_delete_own" on public.reviews
  for delete using ((select auth.uid()) = user_id);

-- favorites: owner-only
create policy "favorites_select_own" on public.favorites
  for select using ((select auth.uid()) = user_id);
create policy "favorites_insert_own" on public.favorites
  for insert with check ((select auth.uid()) = user_id);
create policy "favorites_delete_own" on public.favorites
  for delete using ((select auth.uid()) = user_id);

-- reports: owner-only select + insert
create policy "reports_select_own" on public.reports
  for select using ((select auth.uid()) = user_id);
create policy "reports_insert_authed" on public.reports
  for insert with check ((select auth.uid()) = user_id);

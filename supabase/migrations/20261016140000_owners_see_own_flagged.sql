-- ops 0006 (expand, after the code that filters public queries is live): owners can read their
-- own rows even when flagged, so "Export my data" is complete (GDPR-06, right of access) and a
-- future "my contributions" view can show what's under review.
-- Public queries filter `flagged = false` explicitly (src/lib/playgrounds.ts, src/lib/reviews.ts),
-- so nobody else sees anything new. Column grants still stop owners from un-flagging.

drop policy if exists "playgrounds_select_own" on public.playgrounds;
create policy "playgrounds_select_own" on public.playgrounds
  for select using ((select auth.uid()) = user_id);

drop policy if exists "reviews_select_own" on public.reviews;
create policy "reviews_select_own" on public.reviews
  for select using ((select auth.uid()) = user_id);

drop policy if exists "photos_select_own" on public.photos;
create policy "photos_select_own" on public.photos
  for select using ((select auth.uid()) = user_id);

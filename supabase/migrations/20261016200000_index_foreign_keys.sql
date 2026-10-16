-- ops 0007 (expand): index the foreign keys the Supabase performance advisor flagged in ops 0001.
-- They back account-deletion cascades and per-user lookups ("Export my data", future
-- "my contributions"). Tables are small, so a plain (locking) CREATE INDEX is instant.
create index if not exists favorites_playground_id_idx on public.favorites (playground_id);
create index if not exists photos_user_id_idx on public.photos (user_id);
create index if not exists reports_user_id_idx on public.reports (user_id);
create index if not exists review_helpful_user_id_idx on public.review_helpful (user_id);
create index if not exists reviews_user_id_idx on public.reviews (user_id);

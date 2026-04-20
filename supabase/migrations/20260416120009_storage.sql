-- Storage bucket is declared in supabase/config.toml ([storage.buckets.playground-photos]).
-- This migration only adds the storage RLS policies.

create policy "playground_photos_read_all" on storage.objects
  for select using (bucket_id = 'playground-photos');

create policy "playground_photos_insert_authed" on storage.objects
  for insert with check (
    bucket_id = 'playground-photos'
    and auth.role() = 'authenticated'
    and owner_id = (select auth.uid())::text
  );

create policy "playground_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'playground-photos'
    and owner_id = (select auth.uid())::text
  );

create policy "playground_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'playground-photos'
    and owner_id = (select auth.uid())::text
  );

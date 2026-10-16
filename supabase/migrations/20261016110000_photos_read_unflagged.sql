-- ops 0003 (ADR-0002, expand): visitors' own clients may read — and so create signed URLs
-- for — a photo file only while neither the photo nor its playground is flagged. Nothing
-- reads through this yet while the bucket is public; ops 0004 makes it the only way in.

create index if not exists photos_storage_path_idx on public.photos (storage_path);

drop policy if exists "playground_photos_read_unflagged" on storage.objects;
create policy "playground_photos_read_unflagged" on storage.objects
  for select using (
    bucket_id = 'playground-photos'
    and exists (
      select 1
      from public.photos p
      join public.playgrounds g on g.id = p.playground_id
      where p.storage_path = objects.name
        and not p.flagged
        and not g.flagged
    )
  );

-- ops 0004 (ADR-0002, contract): the photo bucket becomes private, and clients can no longer
-- write to it — uploads go through the Server Action, which checks every byte and uploads
-- with the service role. Requires ops 0003's code (signed URLs, service-role uploads) live.

update storage.buckets set public = false where id = 'playground-photos';

-- Direct uploads and overwrites (upserts) would skip the server's metadata checks.
drop policy if exists "playground_photos_insert_authed" on storage.objects;
drop policy if exists "playground_photos_update_own" on storage.objects;

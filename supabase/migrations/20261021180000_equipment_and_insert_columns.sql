-- ops 0014 (BL-18, FR-ADD-07; NFR-SEC-07): equipment limited to the keys the app knows, and signed-in
-- users may set only the columns the app sends when they add something.

-- ── Equipment: only known keys ───────────────────────────────────────────────
-- The same list as EQUIPMENT_KEYS in src/lib/playground-types.ts (a unit test keeps them equal).
-- NOT VALID first, so existing rows can't fail the migration; validated straight away when they
-- comply (ops 0014 checks first that they do: an unvalidated constraint still blocks updates).
alter table public.playgrounds drop constraint if exists playgrounds_equipment_known;
alter table public.playgrounds
  add constraint playgrounds_equipment_known
    check (
      jsonb_typeof(equipment) = 'array'
      and equipment <@ '["swings", "slides", "zipline", "sandbox", "climbing_wall"]'::jsonb
    ) not valid;

do $$
begin
  if not exists (
    select 1 from public.playgrounds
    where jsonb_typeof(equipment) <> 'array'
       or not equipment <@ '["swings", "slides", "zipline", "sandbox", "climbing_wall"]'::jsonb
  ) then
    alter table public.playgrounds validate constraint playgrounds_equipment_known;
  end if;
end;
$$;

-- ── Insert: only what the app sends ──────────────────────────────────────────
-- The API let signed-in users insert any column, including ones the database owns: a backdated
-- created_at (which also slipped past the hourly rate limits), a view_count or helpful_count, a
-- chosen id or flag. Ids, timestamps, counters and flags now always come from their defaults.
-- RLS still decides which rows; this decides which columns. The service role is unaffected.
revoke insert on public.playgrounds from authenticated;
grant insert (name, description, location, is_fenced, has_shade, has_water, has_toilets, has_parking,
              surface_type, equipment, user_id)
  on public.playgrounds to authenticated;

revoke insert on public.reviews from authenticated;
grant insert (playground_id, user_id, rating, comment) on public.reviews to authenticated;

revoke insert on public.photos from authenticated;
grant insert (playground_id, user_id, storage_path) on public.photos to authenticated;

revoke insert on public.reports from authenticated;
grant insert (target_type, target_id, user_id, reason) on public.reports to authenticated;

revoke insert on public.favorites from authenticated;
grant insert (playground_id, user_id) on public.favorites to authenticated;

revoke insert on public.review_helpful from authenticated;
grant insert (review_id, user_id) on public.review_helpful to authenticated;

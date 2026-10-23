-- ops 0017 (FR-ADD-07, FR-MAP-07): more to say about a playground: four features, nine kinds of play
-- equipment (baby swings among them) and four surfaces. Expand-only: the code in production before
-- this never sets the new columns, and every value it writes stays allowed.

-- ── Features: unknown until someone answers ─────────────────────────────────
-- Null, not false: nobody was asked about these for the playgrounds already listed, and the
-- detail page reads false as "Brez …". The forms answer them (an unticked box means no).
alter table public.playgrounds
  add column if not exists has_benches boolean,
  add column if not exists has_toddler_area boolean,
  add column if not exists is_accessible boolean,
  add column if not exists has_lighting boolean;

-- ── Surfaces ────────────────────────────────────────────────────────────────
-- The same list as SURFACE_TYPES in src/lib/playground-types.ts (a unit test keeps them equal).
-- A superset of the old list (the table's inline check), so every row complies.
alter table public.playgrounds drop constraint if exists playgrounds_surface_type_check;
alter table public.playgrounds drop constraint if exists playgrounds_surface_type_known;
alter table public.playgrounds
  add constraint playgrounds_surface_type_known
    check (surface_type in ('tartan', 'rubber_tiles', 'sand', 'grass', 'artificial_turf', 'woodchips', 'gravel', 'asphalt'));

-- ── Equipment ───────────────────────────────────────────────────────────────
-- The same list as EQUIPMENT_KEYS (a unit test keeps them equal). A superset of ops 0014's list,
-- which every row was validated against, so this is added validated.
alter table public.playgrounds drop constraint if exists playgrounds_equipment_known;
alter table public.playgrounds
  add constraint playgrounds_equipment_known
    check (
      jsonb_typeof(equipment) = 'array'
      and equipment <@ '["swings", "baby_swings", "nest_swing", "seesaw", "spring_riders", "slides", "climbing_wall", "climbing_net", "zipline", "merry_go_round", "trampoline", "sandbox", "playhouse", "water_play"]'::jsonb
    );

-- ── The view: the new features appended (create or replace can only add at the end) ──
create or replace view public.playgrounds_geo
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.description,
  ST_Y(p.location::geometry) as lat,
  ST_X(p.location::geometry) as lng,
  p.is_fenced,
  p.has_shade,
  p.has_water,
  p.has_toilets,
  p.has_parking,
  p.surface_type,
  p.equipment,
  p.flagged,
  p.user_id,
  p.created_at,
  coalesce(r.review_count, 0) as review_count,
  r.avg_rating,
  p.view_count,
  p.has_benches,
  p.has_toddler_area,
  p.is_accessible,
  p.has_lighting
from public.playgrounds p
left join (
  select
    playground_id,
    count(*) as review_count,
    round(avg(rating)::numeric, 1) as avg_rating
  from public.reviews
  where flagged = false
  group by playground_id
) r on r.playground_id = p.id;

grant select on public.playgrounds_geo to anon, authenticated;

-- ── Signed-in users set them like the other features ────────────────────────
-- Column grants (ops 0014 for insert, the security hardening for update) don't cover new columns.
grant insert (has_benches, has_toddler_area, is_accessible, has_lighting) on public.playgrounds to authenticated;
grant update (has_benches, has_toddler_area, is_accessible, has_lighting) on public.playgrounds to authenticated;

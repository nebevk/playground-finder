-- ops 0017 (FR-ADD-07, FR-MAP-06, FR-MAP-07): more to say about a playground: four features, nine
-- kinds of play equipment (baby swings among them), and any number of surfaces from a longer list.
-- Expand-only: the code in production before this never sets the new columns, and every value it
-- writes stays allowed.

-- ── Features: unknown until someone answers ─────────────────────────────────
-- Null, not false: nobody was asked about these for the playgrounds already listed, and the
-- detail page reads false as "Brez …". The forms answer them (an unticked box means no).
alter table public.playgrounds
  add column if not exists has_benches boolean,
  add column if not exists has_toddler_area boolean,
  add column if not exists is_accessible boolean,
  add column if not exists has_lighting boolean;

-- ── Surfaces: several per playground ────────────────────────────────────────
-- Rubber under the swings, sand, grass: a playground often has more than one, so surfaces is a list,
-- like equipment. "tartan" is gone: it's the same as rubber tiles. surface_type stays, untouched, for
-- the code deployed before this; a later contract step drops it (backlog).
alter table public.playgrounds add column if not exists surfaces jsonb not null default '[]'::jsonb;

update public.playgrounds
set surfaces = jsonb_build_array(case surface_type when 'tartan' then 'rubber_tiles' else surface_type end)
where surface_type is not null and surfaces = '[]'::jsonb;

-- The same list as SURFACE_TYPES in src/lib/playground-types.ts (a unit test keeps them equal).
alter table public.playgrounds drop constraint if exists playgrounds_surfaces_known;
alter table public.playgrounds
  add constraint playgrounds_surfaces_known
    check (
      jsonb_typeof(surfaces) = 'array'
      and surfaces <@ '["rubber_tiles", "sand", "grass", "artificial_turf", "woodchips", "gravel", "asphalt"]'::jsonb
    );

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

-- ── The view: the new columns appended (create or replace can only add at the end) ───
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
  p.has_lighting,
  p.surfaces
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

-- ── Signed-in users set them like the other details ─────────────────────────
-- Column grants (ops 0014 for insert, the security hardening for update) don't cover new columns.
grant insert (has_benches, has_toddler_area, is_accessible, has_lighting, surfaces) on public.playgrounds to authenticated;
grant update (has_benches, has_toddler_area, is_accessible, has_lighting, surfaces) on public.playgrounds to authenticated;

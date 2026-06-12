-- Add aggregate rating (avg + count over non-flagged reviews) to the playgrounds_geo
-- view so the map, bottom sheet, and detail page can all show "★ 4.3 · 12" without
-- a separate per-playground query. security_invoker keeps RLS in effect; the reviews
-- subquery only counts non-flagged rows, which are publicly selectable.
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
  r.avg_rating
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

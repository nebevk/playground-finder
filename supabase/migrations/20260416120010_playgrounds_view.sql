create or replace view public.playgrounds_geo
with (security_invoker = true) as
select
  id,
  name,
  description,
  ST_Y(location::geometry) as lat,
  ST_X(location::geometry) as lng,
  is_fenced,
  has_shade,
  has_water,
  has_toilets,
  has_parking,
  surface_type,
  equipment,
  flagged,
  user_id,
  created_at
from public.playgrounds;

grant select on public.playgrounds_geo to anon, authenticated;

-- Proximity lookup used by the admin quick-add duplicate check (and reusable for a
-- future map viewport query). Uses the GiST index on location via ST_DWithin.
-- SECURITY INVOKER: RLS applies, so admins see flagged rows and the public sees only
-- non-flagged ones. Execute must be granted explicitly because a prior migration
-- revoked default execute on public functions.
create or replace function public.playgrounds_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision
)
returns table (id uuid, name text, distance_m double precision)
language sql
stable
security invoker
-- PostGIS lives in the extensions schema, so it must be on the search_path.
set search_path = public, extensions
as $$
  select
    p.id,
    p.name,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) as distance_m
  from public.playgrounds p
  where ST_DWithin(
    p.location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radius_m
  )
  order by distance_m
  limit 20;
$$;

grant execute on function public.playgrounds_near(double precision, double precision, double precision)
  to anon, authenticated;

-- "Most clicked" popularity signal: a view counter bumped when a detail page is opened.
alter table public.playgrounds add column view_count int not null default 0;

-- SECURITY DEFINER so any visitor (incl. anon) can bump the counter without an UPDATE
-- grant on the table. Only touches view_count for the given id. Execute granted
-- explicitly because a prior migration revoked default execute on public functions.
create or replace function public.increment_playground_views(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.playgrounds set view_count = view_count + 1 where id = p_id;
$$;

grant execute on function public.increment_playground_views(uuid) to anon, authenticated;

-- Recreate the view with view_count appended (kept at the end so create-or-replace
-- doesn't trip on column reordering).
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
  p.view_count
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

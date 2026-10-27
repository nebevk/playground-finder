-- ops 0018 (FR-PG-01): the original five features can be unknown, like the four added in ops 0017.
-- Defaults of false looked like "Brez pitnika" on every playground nobody had answered for.
-- Expand-only: null means unanswered; forms still write true/false when someone ticks the boxes.

alter table public.playgrounds
  alter column is_fenced drop not null,
  alter column is_fenced drop default,
  alter column has_shade drop not null,
  alter column has_shade drop default,
  alter column has_water drop not null,
  alter column has_water drop default,
  alter column has_toilets drop not null,
  alter column has_toilets drop default,
  alter column has_parking drop not null,
  alter column has_parking drop default;

-- Existing "no" values were never answered; keep only the true ones that imports or forms set.
update public.playgrounds set is_fenced = null where is_fenced = false;
update public.playgrounds set has_shade = null where has_shade = false;
update public.playgrounds set has_water = null where has_water = false;
update public.playgrounds set has_toilets = null where has_toilets = false;
update public.playgrounds set has_parking = null where has_parking = false;

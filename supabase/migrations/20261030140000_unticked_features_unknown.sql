-- ops 0021 (FR-PG-01, owner's call): a form's unticked box no longer means "no". Forms now leave an
-- unticked feature unknown (null), like imports do; this clears the "no" answers they saved before,
-- which showed as "Brez parkirišča", "Brez ograje" … on playgrounds nobody said lacked them.
-- Data only, no schema change. Code-first: applied once the code that stops writing false is live,
-- so nothing writes them back.

update public.playgrounds set is_fenced = null where is_fenced = false;
update public.playgrounds set has_shade = null where has_shade = false;
update public.playgrounds set has_water = null where has_water = false;
update public.playgrounds set has_toilets = null where has_toilets = false;
update public.playgrounds set has_parking = null where has_parking = false;
update public.playgrounds set has_benches = null where has_benches = false;
update public.playgrounds set has_toddler_area = null where has_toddler_area = false;
update public.playgrounds set is_accessible = null where is_accessible = false;
update public.playgrounds set has_lighting = null where has_lighting = false;

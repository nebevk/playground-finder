-- ops 0020 (ADR-0003; FR-ADM-07, FR-ADM-08): a playground can wait for review. Discovery (a later
-- routine) adds playgrounds as 'pending', and an admin publishes or rejects them at /admin/pending.
-- Everything else stays as it is: existing rows, and every insert that doesn't say otherwise, are
-- 'published' (the owner's decision: people's additions show at once).
-- Expand-only: the code in production never sets these columns and sees exactly what it saw before.

-- ── Status ──────────────────────────────────────────────────────────────────
alter table public.playgrounds add column if not exists status text not null default 'published';

alter table public.playgrounds drop constraint if exists playgrounds_status_known;
alter table public.playgrounds
  add constraint playgrounds_status_known check (status in ('pending', 'published', 'rejected'));

-- ── Provenance ──────────────────────────────────────────────────────────────
-- Added without a default, so rows that existed before stay null: their origin wasn't recorded (a
-- row without an author may be an import, or a playground whose author deleted their account).
-- New rows default to 'user'; imports and discovery say what they are.
alter table public.playgrounds
  add column if not exists source text,
  add column if not exists external_id text,
  add column if not exists source_notes text;
alter table public.playgrounds alter column source set default 'user';

-- The same list as PLAYGROUND_SOURCES in src/lib/playground-types.ts (a unit test keeps them equal).
alter table public.playgrounds drop constraint if exists playgrounds_source_known;
alter table public.playgrounds
  add constraint playgrounds_source_known check (source in ('user', 'import', 'osm', 'other'));

-- An id only means something within its source (e.g. 'osm' + 'way/123').
alter table public.playgrounds drop constraint if exists playgrounds_external_id_sourced;
alter table public.playgrounds
  add constraint playgrounds_external_id_sourced
    check (external_id is null or (source is not null and char_length(external_id) between 1 and 100));

-- For the reviewer, but readable by anyone through the API once published: public facts only.
alter table public.playgrounds drop constraint if exists playgrounds_source_notes_length;
alter table public.playgrounds
  add constraint playgrounds_source_notes_length check (char_length(source_notes) <= 1000);

-- One row per feature of a source, whatever its status: a rejected discovery isn't proposed again.
create unique index if not exists playgrounds_source_external_id_uidx
  on public.playgrounds (source, external_id) where external_id is not null;

-- ── Who sees what ───────────────────────────────────────────────────────────
-- Visitors and signed-in users: published and unflagged. Authors (playgrounds_select_own) and admins
-- (playgrounds_select_admin_flagged) keep their policies. Photo files follow: the Storage read
-- policy joins playgrounds under the visitor's RLS.
drop policy if exists "playgrounds_select_public" on public.playgrounds;
create policy "playgrounds_select_public" on public.playgrounds
  for select using (flagged = false and status = 'published');

-- No insert or update grants on the new columns for authenticated (ops 0014 and the security
-- hardening grant columns one by one): only admins publish, reject or hide, through the service role.

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
  p.surfaces,
  p.status,
  p.source,
  p.external_id,
  p.source_notes
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

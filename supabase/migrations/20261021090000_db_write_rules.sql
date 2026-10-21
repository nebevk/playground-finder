-- ops 0012 (BL-47, NFR-SEC-07): the last write rules the app enforced on its own now hold in the
-- database too, because the publishable key (and so the API) is public. Expand-only: the app
-- deployed before this already satisfies every rule.

-- ── At most 8 photos per playground per person ──────────────────────────────
-- Counted over all of that person's photos of the playground, flagged ones included, so
-- uploading in several batches (FR-ADD-06) can't get past it either.
create or replace function private.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing int;
begin
  if new.user_id is null then
    return new;
  end if;
  -- Serialise concurrent uploads by the same person to the same playground.
  perform pg_advisory_xact_lock(hashtextextended(new.playground_id::text || ':' || new.user_id::text, 0));
  select count(*) into existing
  from public.photos
  where playground_id = new.playground_id and user_id = new.user_id;
  if existing >= 8 then
    raise exception 'at most 8 photos per playground per person'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke execute on function private.enforce_photo_limit() from public;

drop trigger if exists photos_limit_per_person on public.photos;
create trigger photos_limit_per_person
  before insert on public.photos
  for each row execute function private.enforce_photo_limit();

-- ── Text: a real name, and bounded lengths ──────────────────────────────────
-- NOT VALID first, so existing rows can't fail the migration; validated straight away when
-- they comply (they should: the app always trimmed and required a name).
alter table public.playgrounds
  drop constraint if exists playgrounds_name_length,
  drop constraint if exists playgrounds_description_length;
alter table public.playgrounds
  add constraint playgrounds_name_length
    check (char_length(btrim(name)) between 1 and 120) not valid,
  add constraint playgrounds_description_length
    check (description is null or char_length(description) <= 2000) not valid;

alter table public.reviews drop constraint if exists reviews_comment_length;
alter table public.reviews
  add constraint reviews_comment_length
    check (comment is null or char_length(comment) <= 2000) not valid;

do $$
begin
  if not exists (select 1 from public.playgrounds where char_length(btrim(name)) not between 1 and 120) then
    alter table public.playgrounds validate constraint playgrounds_name_length;
  end if;
  if not exists (select 1 from public.playgrounds where char_length(description) > 2000) then
    alter table public.playgrounds validate constraint playgrounds_description_length;
  end if;
  if not exists (select 1 from public.reviews where char_length(comment) > 2000) then
    alter table public.reviews validate constraint reviews_comment_length;
  end if;
end;
$$;

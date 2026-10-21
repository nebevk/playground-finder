-- ops 0013 (BL-19, NFR-SEC-04): server-side rate limits on submissions. Expand-only: the code in
-- production already copes with a refused insert (it shows a generic "try again").

-- ── Per person: how much one account may add per hour ───────────────────────
-- Counted in the database, so calls straight to the public API are limited too. Not limited:
-- writes without a signed-in user (the service role: imports, admin tools), admins, and accounts
-- whose app_metadata has rate_limit_exempt = true (only the service role can set that; the e2e
-- test users have it). Over the limit: SQLSTATE PT429, which PostgREST answers with HTTP 429.
create or replace function private.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_rows int := tg_argv[0]::int;
  per interval := tg_argv[1]::interval;
  recent int;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    return new;
  end if;
  if private.is_admin()
     or coalesce((auth.jwt() -> 'app_metadata' ->> 'rate_limit_exempt')::boolean, false) then
    return new;
  end if;
  execute format(
    'select count(*) from public.%I where user_id = $1 and created_at > now() - $2',
    tg_table_name
  ) into recent using auth.uid(), per;
  if recent >= max_rows then
    raise exception 'rate limit: at most % new % per %', max_rows, tg_table_name, per
      using errcode = 'PT429';
  end if;
  return new;
end;
$$;
revoke execute on function private.enforce_rate_limit() from public;

drop trigger if exists playgrounds_rate_limit on public.playgrounds;
create trigger playgrounds_rate_limit before insert on public.playgrounds
  for each row execute function private.enforce_rate_limit('10', '1 hour');

drop trigger if exists reviews_rate_limit on public.reviews;
create trigger reviews_rate_limit before insert on public.reviews
  for each row execute function private.enforce_rate_limit('20', '1 hour');

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit before insert on public.reports
  for each row execute function private.enforce_rate_limit('20', '1 hour');

drop trigger if exists photos_rate_limit on public.photos;
create trigger photos_rate_limit before insert on public.photos
  for each row execute function private.enforce_rate_limit('40', '1 hour');

-- ── Per client: signups and emails ───────────────────────────────────────────
-- Signup, password reset and "resend confirmation" have no account to count against, so the app
-- counts them per client under a key it derives (a one-way hash of the IP address, never the
-- address itself). Hits are kept for a day at most. Only the service role may call this.
create table if not exists private.rate_limit_hits (
  key text not null,
  hit_at timestamptz not null default now()
);
alter table private.rate_limit_hits enable row level security;
create index if not exists rate_limit_hits_key_time on private.rate_limit_hits (key, hit_at);
create index if not exists rate_limit_hits_time on private.rate_limit_hits (hit_at);

-- true: allowed (and counted); false: over the limit.
create or replace function public.consume_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent int;
begin
  perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || p_key, 0));
  delete from private.rate_limit_hits where hit_at < now() - interval '1 day';
  select count(*) into recent
  from private.rate_limit_hits
  where key = p_key and hit_at > now() - make_interval(secs => p_window_seconds);
  if recent >= p_max then
    return false;
  end if;
  insert into private.rate_limit_hits (key) values (p_key);
  return true;
end;
$$;
revoke execute on function public.consume_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;

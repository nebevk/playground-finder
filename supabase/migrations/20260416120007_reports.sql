create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('playground', 'review', 'photo')),
  target_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'incorrect_info', 'privacy_violation', 'other')),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id)
);

create index reports_target_idx on public.reports (target_type, target_id);

create or replace function public.auto_flag_on_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int;
begin
  select count(*) into cnt
  from public.reports
  where target_type = new.target_type and target_id = new.target_id;

  if cnt >= 3 then
    if new.target_type = 'playground' then
      update public.playgrounds set flagged = true where id = new.target_id;
    elsif new.target_type = 'review' then
      update public.reviews set flagged = true where id = new.target_id;
    elsif new.target_type = 'photo' then
      update public.photos set flagged = true where id = new.target_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_auto_flag_on_reports
  after insert on public.reports
  for each row execute function public.auto_flag_on_reports();

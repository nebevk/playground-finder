create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text := lower(split_part(new.email, '@', 1));
  candidate text := base_name;
  n int := 0;
begin
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base_name || n::text;
  end loop;

  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

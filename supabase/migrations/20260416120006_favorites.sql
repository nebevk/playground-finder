create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  playground_id uuid not null references public.playgrounds(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, playground_id)
);

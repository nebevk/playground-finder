create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  helpful_count int not null default 0,
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  unique (playground_id, user_id)
);

create index reviews_playground_id_idx on public.reviews (playground_id);

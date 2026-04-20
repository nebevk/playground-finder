create table public.photos (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  storage_path text not null,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create index photos_playground_id_idx on public.photos (playground_id);

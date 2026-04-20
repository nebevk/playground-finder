create table public.playgrounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location geography(Point, 4326) not null,
  is_fenced boolean not null default false,
  has_shade boolean not null default false,
  has_water boolean not null default false,
  has_toilets boolean not null default false,
  has_parking boolean not null default false,
  surface_type text check (surface_type in ('tartan', 'sand', 'grass', 'gravel')),
  equipment jsonb not null default '[]'::jsonb,
  flagged boolean not null default false,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index playgrounds_location_idx on public.playgrounds using gist (location);
create index playgrounds_user_id_idx on public.playgrounds (user_id);

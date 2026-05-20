create table public.review_helpful (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

alter table public.review_helpful enable row level security;

create policy "review_helpful_select_all" on public.review_helpful
  for select using (true);
create policy "review_helpful_insert_own" on public.review_helpful
  for insert with check ((select auth.uid()) = user_id);
create policy "review_helpful_delete_own" on public.review_helpful
  for delete using ((select auth.uid()) = user_id);

create or replace function public.sync_review_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.reviews set helpful_count = helpful_count + 1 where id = new.review_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.reviews set helpful_count = greatest(helpful_count - 1, 0) where id = old.review_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger trg_review_helpful_count
  after insert or delete on public.review_helpful
  for each row execute function public.sync_review_helpful_count();

-- A single public diagnostic row, physically separate from sports/user data.
-- Fixed ID and message prevent this endpoint becoming a general public data store.
create table public.backend_check (
  id integer primary key check (id = 1),
  message text not null check (message = 'Backend connection test'),
  test_run_id uuid not null,
  checked_at timestamptz not null default now()
);
alter table public.backend_check enable row level security;
revoke all on public.backend_check from anon, authenticated;
grant select, insert, update on public.backend_check to anon, authenticated;
create policy diagnostic_read on public.backend_check for select to anon, authenticated using (true);
create policy diagnostic_insert on public.backend_check for insert to anon, authenticated with check (true);
create policy diagnostic_update on public.backend_check for update to anon, authenticated using (true) with check (true);

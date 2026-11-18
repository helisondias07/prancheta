create table public.user_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 5242880),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
create function public.bump_snapshot_revision() returns trigger language plpgsql set search_path = '' as $$
begin new.revision := old.revision + 1; new.updated_at := now(); return new; end $$;
create trigger snapshot_revision before update on public.user_snapshots for each row execute function public.bump_snapshot_revision();
alter table public.user_snapshots enable row level security;
revoke all on public.user_snapshots from anon, authenticated;
grant select, insert, update, delete on public.user_snapshots to authenticated;
create policy snapshots_select on public.user_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy snapshots_insert on public.user_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy snapshots_update on public.user_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy snapshots_delete on public.user_snapshots for delete to authenticated using ((select auth.uid()) = user_id);

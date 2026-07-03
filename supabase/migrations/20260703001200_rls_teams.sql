-- rls: teams — dealership-wide read, admin-only writes

alter table public.teams enable row level security;

create policy teams_select on public.teams
  for select to authenticated
  using (dealer_id = app.user_dealer_id());

create policy teams_insert on public.teams
  for insert to authenticated
  with check (dealer_id = app.user_dealer_id() and app.user_role() = 'admin');

create policy teams_update on public.teams
  for update to authenticated
  using (dealer_id = app.user_dealer_id() and app.user_role() = 'admin')
  with check (dealer_id = app.user_dealer_id() and app.user_role() = 'admin');

create policy teams_delete on public.teams
  for delete to authenticated
  using (dealer_id = app.user_dealer_id() and app.user_role() = 'admin');

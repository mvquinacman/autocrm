-- rls: promos — dealership-wide read, admin-only writes

alter table public.promos enable row level security;

create policy promos_select on public.promos
  for select to authenticated
  using (dealer_id = app.user_dealer_id());

create policy promos_insert on public.promos
  for insert to authenticated
  with check (dealer_id = app.user_dealer_id() and app.user_role() = 'admin');

create policy promos_update on public.promos
  for update to authenticated
  using (dealer_id = app.user_dealer_id() and app.user_role() = 'admin')
  with check (dealer_id = app.user_dealer_id() and app.user_role() = 'admin');

create policy promos_delete on public.promos
  for delete to authenticated
  using (dealer_id = app.user_dealer_id() and app.user_role() = 'admin');

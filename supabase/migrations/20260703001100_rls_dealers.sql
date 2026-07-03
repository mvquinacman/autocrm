-- rls: dealers — users see only their own dealership; no client writes

alter table public.dealers enable row level security;

create policy dealers_select on public.dealers
  for select to authenticated
  using (id = app.user_dealer_id());

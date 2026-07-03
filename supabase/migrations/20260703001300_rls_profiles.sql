-- rls: profiles — dealership-wide read, users update only their own row,
-- and only harmless columns (no self-escalation of role/dealer/team)

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (dealer_id = app.user_dealer_id());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (dealer_id = app.user_dealer_id() and id = auth.uid())
  with check (dealer_id = app.user_dealer_id() and id = auth.uid());

-- column-level grant: rls limits the row, this limits the columns
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

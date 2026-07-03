-- rls: leads — role ladder within the dealer wall:
-- agent sees own, gsm sees team, director/principal/admin see dealership

alter table public.leads enable row level security;

create policy leads_select on public.leads
  for select to authenticated
  using (
    dealer_id = app.user_dealer_id()
    and (
      app.user_role() in ('sales_director', 'dealer_principal', 'admin')
      or (app.user_role() = 'gsm' and team_id = app.user_team_id())
      or agent_id = auth.uid()
    )
  );

create policy leads_insert on public.leads
  for insert to authenticated
  with check (
    dealer_id = app.user_dealer_id()
    and (
      (app.user_role() = 'agent' and agent_id = auth.uid())
      or (app.user_role() = 'gsm' and team_id = app.user_team_id())
      or app.user_role() = 'admin'
    )
  );

-- team_id is re-synced from the new agent by trigger before this with-check
-- runs, so the gsm branch enforces that reassignment stays within their team
create policy leads_update on public.leads
  for update to authenticated
  using (
    dealer_id = app.user_dealer_id()
    and (
      agent_id = auth.uid()
      or (app.user_role() = 'gsm' and team_id = app.user_team_id())
      or app.user_role() = 'admin'
    )
  )
  with check (
    dealer_id = app.user_dealer_id()
    and (
      (app.user_role() = 'agent' and agent_id = auth.uid())
      or (app.user_role() = 'gsm' and team_id = app.user_team_id())
      or app.user_role() = 'admin'
    )
  );

create policy leads_delete on public.leads
  for delete to authenticated
  using (dealer_id = app.user_dealer_id() and app.user_role() = 'admin');

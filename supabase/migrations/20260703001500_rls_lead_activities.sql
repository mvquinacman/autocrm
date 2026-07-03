-- rls: lead_activities — visibility follows the parent lead (the leads rls
-- inside the exists subquery encodes the role ladder and dealer wall).
-- append-only: no update/delete policies; trigger writes bypass rls
-- via security definer.

alter table public.lead_activities enable row level security;

create policy lead_activities_select on public.lead_activities
  for select to authenticated
  using (
    exists (select 1 from public.leads l where l.id = lead_activities.lead_id)
  );

create policy lead_activities_insert on public.lead_activities
  for insert to authenticated
  with check (
    dealer_id = app.user_dealer_id()
    and actor_id = auth.uid()
    and exists (select 1 from public.leads l where l.id = lead_activities.lead_id)
  );

-- rls: follow_ups — visibility and writes follow the parent lead
-- (leads rls inside the exists subquery encodes the role ladder)

alter table public.follow_ups enable row level security;

create policy follow_ups_select on public.follow_ups
  for select to authenticated
  using (
    exists (select 1 from public.leads l where l.id = follow_ups.lead_id)
  );

create policy follow_ups_insert on public.follow_ups
  for insert to authenticated
  with check (
    dealer_id = app.user_dealer_id()
    and exists (select 1 from public.leads l where l.id = follow_ups.lead_id)
  );

create policy follow_ups_update on public.follow_ups
  for update to authenticated
  using (
    exists (select 1 from public.leads l where l.id = follow_ups.lead_id)
  )
  with check (
    dealer_id = app.user_dealer_id()
    and exists (select 1 from public.leads l where l.id = follow_ups.lead_id)
  );

create policy follow_ups_delete on public.follow_ups
  for delete to authenticated
  using (
    exists (select 1 from public.leads l where l.id = follow_ups.lead_id)
  );

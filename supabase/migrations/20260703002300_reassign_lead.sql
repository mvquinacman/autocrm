-- Atomic lead reassignment for the GSM portal: move agent_id and log a
-- reassignment activity in one transaction.
--
-- SECURITY INVOKER: the caller's RLS applies. A GSM can only update leads
-- on their team, and the leads update with-check (after the team-sync
-- trigger re-derives team_id from the new agent) rejects reassignment to
-- an agent outside their team. Agents can't call this to give leads away:
-- their update with-check requires agent_id = auth.uid().

create or replace function public.reassign_lead(
  p_lead_id uuid,
  p_new_agent_id uuid
)
returns public.leads
language plpgsql
set search_path = public
as $$
declare
  v_old_name text;
  v_new_name text;
  v_lead public.leads;
begin
  select p.full_name into v_old_name
  from public.leads l
  join public.profiles p on p.id = l.agent_id
  where l.id = p_lead_id;
  if v_old_name is null then
    raise exception 'Lead not found or not accessible';
  end if;

  select full_name into v_new_name
  from public.profiles
  where id = p_new_agent_id and role = 'agent';
  if v_new_name is null then
    raise exception 'Target agent not found';
  end if;

  update public.leads
  set agent_id = p_new_agent_id
  where id = p_lead_id
  returning * into v_lead;

  insert into public.lead_activities (lead_id, dealer_id, actor_id, type, detail)
  values (
    p_lead_id, v_lead.dealer_id, auth.uid(), 'note',
    'Reassigned from ' || v_old_name || ' to ' || v_new_name
  );

  return v_lead;
end;
$$;

grant execute on function public.reassign_lead(uuid, uuid) to authenticated;

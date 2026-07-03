-- Atomic lead creation for the agent portal "+ Add Lead" dialog.
-- One transaction: insert the lead (stage new, probability 30), log a
-- "Lead created" activity note, and schedule a first follow-up due today
-- (Asia/Manila). SECURITY INVOKER so RLS applies: the caller becomes the
-- owning agent (agent_id = auth.uid()), dealer comes from their profile,
-- and leads.team_id is filled by the existing sync trigger.

create or replace function public.create_lead(
  p_customer_name text,
  p_phone text default null,
  p_model text default null,
  p_variant text default null,
  p_source public.lead_source default 'other',
  p_est_value numeric default null
)
returns public.leads
language plpgsql
set search_path = public
as $$
declare
  v_lead public.leads;
begin
  insert into public.leads (
    dealer_id, agent_id, customer_name, phone, model, variant,
    source, est_value, stage, probability
  ) values (
    app.user_dealer_id(), auth.uid(), p_customer_name, p_phone, p_model,
    p_variant, p_source, p_est_value, 'new', 30
  )
  returning * into v_lead;

  insert into public.lead_activities (lead_id, dealer_id, actor_id, type, detail)
  values (v_lead.id, v_lead.dealer_id, auth.uid(), 'note', 'Lead created');

  insert into public.follow_ups (lead_id, dealer_id, agent_id, due_date, note)
  values (
    v_lead.id, v_lead.dealer_id, v_lead.agent_id,
    (now() at time zone 'Asia/Manila')::date,
    'First contact: ' || p_customer_name
  );

  return v_lead;
end;
$$;

grant execute on function
  public.create_lead(text, text, text, text, public.lead_source, numeric)
  to authenticated;

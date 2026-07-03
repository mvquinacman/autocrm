-- Atomic stage advance for the one-click "→ next stage" action.
-- In a single transaction: bumps the lead to the next pipeline stage,
-- adds +12 probability (capped at 100), and schedules the next follow-up
-- 2 days out (skipped when the lead is released). The stage_change
-- activity row is written by the existing leads_log_stage_change trigger
-- inside the same transaction, so no separate insert here.
--
-- SECURITY INVOKER on purpose: every statement runs under the caller's
-- RLS, so an agent can only advance leads they can already update.

create or replace function public.advance_lead_stage(p_lead_id uuid)
returns public.leads
language plpgsql
set search_path = public
as $$
declare
  v_lead public.leads;
  v_next public.pipeline_stage;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'Lead not found or not accessible';
  end if;

  v_next := case v_lead.stage
    when 'new' then 'contacted'::public.pipeline_stage
    when 'contacted' then 'showroom'
    when 'showroom' then 'test_drive'
    when 'test_drive' then 'application'
    when 'application' then 'approved'
    when 'approved' then 'released'
    else null
  end;
  if v_next is null then
    raise exception 'Lead is already released';
  end if;

  update public.leads
  set stage = v_next,
      probability = least(v_lead.probability + 12, 100)
  where id = p_lead_id
  returning * into v_lead;

  if v_next <> 'released' then
    insert into public.follow_ups (lead_id, dealer_id, agent_id, due_date, note)
    values (
      p_lead_id,
      v_lead.dealer_id,
      v_lead.agent_id,
      (now() at time zone 'Asia/Manila')::date + 2,
      'Follow up: lead moved to ' || replace(v_next::text, '_', ' ')
    );
  end if;

  return v_lead;
end;
$$;

grant execute on function public.advance_lead_stage(uuid) to authenticated;

-- Undo for the one-tap stage advance: restores the previous stage and
-- probability and removes the follow-up the advance auto-created — one
-- transaction. The stage_change trigger logs the reversal too, so the
-- activity timeline stays honest (X → Y followed by Y → X).
--
-- SECURITY INVOKER: caller's RLS applies — an agent can only undo on
-- leads they can update.

create or replace function public.undo_lead_advance(
  p_lead_id uuid,
  p_prev_stage public.pipeline_stage,
  p_prev_probability integer
)
returns public.leads
language plpgsql
set search_path = public
as $$
declare
  v_lead public.leads;
  v_note text;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'Lead not found or not accessible';
  end if;

  -- note text the advance rpc used when it created the follow-up
  v_note := 'Follow up: lead moved to ' || replace(v_lead.stage::text, '_', ' ');

  update public.leads
  set stage = p_prev_stage,
      probability = greatest(least(p_prev_probability, 100), 0)
  where id = p_lead_id
  returning * into v_lead;

  -- remove the auto-created follow-up (newest pending match only;
  -- advancing to released created none, so this is a safe no-op there)
  delete from public.follow_ups
  where id in (
    select id from public.follow_ups
    where lead_id = p_lead_id and status = 'pending' and note = v_note
    order by created_at desc
    limit 1
  );

  return v_lead;
end;
$$;

grant execute on function
  public.undo_lead_advance(uuid, public.pipeline_stage, integer)
  to authenticated;

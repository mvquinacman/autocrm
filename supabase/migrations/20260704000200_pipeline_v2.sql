-- Pipeline v2 — Rommel's validated 12-stage dealership lead lifecycle,
-- replacing new/contacted/showroom/test_drive/application/approved/released.
-- Runs after the original enum migration, so it transforms the existing
-- type in place and remaps any existing rows (local reseeds anyway; hosted
-- keeps its data). One concern: the pipeline stage model.

-- ---------------------------------------------------------------------------
-- 1. Drop the functions that reference the enum (by value or in signature)
--    so the type can be replaced; recreated at the bottom with new stages.
-- ---------------------------------------------------------------------------
drop function if exists public.advance_lead_stage(uuid);
drop function if exists public.create_lead(text, text, text, text, public.lead_source, numeric);
drop function if exists public.undo_lead_advance(uuid, public.pipeline_stage, integer);

-- ---------------------------------------------------------------------------
-- 2. Swap the enum type, remapping old rows by text value.
--    The stage-change trigger has a WHEN clause on stage, which blocks the
--    column type change, so drop it first and recreate it after.
-- ---------------------------------------------------------------------------
drop trigger if exists leads_log_stage_change on public.leads;

alter table public.leads alter column stage drop default;

alter type public.pipeline_stage rename to pipeline_stage_old;

create type public.pipeline_stage as enum (
  'new_lead',
  'attempting_contact',
  'no_response',
  'contacted',
  'proposal_sent',
  'application_submitted',
  'cash_transaction',
  'bank_processing',
  'approved',
  'denied',
  'unit_released',
  'cancelled_lost'
);

alter table public.leads
  alter column stage type public.pipeline_stage
  using (
    case stage::text
      when 'new' then 'new_lead'
      when 'contacted' then 'contacted'
      when 'showroom' then 'contacted'
      when 'test_drive' then 'proposal_sent'
      when 'application' then 'application_submitted'
      when 'approved' then 'approved'
      when 'released' then 'unit_released'
      else 'new_lead'
    end::public.pipeline_stage
  );

alter table public.leads alter column stage set default 'new_lead';

drop type public.pipeline_stage_old;

-- recreate the stage-change logging trigger dropped above
create trigger leads_log_stage_change
  after update on public.leads
  for each row
  when (new.stage is distinct from old.stage)
  execute function app.log_stage_change();

-- ---------------------------------------------------------------------------
-- 3. Stage → default probability. Terminal-negative stages are 0.
-- ---------------------------------------------------------------------------
create or replace function app.stage_probability(p_stage public.pipeline_stage)
returns integer
language sql immutable
as $$
  select case p_stage
    when 'new_lead' then 10
    when 'attempting_contact' then 20
    when 'no_response' then 15
    when 'contacted' then 40
    when 'proposal_sent' then 55
    when 'application_submitted' then 70
    when 'cash_transaction' then 80
    when 'bank_processing' then 80
    when 'approved' then 90
    when 'denied' then 0
    when 'unit_released' then 100
    when 'cancelled_lost' then 0
  end;
$$;

grant execute on function app.stage_probability(public.pipeline_stage)
  to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- 4. Rewritten RPCs.
-- ---------------------------------------------------------------------------

-- One-tap advance along the happy path. Cash-vs-bank and the off-ramps
-- (no_response, denied, cancelled_lost) are set explicitly via set_lead_stage.
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
    when 'new_lead' then 'attempting_contact'
    when 'attempting_contact' then 'contacted'
    when 'no_response' then 'contacted'
    when 'contacted' then 'proposal_sent'
    when 'proposal_sent' then 'application_submitted'
    when 'application_submitted' then 'bank_processing'
    when 'cash_transaction' then 'approved'
    when 'bank_processing' then 'approved'
    when 'approved' then 'unit_released'
    else null
  end;
  if v_next is null then
    raise exception 'Lead is already at a final stage';
  end if;

  update public.leads
  set stage = v_next,
      probability = app.stage_probability(v_next)
  where id = p_lead_id
  returning * into v_lead;

  -- schedule a nudge for stages that still need action
  if v_next <> 'unit_released' then
    insert into public.follow_ups (lead_id, dealer_id, agent_id, due_date, note)
    values (
      p_lead_id, v_lead.dealer_id, v_lead.agent_id,
      (now() at time zone 'Asia/Manila')::date + 2,
      'Follow up: lead moved to ' || replace(v_next::text, '_', ' ')
    );
  end if;

  return v_lead;
end;
$$;

grant execute on function public.advance_lead_stage(uuid) to authenticated;

-- Explicit stage set for branch/off-ramp moves (cash vs bank, no_response,
-- denied, cancelled_lost, or any correction). Probability follows the stage.
create or replace function public.set_lead_stage(
  p_lead_id uuid,
  p_stage public.pipeline_stage
)
returns public.leads
language plpgsql
set search_path = public
as $$
declare
  v_lead public.leads;
begin
  update public.leads
  set stage = p_stage,
      probability = app.stage_probability(p_stage)
  where id = p_lead_id
  returning * into v_lead;

  if not found then
    raise exception 'Lead not found or not accessible';
  end if;

  return v_lead;
end;
$$;

grant execute on function public.set_lead_stage(uuid, public.pipeline_stage)
  to authenticated;

-- Atomic lead creation (stage new_lead, its default probability).
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
    p_variant, p_source, p_est_value, 'new_lead',
    app.stage_probability('new_lead')
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

-- Undo the last advance: restore prior stage + probability, remove the
-- auto-created follow-up.
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

  v_note := 'Follow up: lead moved to ' || replace(v_lead.stage::text, '_', ' ');

  update public.leads
  set stage = p_prev_stage,
      probability = greatest(least(p_prev_probability, 100), 0)
  where id = p_lead_id
  returning * into v_lead;

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

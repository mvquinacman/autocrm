-- triggers on leads: updated_at maintenance, team sync, stage-change logging

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at
  before update on public.leads
  for each row
  execute function app.set_updated_at();

-- keep leads.team_id in sync with the assigned agent's team;
-- runs before the update rls with-check, so gsm reassignment
-- is validated against the new agent's team
create or replace function app.sync_lead_team()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- old is not assigned on insert, so branch on tg_op first
  if tg_op = 'INSERT' then
    select team_id into new.team_id
    from public.profiles
    where id = new.agent_id;
  elsif new.agent_id is distinct from old.agent_id then
    select team_id into new.team_id
    from public.profiles
    where id = new.agent_id;
  end if;
  return new;
end;
$$;

create trigger leads_sync_team
  before insert or update on public.leads
  for each row
  execute function app.sync_lead_team();

-- security definer so the insert bypasses lead_activities rls
create or replace function app.log_stage_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.lead_activities (lead_id, dealer_id, actor_id, type, detail)
  values (new.id, new.dealer_id, auth.uid(), 'stage_change', old.stage || ' → ' || new.stage);
  return new;
end;
$$;

create trigger leads_log_stage_change
  after update on public.leads
  for each row
  when (new.stage is distinct from old.stage)
  execute function app.log_stage_change();

-- Escalate stale follow-ups: any 'pending' follow-up more than 1 day past
-- its due date flips to 'missed', with a lead_activities note per row so the
-- escalation shows up in the lead timeline. Runs nightly via pg_cron and is
-- also callable manually (service_role only).

-- Preloaded in the local Supabase Postgres image; enableable on hosted.
create extension if not exists pg_cron;

-- SECURITY DEFINER on purpose: clients have no policy allowing arbitrary
-- status flips on other users' follow_ups, and the cron job runs with no
-- request context. Owner (postgres) bypasses RLS on both tables.
create or replace function public.escalate_missed_follow_ups()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with escalated as (
    update public.follow_ups
    set status = 'missed'
    where status = 'pending'
      -- "more than 1 day overdue" in dealership-local time (Asia/Manila)
      and due_date < (now() at time zone 'Asia/Manila')::date - 1
    returning lead_id, dealer_id, due_date, note
  ),
  logged as (
    insert into public.lead_activities (lead_id, dealer_id, actor_id, type, detail)
    select
      e.lead_id,
      e.dealer_id,
      null,        -- system action, no human actor
      'note',
      'Follow-up missed (was due ' || to_char(e.due_date, 'YYYY-MM-DD') || '): '
        || coalesce(e.note, 'no note')
    from escalated e
    returning 1
  )
  select count(*) into v_count from logged;

  return v_count;
end;
$$;

-- Functions default to EXECUTE for PUBLIC — strip that so agents can't
-- trigger escalation, then allow only service_role (and the cron job,
-- which runs as the function owner).
revoke execute on function public.escalate_missed_follow_ups() from public, anon, authenticated;
grant execute on function public.escalate_missed_follow_ups() to service_role;

-- pg_cron evaluates schedules in UTC: 17:00 UTC = 01:00 Asia/Manila (UTC+8)
-- the next calendar day. Named job, so re-scheduling upserts instead of
-- duplicating.
select cron.schedule(
  'escalate-missed-follow-ups',
  '0 17 * * *',
  'select public.escalate_missed_follow_ups()'
);

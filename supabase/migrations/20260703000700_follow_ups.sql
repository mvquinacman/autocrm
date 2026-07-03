-- follow_ups: scheduled follow-up reminders per lead

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  agent_id uuid not null references public.profiles (id),
  due_date date not null,
  status public.follow_up_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index follow_ups_dealer_id_idx on public.follow_ups (dealer_id);
create index follow_ups_lead_id_idx on public.follow_ups (lead_id);
create index follow_ups_agent_status_due_idx on public.follow_ups (agent_id, status, due_date);

-- leads: sales pipeline records

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  agent_id uuid not null references public.profiles (id),
  customer_name text not null,
  phone text,
  source public.lead_source not null default 'other',
  model text,
  variant text,
  stage public.pipeline_stage not null default 'new',
  probability int not null default 30 check (probability between 0 and 100),
  est_value numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_dealer_id_idx on public.leads (dealer_id);
create index leads_team_id_idx on public.leads (team_id);
create index leads_agent_id_idx on public.leads (agent_id);
create index leads_dealer_id_stage_idx on public.leads (dealer_id, stage);

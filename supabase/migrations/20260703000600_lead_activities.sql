-- lead_activities: append-only activity log per lead

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  type public.activity_type not null,
  detail text,
  created_at timestamptz not null default now()
);

create index lead_activities_lead_id_idx on public.lead_activities (lead_id);
create index lead_activities_dealer_id_idx on public.lead_activities (dealer_id);

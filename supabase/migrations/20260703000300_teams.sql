-- teams: sales teams within a dealership

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  name text not null,
  monthly_target_units int not null default 0,
  unique (dealer_id, name)
);

create index teams_dealer_id_idx on public.teams (dealer_id);

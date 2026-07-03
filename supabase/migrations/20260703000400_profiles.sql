-- profiles: one row per auth user, carries role and tenant scoping

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  phone text,
  monthly_target_units int,
  created_at timestamptz not null default now(),
  -- agents and gsms must have a team; all other roles must not
  constraint profiles_team_matches_role check (
    (role in ('agent', 'gsm')) = (team_id is not null)
  )
);

create index profiles_dealer_id_idx on public.profiles (dealer_id);
create index profiles_team_id_idx on public.profiles (team_id);

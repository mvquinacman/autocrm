-- dealers: tenant root table (only table without a dealer_id column)

create table public.dealers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  city text,
  created_at timestamptz not null default now()
);

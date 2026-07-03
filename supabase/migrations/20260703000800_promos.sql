-- promos: dealership promo materials

create table public.promos (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  title text not null,
  model text,
  description text,
  file_url text,
  active boolean not null default true,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);

create index promos_dealer_id_idx on public.promos (dealer_id);

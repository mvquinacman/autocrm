-- app schema: security definer helpers used by rls policies
-- security definer so they can read profiles without tripping profiles rls

create schema if not exists app;

grant usage on schema app to authenticated, anon, service_role;

create or replace function app.user_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function app.user_dealer_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select dealer_id from public.profiles where id = auth.uid();
$$;

create or replace function app.user_team_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select team_id from public.profiles where id = auth.uid();
$$;

grant execute on all functions in schema app to authenticated, anon, service_role;

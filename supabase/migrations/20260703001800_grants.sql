-- table grants: rls does row filtering, grants cap what verbs each role
-- can even attempt. profiles keeps its column-limited update grant from
-- the profiles rls migration — deliberately not re-granted table-wide here.

grant usage on schema public to authenticated, anon, service_role;

grant select on public.dealers to authenticated;
grant select on public.teams to authenticated;
grant select on public.profiles to authenticated;
grant select on public.promos to authenticated;

grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.follow_ups to authenticated;

grant select, insert on public.lead_activities to authenticated;

-- rls restricts these to admin
grant insert, update, delete on public.teams to authenticated;
grant insert, update, delete on public.promos to authenticated;

grant all on all tables in schema public to service_role;

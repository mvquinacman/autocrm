-- Broadcast lead changes over Supabase Realtime (postgres_changes).
-- RLS still applies per-subscriber: a GSM only receives events for rows
-- their leads policies let them see.

alter publication supabase_realtime add table public.leads;

-- Migration 002: Row-Level Security (RLS)
-- File: supabase/migrations/20260101000002_rls_policies.sql
-- Purpose: Enable RLS and restrict all table access to service_role only
--
-- Note: With RLS enabled and only a service_role permissive policy,
-- all other roles (anon, authenticated) are denied by default.
-- No explicit deny policies are needed — adding `using(false)` for `FOR ALL`
-- would actually block service_role too, since all permissive policies
-- are OR'd together but a `using(false)` FOR ALL policy still evaluates.

-- Enable RLS on all tables
alter table public.messages enable row level security;
alter table public.events enable row level security;

-- MESSAGES: Only service-role can read/write (backend API is the sole gateway).
-- With RLS enabled, anon/authenticated are denied by default (no matching policy).
create policy "service_role_full_access_messages"
  on public.messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- EVENTS: Only service-role can read/write.
create policy "service_role_full_access_events"
  on public.events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Migration 011: extend events table
-- Purpose: Add session_id and referrer columns for user journey analysis

alter table public.events
  add column if not exists session_id text,
  add column if not exists referrer text;

create index if not exists events_session_id_idx on public.events(session_id);

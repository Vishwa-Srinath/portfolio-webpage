-- Migration 008: tech_radar_entries table
-- Purpose: Powers the /radar page. Replaces the flat JSON file (content/radar/entries.json)
--          with a real table — the migration path that the page-by-page guide anticipated.
--          Field names mirror the existing RadarEntry TypeScript interface so lib/radar.ts
--          only needs a body swap, not a rewrite.
--
-- DEPENDS ON: set_updated_at() function defined in migration 004 (profile.sql).

create table public.tech_radar_entries (
    id           uuid primary key default uuid_generate_v4(),
    entry_date   date not null default current_date,  -- The date this entry was added/last revisited
    title        text not null,                        -- Technology/tool/paper name: "Pydantic AI"
    category     text not null,
        -- Free text (NOT an enum or CHECK constraint) so new categories can be added
        -- by inserting a row, without a migration. Common values: "framework", "infra",
        -- "hardware", "paper", "language", "tool", "database", "service", "model"
    status       text not null check (status in ('watching', 'trying', 'adopted', 'dropped')),
        -- 'watching'  = aware of it, haven't started
        -- 'trying'    = actively experimenting
        -- 'adopted'   = in regular use / recommended
        -- 'dropped'   = tried and decided against; kept for history
    summary      text not null,                        -- 1-3 sentence note on why this status
    link         text,                                 -- Official site / paper / repo URL
    tags         text[],                               -- Optional additional labels (not FK'd to tags table)
        -- Deliberately a text[] not FK'd to the tags table — radar entries have different
        -- tag semantics (e.g. "LLM", "edge", "academic") that may not overlap with content tags.
        -- Promote to a FK join table if you want unified tag filtering across both systems.
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- Primary access pattern: all entries newest-first (reverse-chronological radar feed)
create index tech_radar_date_idx on public.tech_radar_entries(entry_date desc);
-- Filtering by status (adopted/watching/trying/dropped tabs on the /radar page)
create index tech_radar_status_idx on public.tech_radar_entries(status);
-- Searching by category (future: filter panel on /radar)
create index tech_radar_category_idx on public.tech_radar_entries(category);

comment on table public.tech_radar_entries is
  'Replaces content/radar/entries.json. Field names match the RadarEntry TS interface. '
  'category is free text (not an enum) — add new categories by inserting a row, no migration needed.';

comment on column public.tech_radar_entries.category is
  'Free-text category label. NOT a Postgres enum or CHECK constraint — '
  'this is intentional so new categories (e.g. "hardware", "paper", "model") '
  'can be added by inserting a row, not by writing a migration.';

comment on column public.tech_radar_entries.tags is
  'Optional text[] for additional labels. Separate from the normalized tags table '
  'used by content_items — radar tag semantics differ (e.g. "LLM", "edge"). '
  'Promote to a FK join table if you want unified cross-system tag filtering.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.tech_radar_entries enable row level security;

create policy "public_read_radar"
  on public.tech_radar_entries for select using (true);

create policy "service_role_write_radar"
  on public.tech_radar_entries for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- FIX (Bug 3): Use CREATE OR REPLACE FUNCTION guard before attaching the trigger,
-- so this migration is safe even if run in isolation (e.g. during a db reset).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tech_radar_set_updated_at on public.tech_radar_entries;
create trigger tech_radar_set_updated_at
  before update on public.tech_radar_entries
  for each row execute function public.set_updated_at();

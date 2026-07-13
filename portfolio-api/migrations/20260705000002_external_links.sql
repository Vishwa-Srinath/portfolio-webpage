-- Migration 005: external_links table
-- Purpose: Store every outbound link the site renders (social icons, YouTube channel,
--          Google Scholar/Drive, resume, community pages, etc.).
--          Add a new platform by inserting a row — never by touching code.

create table public.external_links (
    id             uuid primary key default uuid_generate_v4(),
    category       text not null check (category in (
                       'social',        -- GitHub, LinkedIn, X/Twitter, Bluesky
                       'video',         -- YouTube channel, individual videos, playlists
                       'google',        -- Google Scholar, Drive, Developer profile, Photos
                       'professional',  -- Resume PDF, portfolio, Behance, Dribbble
                       'community',     -- Facebook page (Behind the Bit), Discord, forums
                       'resource'       -- Catch-all for anything else
                   )),
    platform       text not null,                 -- "github" | "linkedin" | "youtube" | "google_scholar" | ...
    label          text not null,                 -- Display text: "GitHub", "Behind the Bit"
    url            text not null,
    icon           text,                          -- lucide-react icon name: "Github", "Youtube", etc.
    description    text,                          -- Optional tooltip / subtitle shown on hover
    display_order  integer not null default 0,    -- Lower = rendered first within same category
    is_active      boolean not null default true, -- Soft-hide a link without deleting it
    metadata       jsonb not null default '{}'::jsonb,
        -- Per-platform extras, e.g.:
        -- YouTube: {"channel_id": "UC...", "subscriber_count_cached": 1200}
        -- LinkedIn: {"follower_count_cached": 500}
        -- Google Scholar: {"citation_count_cached": 12, "h_index_cached": 3}
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index external_links_category_idx on public.external_links(category);
create index external_links_active_order_idx on public.external_links(is_active, display_order);

comment on table public.external_links is
  'Every outbound link the site renders: social icons, YouTube channel, '
  'Google Scholar/Drive, resume, community pages. '
  'Add a new platform by inserting a row — no code change, no migration.';

comment on column public.external_links.metadata is
  'Free-form per-platform extras, e.g. cached subscriber/follower counts, '
  'so the frontend can show "1.2k subscribers" without a live API call on each render.';

comment on column public.external_links.is_active is
  'Soft-delete flag: set false to hide a link without losing its data. '
  'The public_read_active_links RLS policy automatically excludes inactive rows.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.external_links enable row level security;

-- Public can only see active links (is_active = true)
create policy "public_read_active_links"
  on public.external_links for select
  using (is_active = true);

-- Backend service-role has full access (insert new platforms, update metadata cache)
create policy "service_role_full_access_links"
  on public.external_links for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- FIX (Bug 6): external_links had updated_at column but no trigger.
-- set_updated_at() is defined in migration 004 (profile.sql) which runs first.
-- CREATE OR REPLACE guard makes this migration safe if run in isolation.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists external_links_set_updated_at on public.external_links;
create trigger external_links_set_updated_at
  before update on public.external_links
  for each row execute function public.set_updated_at();

-- Migration 007-2: content_items table
-- Purpose: Unified table for all four content lanes (projects / learn / stories / notes).
--          Replaces per-lane MDX folders. The lane column is the discriminator.
--          Function signatures in lib/content.ts stay identical — only the data source changes.
--
-- DEPENDS ON: content_series (migration 007-1) for the series_id FK.
--             set_updated_at() function defined in migration 004 (profile.sql).

create table public.content_items (
    id              uuid primary key default uuid_generate_v4(),
    lane            text not null check (lane in ('projects', 'learn', 'stories', 'notes')),
    slug            text not null,
    title           text not null check (char_length(title) between 1 and 200),
    summary         text not null check (char_length(summary) <= 500),
    content_body    text not null,                  -- Raw Markdown/MDX source; rendered client-side
    cover_image_url text,                            -- Hero/thumbnail image for the card + detail page
    live_url        text,                            -- Projects only: link to deployed app/demo
    repo_url        text,                            -- Projects only: GitHub repo link
    video_url       text,                            -- Optional embedded YouTube demo/walkthrough
    status          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    featured        boolean not null default false,  -- Pin to homepage teaser / lane featured section
    series_id       uuid references public.content_series(id) on delete set null,
    series_order    integer,                          -- Position within the series (1-based), null if standalone
    view_count      integer not null default 0,      -- Denormalized; incremented via /api/v1/events or a trigger
    published_at    timestamptz,                     -- Null until explicitly published; also used for ordering
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    -- Full-text search vector: weighted so title matches rank higher than body matches
    search_vector   tsvector generated always as (
                        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                        setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
                        setweight(to_tsvector('english', coalesce(content_body, '')), 'C')
                    ) stored,

    -- Composite unique: same slug can exist in different lanes (e.g. /projects/redis vs /learn/redis)
    unique (lane, slug)
);

-- Primary query pattern: list all published items in a lane, newest first
create index content_items_lane_status_idx on public.content_items(lane, status, published_at desc);
-- Featured items query (used by homepage teasers)
create index content_items_featured_idx on public.content_items(featured) where featured = true;
-- Full-text search (GIN index on the stored tsvector)
create index content_items_search_idx on public.content_items using gin(search_vector);
-- Series navigation: fetch all items in a series in reading order
create index content_items_series_idx on public.content_items(series_id, series_order) where series_id is not null;

comment on table public.content_items is
  'Unified table for all four content lanes (projects/learn/stories/notes). '
  'Replaces per-lane MDX folders. The lane column is the discriminator. '
  'lib/content.ts function signatures (getAllContentByType, getContentBySlug) are unchanged.';

comment on column public.content_items.content_body is
  'Raw Markdown/MDX text. Rendered by the same MDX pipeline as before — '
  'only the storage location changed from a .mdx file to this column.';

comment on column public.content_items.search_vector is
  'Generated tsvector enabling full-text search across title (weight A), '
  'summary (weight B), and body (weight C) with a single GIN index. '
  'Powers the /api/v1/search endpoint.';

comment on column public.content_items.series_id is
  'FK to content_series.id (nullable). Null = standalone article. '
  'Set series_order (1-based) alongside series_id for prev/next navigation.';

comment on column public.content_items.view_count is
  'Denormalized view counter. Incremented by the /api/v1/events endpoint '
  'when event_name = "page_view" and page matches this item''s URL. '
  'Future: promote to a DB trigger for atomicity if traffic warrants it.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.content_items enable row level security;

-- Anonymous visitors and frontend only see published items
create policy "public_read_published_content"
  on public.content_items for select
  using (status = 'published');

-- Backend service-role has full access (create drafts, publish, archive, delete)
create policy "service_role_full_access_content"
  on public.content_items for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- FIX (Bug 3): set_updated_at() is now defined in migration 004 (profile.sql).
-- We keep CREATE OR REPLACE FUNCTION here as a safety net only — it's idempotent.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists content_items_set_updated_at on public.content_items;
create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

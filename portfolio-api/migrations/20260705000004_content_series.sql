-- Migration 007-1: content_series table
-- Purpose: Optional grouping for multi-part content (e.g. "MST Algorithm Series"
--          that contains Kruskal's, Prim's, Borůvka's as sequentially ordered items).
--
-- MUST run before content_items (migration 007-2) because content_items.series_id
-- is a FK reference to this table.

create table public.content_series (
    id           uuid primary key default uuid_generate_v4(),
    lane         text not null check (lane in ('projects', 'learn', 'stories', 'notes')),
    title        text not null,         -- e.g. "MST Algorithm Series"
    description  text,                  -- Optional intro paragraph shown at the series level
    slug         text,                  -- Optional URL slug for a dedicated series page (future)
    display_order integer not null default 0,  -- Ordering when multiple series exist in a lane
    created_at   timestamptz not null default now()
);

comment on table public.content_series is
  'Optional grouping for multi-part content. Example: "MST Algorithm Series" '
  'containing Kruskal''s, Prim''s, and Borůvka''s as ordered articles. '
  'A content_item joins a series via content_items.series_id (FK, nullable).';

comment on column public.content_series.slug is
  'Future: slug for a dedicated series landing page (e.g. /learn/series/mst-algorithms). '
  'Currently nullable — add a non-null constraint + unique index when the page is built.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.content_series enable row level security;

create policy "public_read_series"
  on public.content_series for select using (true);

create policy "service_role_write_series"
  on public.content_series for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

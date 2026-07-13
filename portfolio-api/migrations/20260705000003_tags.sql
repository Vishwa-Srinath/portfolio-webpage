-- Migration 006: tags table
-- Purpose: Normalized tag vocabulary shared across all content lanes and the Tech Radar.
--          A tag row represents a single technology/topic label (e.g. "FastAPI", "VHDL").
--          content_tags join table (defined in migration 007-3) links tags to content_items.

create table public.tags (
    id          uuid primary key default uuid_generate_v4(),
    name        text not null unique,   -- Display name: "FastAPI", "VHDL", "Pydantic AI"
    slug        text not null unique,   -- URL-safe slug: "fastapi", "vhdl", "pydantic-ai"
    color       text,                   -- Optional hex/CSS color override for the tag pill UI
                                        -- Falls back to the lane accent color if null
    created_at  timestamptz not null default now()
);

comment on table public.tags is
  'Normalized tag vocabulary shared across all content lanes (projects/learn/stories/notes) '
  'and, later, the Tech Radar. Add a new tag by inserting a row.';

comment on column public.tags.color is
  'Optional CSS color (hex or named) for the tag pill. '
  'Null means "inherit lane accent color" — only set this for cross-lane tags '
  'that need a consistent visual identity regardless of which lane they appear in.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.tags enable row level security;

create policy "public_read_tags"
  on public.tags for select using (true);

create policy "service_role_write_tags"
  on public.tags for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

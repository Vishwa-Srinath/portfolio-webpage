-- Migration 009: youtube_videos table
-- Purpose: Cache of YouTube channel video metadata, refreshed by a scheduled pipeline
--          (cron / n8n / GitHub Action using YouTube Data API v3).
--          NEVER hand-edited — this table is pipeline-fed only.
--
-- Pattern: upsert on video_id (YouTube's natural unique key), last_synced_at tracks freshness.
-- This table is the template for future pipeline-fed cache tables
-- (GitHub repo stats, Devpost hackathon results, etc.).

create table public.youtube_videos (
    id               uuid primary key default uuid_generate_v4(),
    video_id         text not null unique,          -- YouTube's own video ID (natural dedupe key)
    title            text not null,
    description      text,
    thumbnail_url    text,                           -- maxresdefault or hqdefault thumbnail URL
    channel_id       text,                           -- YouTube channel ID (UC...) for grouping
    playlist_id      text,                           -- Optional: which playlist this belongs to
    published_at     timestamptz,                    -- When YouTube published the video
    duration_seconds integer,                        -- Video duration (parsed from ISO 8601 duration)
    view_count       bigint,                         -- Use bigint — viral videos exceed int range
    like_count       integer,
    comment_count    integer,                        -- Future: show engagement on the page
    tags             text[],                         -- YouTube's own tags (separate from internal tags table)
    is_featured      boolean not null default false, -- Manually pin videos to homepage teaser
    is_visible       boolean not null default true,  -- Soft-hide specific videos from the site
    last_synced_at   timestamptz not null default now(),
    created_at       timestamptz not null default now()
);

-- Primary sort: newest uploads first
create index youtube_videos_published_idx on public.youtube_videos(published_at desc);
-- Homepage featured query (partial index — only indexes the small set of featured videos)
create index youtube_videos_featured_idx on public.youtube_videos(is_featured) where is_featured = true;
-- Channel grouping (for future /videos page with playlist/channel filters)
create index youtube_videos_channel_idx on public.youtube_videos(channel_id);

comment on table public.youtube_videos is
  'Pipeline-fed cache of YouTube channel video metadata. Refreshed by a scheduled job '
  '(daily GitHub Action or n8n cron) using YouTube Data API v3. '
  'Never hand-edited. Template pattern for future automated cache tables.';

comment on column public.youtube_videos.video_id is
  'YouTube''s own video ID — the natural deduplication key for upserts. '
  'Example: "dQw4w9WgXcQ" from https://youtube.com/watch?v=dQw4w9WgXcQ';

comment on column public.youtube_videos.view_count is
  'Uses bigint (not int) to accommodate viral video view counts that exceed the 2.1B int4 limit.';

comment on column public.youtube_videos.is_featured is
  'Manually set to true to pin a video to the homepage teaser widget. '
  'Set by the site owner, NOT overwritten by the sync pipeline.';

comment on column public.youtube_videos.is_visible is
  'Soft-hide flag for videos you don''t want on the site (private, unlisted reposts, etc.) '
  'without deleting the cache row. Sync pipeline never modifies this column.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.youtube_videos enable row level security;

-- Public can read visible videos only
create policy "public_read_youtube_videos"
  on public.youtube_videos for select using (is_visible = true);

-- Pipeline (service-role) has full access for upserts
create policy "service_role_write_youtube_videos"
  on public.youtube_videos for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

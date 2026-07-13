-- Migration 007-4: content_media table
-- Purpose: Zero-to-many media attachments per content item.
--          Handles project case studies with multiple screenshots, build-process GIFs,
--          embedded YouTube demos, and other media that doesn't fit in a single cover_image_url.
--
-- DEPENDS ON: content_items (007-2).

create table public.content_media (
    id            uuid primary key default uuid_generate_v4(),
    content_id    uuid not null references public.content_items(id) on delete cascade,
    media_type    text not null check (media_type in ('image', 'video', 'youtube', 'gif')),
    url           text not null,       -- Supabase Storage URL, CDN URL, or YouTube embed URL
    caption       text,                -- Alt text / figure caption rendered below the media
    display_order integer not null default 0,  -- Lower = shown first in the media gallery
    alt_text      text,                -- Explicit alt text for accessibility (images/gifs)
    created_at    timestamptz not null default now()
);

-- Primary access pattern: fetch all media for one content item, in order
create index content_media_content_id_idx on public.content_media(content_id, display_order);

comment on table public.content_media is
  'Gallery/media attachments for content items. One content item can have zero or more '
  'media rows. Types: image (static), gif (animated), video (direct file), '
  'youtube (embedded iframe by video ID).';

comment on column public.content_media.url is
  'For type="youtube": store the video_id (e.g. "dQw4w9WgXcQ"), not the full URL, '
  'so the frontend can construct the embed URL with its own parameters. '
  'For other types: full URL to the media file.';

comment on column public.content_media.alt_text is
  'Explicit alt text for screen readers. If null, falls back to caption. '
  'Required by accessibility guidelines for informative images.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.content_media enable row level security;

create policy "public_read_content_media"
  on public.content_media for select using (true);

create policy "service_role_write_content_media"
  on public.content_media for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

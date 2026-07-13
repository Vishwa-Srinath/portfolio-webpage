-- Migration 007-3: content_tags join table
-- Purpose: Many-to-many relationship between content_items and tags.
--          A content item can have many tags; a tag can appear on many items.
--
-- DEPENDS ON: content_items (007-2) and tags (006).

create table public.content_tags (
    content_id  uuid not null references public.content_items(id) on delete cascade,
    tag_id      uuid not null references public.tags(id) on delete cascade,
    primary key (content_id, tag_id)
);

-- Reverse lookup: "which content items use this tag?" (for tag filtering pages)
create index content_tags_tag_id_idx on public.content_tags(tag_id);

comment on table public.content_tags is
  'Join table: many-to-many between content_items and tags. '
  'ON DELETE CASCADE on both FKs means deleting a content item or a tag '
  'automatically removes the association row.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.content_tags enable row level security;

create policy "public_read_content_tags"
  on public.content_tags for select using (true);

create policy "service_role_write_content_tags"
  on public.content_tags for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

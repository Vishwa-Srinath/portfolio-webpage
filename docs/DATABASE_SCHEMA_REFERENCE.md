# DATABASE SCHEMA REFERENCE (v1.5 → v2, Supabase/Postgres)
**Version:** 1.5 | **Last Updated:** 2026-07-04
**Purpose:** Single source-of-truth schema for the portfolio, written to be handed directly to a coding agent (Claude Code, etc.) to implement. Extends `DATABASE_REFERENCE.md` v1.0 — does not throw anything away, upgrades `messages`/`events`/`content_embeddings`/`admin_users` in place and adds the new tables needed to move content, social/media links, and the Tech Radar from flat files into the database.

**Design goals (why this shape):**
1. **One source of truth per concern** — same principle as `FRONTEND_ARCHITECTURE.md` §9. Content lives in one `content_items` table, not four MDX folders + one JSON file.
2. **Expand without migrating** — new content lanes, new link platforms (YouTube, Google Scholar, Google Drive, whatever comes next), new media types, and new tags never require a schema change, only a new row. Enums are avoided in favor of `text` + `check` constraints or lookup tables, specifically so the agent (or you) can add a value without writing a migration.
3. **CMS-lite, not CMS-heavy** — no page builder, no rich block editor. Content body stays as Markdown/MDX text in a column. You keep writing in Markdown; the database just becomes the place it's stored instead of a git-tracked `.mdx` file, which is what unlocks an admin panel later without a rewrite.
4. **Safe by default** — RLS on every table from the first migration, service-role-only writes, public reads limited to `published` rows only.
5. **Pipelines-ready** — every table that will ever be written to by something other than you by hand (YouTube cache, analytics, embeddings) is separated from tables you edit by hand (content, links, radar), so an ingestion pipeline can run on a schedule without any risk of clobbering hand-written content.

---

## 0. How This Relates to Existing Docs

| Existing doc | What changes |
|---|---|
| `API_CONTRACTS.md` | `/api/v1/contact` and `/api/v1/events` unchanged. New endpoints needed: `/api/v1/content`, `/api/v1/radar`, `/api/v1/links` (all GET, public, read-only) — see §9. |
| `BACKEND_ARCHITECTURE.md` | Add `services/content_service.py`, `services/links_service.py`, `services/youtube_service.py` following the exact pattern of `supabase_service.py`. |
| `FRONTEND_ARCHITECTURE.md` / page-by-page guide | `lib/content.ts` and `lib/radar.ts` currently read the filesystem (MDX / JSON). Once this schema is live, swap their internals to call the FastAPI endpoints instead — **the function signatures (`getAllContentByType`, `getContentBySlug`, `getAllRadarEntries`) stay identical**, so no component changes anywhere, per the "one file to touch" principle already established in that doc. |
| `DATABASE_REFERENCE.md` v1.0 | `messages`, `events`, `content_embeddings`, `admin_users` are kept, in some cases extended (noted inline below). Nothing is dropped or renamed. |

**Migration numbering continues from the existing project:** `004_...` onward, since `001`–`003` already exist in `DATABASE_REFERENCE.md`.

---

## 1. Entity Overview

```
profile (singleton)
  └── used by Home, About

external_links ──────────────┐
  (social, youtube, google,  │  all rendered wherever
   professional, resource)   │  the frontend needs a link row

tags ──┬── content_tags ──── content_items ──┬── content_media
       │                                     ├── content_series (optional grouping)
       │                                     └── content_embeddings (v2 RAG, chunked from content_items)
       │
       └── (reused across all lanes: projects / learn / stories / notes)

tech_radar_entries (independent, lightweight, high-churn)

youtube_videos (cached from YouTube Data API, independent, pipeline-fed)

messages (contact form submissions)
events (analytics)
newsletter_subscribers (future, optional)
admin_users (v2 auth)
```

---

## 2. Migration 004: `profile` (Site Owner Singleton)

Replaces the hardcoded name/bio/photo currently sitting directly in `Hero.tsx` and `BioStrip.tsx` per the page-by-page guide. One row, always. This is what makes "update your bio without redeploying" possible later.

**File: `supabase/migrations/20260705000001_profile.sql`**

```sql
create table public.profile (
    id               uuid primary key default uuid_generate_v4(),
    full_name        text not null,
    role_line        text not null,                 -- "CS&E Undergraduate at University of Moratuwa — ..."
    bio_short        text not null,                  -- Home page strip
    bio_long         text not null,                  -- /about page
    headshot_url     text,
    resume_url       text,
    location         text,
    email_public     text,                           -- "Prefer email? Reach me at ..."
    education        jsonb default '[]',             -- [{institution, degree, batch, start_date, end_date, coursework: []}]
    skills           jsonb default '{}',              -- {"core": [...], "comfortable": [...], "exploring": [...]}
    timeline         jsonb default '[]',              -- [{year, title, description}]
    updated_at       timestamptz not null default now(),

    -- Enforce singleton at the DB level (agent can't accidentally create a 2nd row)
    constraint profile_singleton check (id = id) -- placeholder, real enforcement below
);

-- Enforce exactly one row via a unique constant expression trick
create unique index profile_singleton_idx on public.profile ((true));

comment on table public.profile is 'Singleton row: the site owner''s bio/education/skills data, replaces hardcoded Hero/About content';
comment on column public.profile.education is 'Array of education entries, newest first, free-form for expandability (bootcamps, certs, etc. later)';
comment on column public.profile.skills is 'Free-form JSON so proficiency buckets can change without a migration, e.g. adding a "hardware" bucket';

alter table public.profile enable row level security;

create policy "public_read_profile"
  on public.profile for select
  using (true);

create policy "service_role_write_profile"
  on public.profile for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

**Why JSONB for `education`/`skills`/`timeline` instead of separate tables:** these change shape more than they change row-count (you'll add a "certifications" bucket long before you have 50 education entries). JSONB keeps this a one-file edit; if it ever outgrows JSON (e.g. you want to query "everyone who studied at X"), promote it to a real table then — you only have one row to migrate.

---

## 3. Migration 005: `external_links` (Social, YouTube, Google, Everything)

This directly solves "I'm planning to upload YouTube links and other Google links as well" — instead of hardcoding icons in `Hero.tsx` per the current spec, every link becomes a row. Add a new platform by inserting a row, never by touching code.

**File: `supabase/migrations/20260705000002_external_links.sql`**

```sql
create table public.external_links (
    id             uuid primary key default uuid_generate_v4(),
    category       text not null check (category in (
                       'social',        -- GitHub, LinkedIn, X/Twitter
                       'video',         -- YouTube channel, individual videos, playlists
                       'google',        -- Google Scholar, Drive, Developer profile, Photos
                       'professional',  -- Resume, portfolio PDF, Behance, Dribbble
                       'community',     -- Facebook page (Behind the Bit), Discord, forum profile
                       'resource'       -- Anything else, catch-all
                   )),
    platform       text not null,                 -- "github" | "linkedin" | "youtube" | "google_scholar" | "facebook" | ...
    label          text not null,                 -- Display text: "GitHub", "Behind the Bit (Facebook)"
    url             text not null,
    icon           text,                          -- lucide-react icon name, e.g. "Github", "Youtube"
    description    text,                          -- optional tooltip / subtitle
    display_order  integer not null default 0,
    is_active      boolean not null default true, -- soft-hide without deleting
    metadata       jsonb default '{}',             -- e.g. {"channel_id": "UC...", "subscriber_count_cached": 1200}
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index external_links_category_idx on public.external_links(category);
create index external_links_active_order_idx on public.external_links(is_active, display_order);

comment on table public.external_links is 'Every outbound link the site renders: social icons, YouTube channel, Google Scholar/Drive, resume, community pages. Add a platform by inserting a row.';
comment on column public.external_links.metadata is 'Free-form per-platform extras, e.g. cached subscriber/follower counts, so the frontend can show "1.2k subscribers" without an API call';

alter table public.external_links enable row level security;

create policy "public_read_active_links"
  on public.external_links for select
  using (is_active = true);

create policy "service_role_full_access_links"
  on public.external_links for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

**Seed example (what you'd insert today):**

```sql
insert into public.external_links (category, platform, label, url, icon, display_order) values
  ('social', 'github', 'GitHub', 'https://github.com/yourhandle', 'Github', 1),
  ('social', 'linkedin', 'LinkedIn', 'https://linkedin.com/in/yourhandle', 'Linkedin', 2),
  ('video', 'youtube', 'YouTube — DSA Series', 'https://youtube.com/@yourhandle', 'Youtube', 3),
  ('community', 'facebook', 'Behind the Bit', 'https://facebook.com/behindthebit', 'Facebook', 4),
  ('google', 'google_scholar', 'Google Scholar', 'https://scholar.google.com/citations?user=...', 'GraduationCap', 5),
  ('google', 'google_drive', 'Public Resource Folder', 'https://drive.google.com/drive/folders/...', 'FolderOpen', 6);
```

Adding a new Google property (Developer profile, Photos album, whatever) later is just another `insert` — no code change, no migration.

---

## 4. Migration 006: `tags` + `content_tags` (Normalized Tags)

The current MDX frontmatter stores `tags: string[]` per file (`FRONTEND_ARCHITECTURE.md` §6). That's fine for a handful of files but doesn't scale to filtering/search across lanes. Normalize it now while the row count is small — this is the one part of the schema that gets genuinely painful to retrofit later.

**File: `supabase/migrations/20260705000003_tags.sql`**

```sql
create table public.tags (
    id          uuid primary key default uuid_generate_v4(),
    name        text not null unique,           -- "FastAPI", "VHDL", "Pydantic AI"
    slug        text not null unique,           -- "fastapi", "vhdl"
    color       text,                            -- optional override; falls back to lane accent if null
    created_at  timestamptz not null default now()
);

comment on table public.tags is 'Normalized tag vocabulary shared across all content lanes and, later, the Tech Radar';

alter table public.tags enable row level security;

create policy "public_read_tags"
  on public.tags for select using (true);

create policy "service_role_write_tags"
  on public.tags for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

(`content_tags` join table is defined in §5 once `content_items` exists.)

---

## 5. Migration 007: `content_items` (Projects / Learn / Stories / Notes, Unified)

This is the core table. It replaces the four MDX folders with one table plus a `lane` column, matching the four lanes already defined in `lib/lanes.ts`. **Nothing about the lane concept changes** — `projects`, `learn`, `stories`, `notes` stay exactly as-is conceptually; they just become a column value instead of a folder name.

**File: `supabase/migrations/20260705000004_content_items.sql`**

```sql
create table public.content_items (
    id              uuid primary key default uuid_generate_v4(),
    lane            text not null check (lane in ('projects', 'learn', 'stories', 'notes')),
    slug            text not null,
    title           text not null check (char_length(title) between 1 and 200),
    summary         text not null check (char_length(summary) <= 500),
    content_body    text not null,                  -- Markdown/MDX source, rendered client-side same as today
    cover_image_url text,
    live_url        text,                            -- projects only, null elsewhere
    repo_url        text,                            -- projects only, null elsewhere
    video_url       text,                            -- optional embedded YouTube demo/walkthrough
    status          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    featured        boolean not null default false,
    series_id       uuid references public.content_series(id) on delete set null,
    view_count      integer not null default 0,      -- denormalized, incremented via /api/v1/events or a trigger
    published_at    timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    search_vector   tsvector generated always as (
                        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                        setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
                        setweight(to_tsvector('english', coalesce(content_body, '')), 'C')
                    ) stored,

    unique (lane, slug)
);

create index content_items_lane_status_idx on public.content_items(lane, status, published_at desc);
create index content_items_featured_idx on public.content_items(featured) where featured = true;
create index content_items_search_idx on public.content_items using gin(search_vector);

comment on table public.content_items is 'Unified table for all four content lanes (projects/learn/stories/notes). Replaces per-lane MDX folders.';
comment on column public.content_items.content_body is 'Raw Markdown/MDX text, rendered the same way the current MDX pipeline does — only the storage location changed';
comment on column public.content_items.search_vector is 'Enables full-text search across all lanes later (e.g. a site-wide search bar) with zero extra tables';

alter table public.content_items enable row level security;

create policy "public_read_published_content"
  on public.content_items for select
  using (status = 'published');

create policy "service_role_full_access_content"
  on public.content_items for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Keep updated_at fresh automatically
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();
```

### 5.1 `content_series` (Optional Grouping — e.g. the MST Algorithm Series)

Referenced above; create it first in the same migration file (before `content_items`) or split into its own migration run earlier:

```sql
create table public.content_series (
    id           uuid primary key default uuid_generate_v4(),
    lane         text not null check (lane in ('projects', 'learn', 'stories', 'notes')),
    title        text not null,                 -- "MST Algorithm Series"
    description  text,
    created_at   timestamptz not null default now()
);

comment on table public.content_series is 'Optional grouping for multi-part content, e.g. Kruskal''s/Prim''s/Borůvka''s as one series with an ordered reading path';

alter table public.content_series enable row level security;

create policy "public_read_series" on public.content_series for select using (true);
create policy "service_role_write_series" on public.content_series for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
```

### 5.2 `content_tags` (Join Table)

```sql
create table public.content_tags (
    content_id  uuid not null references public.content_items(id) on delete cascade,
    tag_id      uuid not null references public.tags(id) on delete cascade,
    primary key (content_id, tag_id)
);

alter table public.content_tags enable row level security;

create policy "public_read_content_tags" on public.content_tags for select using (true);
create policy "service_role_write_content_tags" on public.content_tags for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
```

### 5.3 `content_media` (Gallery / Multiple Images or Videos per Item)

Handles the case where a project case study needs more than one `coverImage` — a build photo gallery, a demo GIF, an embedded YouTube walkthrough.

```sql
create table public.content_media (
    id           uuid primary key default uuid_generate_v4(),
    content_id   uuid not null references public.content_items(id) on delete cascade,
    media_type   text not null check (media_type in ('image', 'video', 'youtube', 'gif')),
    url          text not null,
    caption      text,
    display_order integer not null default 0,
    created_at   timestamptz not null default now()
);

create index content_media_content_id_idx on public.content_media(content_id, display_order);

alter table public.content_media enable row level security;

create policy "public_read_content_media" on public.content_media for select using (true);
create policy "service_role_write_content_media" on public.content_media for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
```

---

## 6. Migration 008: `tech_radar_entries`

Promotes the `/radar` page from the JSON file described in the page-by-page guide §4.2 into a real table — exactly the migration path that document already anticipated ("If this page grows past ~50 entries... migrate to a Supabase table `radar_entries`"). Field names below intentionally mirror the existing `RadarEntry` TypeScript interface so `lib/radar.ts` needs a body swap, not a rewrite.

**File: `supabase/migrations/20260705000005_tech_radar.sql`**

```sql
create table public.tech_radar_entries (
    id           uuid primary key default uuid_generate_v4(),
    entry_date   date not null default current_date,
    title        text not null,
    category     text not null,                 -- free text tag, not an enum: "framework" | "infra" | "hardware" | "paper" | ... extend freely
    status       text not null check (status in ('watching', 'trying', 'adopted', 'dropped')),
    summary      text not null,
    link         text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index tech_radar_date_idx on public.tech_radar_entries(entry_date desc);
create index tech_radar_status_idx on public.tech_radar_entries(status);

comment on table public.tech_radar_entries is 'Replaces content/radar/entries.json once entry volume makes JSON editing unwieldy; same fields as the RadarEntry TS interface';

alter table public.tech_radar_entries enable row level security;

create policy "public_read_radar" on public.tech_radar_entries for select using (true);
create policy "service_role_write_radar" on public.tech_radar_entries for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create trigger tech_radar_set_updated_at
  before update on public.tech_radar_entries
  for each row execute function public.set_updated_at();
```

`category` is deliberately free text rather than a `check (category in (...))` constraint — unlike `status`, which has a fixed, meaningful small set, categories are exactly the kind of thing you'll want to add without asking permission (you'll invent a new one the day you start a hardware project).

---

## 7. Migration 009: `youtube_videos` (Pipeline-Fed Cache)

Since you're planning to surface your YouTube channel content on the site, don't call the YouTube Data API on every page load — cache it. This table is written by a scheduled job (cron / n8n / GitHub Action), never by hand, which is exactly the "pipelining" pattern you mentioned wanting to build toward.

**File: `supabase/migrations/20260705000006_youtube_videos.sql`**

```sql
create table public.youtube_videos (
    id             uuid primary key default uuid_generate_v4(),
    video_id       text not null unique,          -- YouTube's own video ID, natural dedupe key
    title          text not null,
    description    text,
    thumbnail_url  text,
    published_at   timestamptz,
    duration_seconds integer,
    view_count     integer,                        -- cached from API, refreshed by the pipeline
    like_count     integer,
    tags           text[],                          -- YouTube's own tags, kept separate from the internal `tags` table
    is_featured    boolean not null default false,  -- manually pin specific videos to the homepage teaser
    last_synced_at timestamptz not null default now(),
    created_at     timestamptz not null default now()
);

create index youtube_videos_published_idx on public.youtube_videos(published_at desc);
create index youtube_videos_featured_idx on public.youtube_videos(is_featured) where is_featured = true;

comment on table public.youtube_videos is 'Cache of your YouTube channel videos, refreshed on a schedule by an ingestion pipeline (cron/n8n) using the YouTube Data API — never hand-edited';

alter table public.youtube_videos enable row level security;

create policy "public_read_youtube_videos" on public.youtube_videos for select using (true);
create policy "service_role_write_youtube_videos" on public.youtube_videos for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
```

**Sync pattern (for the pipeline, not the API):**

```python
# services/youtube_service.py — run on a schedule (e.g. daily GitHub Action or n8n cron)
async def sync_youtube_videos(channel_id: str):
    videos = await fetch_from_youtube_data_api(channel_id)  # existing YouTube Data API v3 call
    for v in videos:
        supabase_client.table("youtube_videos").upsert({
            "video_id": v["id"],
            "title": v["title"],
            "description": v["description"],
            "thumbnail_url": v["thumbnail"],
            "published_at": v["published_at"],
            "duration_seconds": v["duration_seconds"],
            "view_count": v["view_count"],
            "like_count": v["like_count"],
            "tags": v.get("tags", []),
            "last_synced_at": datetime.utcnow().isoformat(),
        }, on_conflict="video_id").execute()
```

This is the first table in the schema that's explicitly designed around a future pipeline rather than manual admin edits — a template for whatever the next automated ingestion job turns out to be (GitHub repo stats, Devpost hackathon results, etc.), all following the same shape: one cache table, `upsert` on a natural external ID, a `last_synced_at` column.

---

## 8. Migrations 010–012: Existing Tables, Extended (Not Replaced)

These three keep their v1.0 shape from `DATABASE_REFERENCE.md` almost entirely — only additive columns, no breaking changes, no renames. Existing rows and existing FastAPI code keep working unmodified.

### 8.1 `messages` — one additive column

```sql
-- Migration 010
alter table public.messages
  add column if not exists replied_at timestamptz,
  add column if not exists source_page text;  -- e.g. "/contact" vs a future inline "quick message" widget

comment on column public.messages.source_page is 'Which page the contact form was submitted from, useful once there is more than one entry point';
```

### 8.2 `events` — add session correlation for future funnel analysis

```sql
-- Migration 011
alter table public.events
  add column if not exists session_id text,      -- client-generated UUID, no PII
  add column if not exists referrer text;

create index if not exists events_session_id_idx on public.events(session_id);
```

### 8.3 `admin_users` — promote from "v2 draft" to real, since an admin panel is now a near-term need with this schema

```sql
-- Migration 012
create table if not exists public.admin_users (
    id          uuid primary key default auth.uid(),
    email       text not null unique,
    role        text not null check (role in ('owner', 'editor')) default 'editor',
    created_at  timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "owner_can_read_admin_users"
  on public.admin_users for select
  using (auth.uid() = id);

create policy "service_role_full_access_admin_users"
  on public.admin_users for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

With `admin_users` real, every write-policy above (`content_items`, `tech_radar_entries`, `external_links`) can later be loosened from "service-role only" to "service-role OR authenticated admin_users row" the day you build a UI instead of editing via SQL/agent — a one-line `using` clause change per table, nothing structural.

---

## 9. `content_embeddings` (v2 RAG) — Unchanged, Now With a Real Source Table

`DATABASE_REFERENCE.md` §2 Migration 003 already defines this table correctly (chunked text + pgvector embedding). The only change worth noting now that `content_items` exists: **the ingestion source for embeddings is `content_items.content_body`**, not raw MDX files.

```python
# When (re)building embeddings, source directly from the DB:
items = supabase_client.table("content_items").select("id, lane, slug, content_body").eq("status", "published").execute()
for item in items.data:
    chunks = chunk_markdown_content(item["content_body"], chunk_size=500)
    for i, chunk in enumerate(chunks):
        supabase_client.table("content_embeddings").insert({
            "content_slug": item["slug"],
            "content_lane": item["lane"],
            "chunk_text": chunk,
            "chunk_index": i,
            "embedding": embed(chunk),
        }).execute()
```

No schema change needed here — this section exists purely so the agent doesn't re-derive embeddings from a file path that no longer exists.

---

## 10. Recommended New API Endpoints (for `API_CONTRACTS.md`)

All read-only, all public, all mirror the existing contract style (Pydantic response models, consistent error shape).

| Endpoint | Method | Purpose | Backs |
|---|---|---|---|
| `/api/v1/content?lane=projects` | GET | List published content for a lane | `lib/content.ts: getAllContentByType()` |
| `/api/v1/content/{lane}/{slug}` | GET | Single content item + tags + media | `lib/content.ts: getContentBySlug()` |
| `/api/v1/radar` | GET | List Tech Radar entries, optional `?status=` filter | `lib/radar.ts: getAllRadarEntries()` |
| `/api/v1/links?category=social` | GET | List active external links | `Hero.tsx`, footer |
| `/api/v1/youtube?featured=true` | GET | Cached YouTube videos | `RadarTeaser`-style homepage widget |
| `/api/v1/profile` | GET | Singleton profile row | `Hero.tsx`, `BioStrip.tsx`, `/about` |
| `/api/v1/search?q=` | GET | Full-text search across `content_items.search_vector` | Future site-wide search |

Each should follow the exact FastAPI router pattern already established in `BACKEND_ARCHITECTURE.md` §9–10 (`APIRouter`, Pydantic response model, service function in `app/services/`) — just reads instead of writes, so no rate limiting or honeypot logic needed, only response caching (e.g. `Cache-Control` headers, since this data changes infrequently).

---

## 11. Full Table Index (Quick Reference)

| Table | Written by | Read by | Row count expectation |
|---|---|---|---|
| `profile` | You (agent/SQL), later admin UI | Home, About | Always exactly 1 |
| `external_links` | You, later admin UI | Hero, Footer, About | Tens |
| `tags` | You, later admin UI | Content filters | Tens–low hundreds |
| `content_items` | You, later admin UI | Projects/Learn/Stories/Notes pages | Dozens now, hundreds eventually |
| `content_series` | You | Grouped article navigation | Single digits |
| `content_tags` | You | Content filters | Rows ≈ content_items × avg tags |
| `content_media` | You | Case study galleries | A few per content item |
| `tech_radar_entries` | You, frequently | `/radar` | Grows continuously, expect hundreds within a year |
| `youtube_videos` | Automated pipeline only | Homepage teaser, future `/videos` page | Grows with channel uploads |
| `messages` | Public (contact form) | You (admin) | Grows with traffic |
| `events` | Public (silent analytics beacon) | You (admin/analytics) | Grows continuously, needs periodic cleanup (see `DATABASE_REFERENCE.md` §5) |
| `content_embeddings` | Ingestion job, sourced from `content_items` | v2 `/ask` RAG endpoint | Rows ≈ content_items × avg chunks |
| `admin_users` | You (manually via Supabase Auth) | Auth checks | Single digits |

---

## 12. Migration Order (Copy-Paste Checklist)

Run in this exact order — each depends on the previous existing:

```bash
supabase migration new profile
supabase migration new external_links
supabase migration new tags
supabase migration new content_series          # before content_items (FK dependency)
supabase migration new content_items
supabase migration new content_tags
supabase migration new content_media
supabase migration new tech_radar
supabase migration new youtube_videos
supabase migration new extend_messages
supabase migration new extend_events
supabase migration new admin_users

supabase db push
```

Then seed `profile` (1 row) and `external_links` (your current social set) before wiring the frontend, so the first API calls don't return empty states.

---

## 13. What NOT to Change

Per the existing docs' own "one source of truth per concern" principle, don't:
- Rename `messages`/`events` columns — `API_CONTRACTS.md`'s `ContactRequest`/`EventRequest` Pydantic models map to them directly today.
- Put YouTube video *content* (transcripts, uploaded files) in Postgres — only metadata/cache belongs here; the video itself lives on YouTube.
- Turn `external_links.category` or `tech_radar_entries.category` into Postgres enums — `check` constraints and free text were chosen specifically so adding a value is a data change, not a schema change.
- Skip RLS on any new table "because it's just read-only anyway" — every table above has RLS enabled from its first migration, matching `DATABASE_REFERENCE.md`'s existing standard.

# DATABASE ARCHITECTURE REFERENCE (Supabase/Postgres)
**Version:** 1.0 | **Last Updated:** 2026-06-21  
**Purpose:** Live database reference — copy SQL, run migrations, manage schema

---

## 1. Database Setup Checklist

- [ ] Create Supabase project (production)
- [ ] Create Supabase project (staging)
- [ ] Initialize Supabase CLI: `supabase init`
- [ ] Connect local Supabase: `supabase start`
- [ ] Copy schema files from this document to `supabase/migrations/`
- [ ] Apply migrations: `supabase db push`
- [ ] Enable pgvector extension
- [ ] Configure RLS policies

---

## 2. V1 Schema (Full SQL)

Run these migrations in order via Supabase dashboard or CLI.

### Migration 001: Initial Schema

**File: `supabase/migrations/20260101000001_initial_schema.sql`**

```sql
-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Contact form messages table
create table public.messages (
    id          uuid primary key default uuid_generate_v4(),
    name        text not null check (char_length(name) >= 1 and char_length(name) <= 100),
    email       text not null,
    message     text not null check (char_length(message) >= 10 and char_length(message) <= 3000),
    ip_hash     text,                           -- Hash of submitter's IP (privacy-friendly)
    is_read     boolean not null default false,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- Indexes for common queries
create index messages_created_at_idx on public.messages(created_at desc);
create index messages_is_read_idx on public.messages(is_read);
create index messages_email_idx on public.messages(email);

-- Comment for clarity
comment on table public.messages is 'Contact form submissions from portfolio visitors';
comment on column public.messages.ip_hash is 'SHA256 hash of submitter IP, used for rate limiting abuse tracking (GDPR-friendly)';

-- Optional analytics events table (v1.5+)
create table public.events (
    id          uuid primary key default uuid_generate_v4(),
    event_name  text not null check (char_length(event_name) >= 1 and char_length(event_name) <= 100),
    page        text not null,                   -- URL or page identifier
    metadata    jsonb default '{}',              -- Event-specific data (arbitrary JSON)
    created_at  timestamptz not null default now()
);

-- Indexes for events
create index events_event_name_idx on public.events(event_name);
create index events_created_at_idx on public.events(created_at desc);

comment on table public.events is 'Custom analytics events (v1.5+, optional)';
```

### Migration 002: Row-Level Security (RLS)

**File: `supabase/migrations/20260101000002_rls_policies.sql`**

> **Note:** With RLS enabled and only a service_role permissive policy,
> all other roles (anon, authenticated) are denied by default.
> No explicit deny policies are needed — adding `using(false)` for `FOR ALL`
> would actually block service_role too, since all permissive policies
> are OR'd together but a `using(false)` FOR ALL policy still evaluates.

```sql
-- Enable RLS on all tables
alter table public.messages enable row level security;
alter table public.events enable row level security;

-- MESSAGES: Only service-role can read/write (backend API is the sole gateway).
-- With RLS enabled, anon/authenticated are denied by default (no matching policy).
create policy "service_role_full_access_messages"
  on public.messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- EVENTS: Only service-role can read/write.
create policy "service_role_full_access_events"
  on public.events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

### Migration 003: V2 Embeddings Schema (Run only when implementing RAG)

**File: `supabase/migrations/20260201000001_v2_embeddings.sql`**

> **Do NOT run this in v1.** IVFFlat indexes require a minimum number of rows
> to build meaningful cluster centroids. Create this migration only when
> you're ready to populate embeddings.

```sql
-- Enable pgvector extension (v2 only)
create extension if not exists vector;

-- V2: embeddings for "ask my portfolio" RAG feature
create table public.content_embeddings (
    id              uuid primary key default uuid_generate_v4(),
    content_slug    text not null,               -- Matches MDX slug: "kruskals-mst", etc.
    content_lane    text not null check (content_lane in ('projects', 'learn', 'stories', 'notes')),
    chunk_text      text not null,               -- Text chunk being embedded
    chunk_index     integer not null,            -- Chunk sequence within the article
    embedding       vector(1536),                -- OpenAI embedding vector (1536-dim)
    embedding_model text default 'text-embedding-3-small',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- Slug + lane lookup index
create index content_embeddings_slug_lane_idx on public.content_embeddings(content_slug, content_lane);

-- NOTE: Create the IVFFlat index AFTER populating data (needs rows for clustering).
-- Run this manually after initial embedding ingestion:
-- CREATE INDEX content_embeddings_embedding_idx
--   ON public.content_embeddings
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);

comment on table public.content_embeddings is 'V2: Vector embeddings of portfolio content for semantic search / RAG';

-- Enable RLS
alter table public.content_embeddings enable row level security;

-- Public read (needed for RAG queries from frontend), only service-role writes
create policy "public_read_embeddings"
  on public.content_embeddings
  for select
  using (true);

create policy "service_role_write_embeddings"
  on public.content_embeddings
  for insert
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service_role_update_embeddings"
  on public.content_embeddings
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service_role_delete_embeddings"
  on public.content_embeddings
  for delete
  using (auth.role() = 'service_role');
```

---

## 3. Data Types & Constraints Reference

| Table | Column | Type | Constraints | Notes |
|---|---|---|---|---|
| messages | id | uuid | PK | Auto-generated |
| messages | name | text | NOT NULL, 1-100 chars | Visitor name |
| messages | email | text | NOT NULL | Validated by Pydantic on backend |
| messages | message | text | NOT NULL, 10-3000 chars | Contact message |
| messages | ip_hash | text | NULLABLE | SHA256 hash of visitor IP |
| messages | is_read | bool | NOT NULL, default false | Admin flag |
| messages | created_at | timestamptz | NOT NULL, default now() | Auto-timestamp |
| messages | updated_at | timestamptz | NOT NULL, default now() | Updated on message change |
| events | id | uuid | PK | Auto-generated |
| events | event_name | text | NOT NULL, 1-100 chars | "resume_download", "video_played", etc. |
| events | page | text | NOT NULL | "/projects", "/learn/kruskals-mst", etc. |
| events | metadata | jsonb | default {} | {"duration": 30, "algorithm": "kruskal"} |
| events | created_at | timestamptz | NOT NULL, default now() | Auto-timestamp |

---

## 4. Migrations via Supabase CLI

### Local Development Workflow

```bash
# 1. Initialize Supabase (one-time setup)
cd portfolio-frontend
supabase init

# 2. Start local Postgres + Supabase services
supabase start

# 3. Create a new migration from the SQL above
supabase migration new create_messages_table
# Edit supabase/migrations/[timestamp]_create_messages_table.sql with the SQL above

# 4. Apply migrations to local DB
supabase db push

# 5. View schema in local Supabase Studio
# Browser: http://localhost:54323 (opened by `supabase start`)

# 6. Test in local environment before pushing to staging/prod
# Run your FastAPI service locally, test the contact form

# 7. When ready for staging, push migrations to staging project
supabase link --project-ref [staging-project-id]
supabase db push

# 8. When ready for production, push to production project
supabase link --project-ref [production-project-id]
supabase db push
```

### Manual SQL Execution (if not using Supabase CLI)

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Paste the SQL from Migration 001 above
4. Run
5. Repeat for Migration 002

---

## 5. Backups & Maintenance

### Backup Strategy

```sql
-- Supabase automatically backs up daily, retained 7 days (free tier)
-- To manually export data:

-- Export messages as CSV
SELECT * FROM public.messages ORDER BY created_at DESC;
-- Click "Download as CSV" in Supabase dashboard

-- Export events as JSON
SELECT json_agg(events) FROM public.events;
```

### Cleanup Jobs (Optional, v1.5+)

Run periodically to avoid data accumulation:

```sql
-- Delete read messages older than 90 days
DELETE FROM public.messages
WHERE is_read = true AND created_at < now() - interval '90 days';

-- Delete old analytics events (keep last 6 months for trending)
DELETE FROM public.events
WHERE created_at < now() - interval '6 months';
```

---

## 6. Querying from FastAPI (Patterns)

### Insert Contact Message (app/services/supabase_service.py)

```python
response = supabase_client.table("messages").insert({
    "name": "Alice",
    "email": "alice@example.com",
    "message": "Great portfolio!",
    "ip_hash": "a1b2c3d4e5f6g7h8",  # Pre-hashed on FastAPI side
    "is_read": False,
}).execute()

message_id = response.data[0]["id"]  # UUID of inserted row
```

### Count Unread Messages

```python
response = supabase_client.table("messages")\
    .select("id", count="exact")\
    .eq("is_read", False)\
    .execute()

unread_count = response.count
```

### Mark Message as Read

```python
supabase_client.table("messages")\
    .update({"is_read": True})\
    .eq("id", "uuid-here")\
    .execute()
```

### Get All Messages (with Pagination)

```python
response = supabase_client.table("messages")\
    .select("*")\
    .order("created_at", desc=True)\
    .range(0, 9)\
    .execute()  # Limit to 10 rows

messages = response.data
```

### Insert Analytics Event

```python
supabase_client.table("events").insert({
    "event_name": "resume_download",
    "page": "/about",
    "metadata": {"file": "resume.pdf", "timestamp": datetime.now().isoformat()},
}).execute()
```

---

## 7. V2 Embeddings Schema (Prepare for Future)

**NOT implemented in v1, just reserved. When ready for v2 RAG feature:**

### Insert Embeddings (Batch)

```python
import openai

# Chunk your MDX content into ~500-token pieces
chunks = chunk_markdown_content(mdx_text, chunk_size=500)

# Generate embeddings via OpenAI
embeddings = openai.Embedding.create(
    model="text-embedding-3-small",
    input=[chunk for chunk in chunks],
)

# Store in Supabase
for i, chunk in enumerate(chunks):
    supabase_client.table("content_embeddings").insert({
        "content_slug": "kruskals-mst",
        "content_lane": "learn",
        "chunk_text": chunk,
        "chunk_index": i,
        "embedding": embeddings.data[i]["embedding"],
        "embedding_model": "text-embedding-3-small",
    }).execute()
```

### Query by Semantic Similarity (RAG)

```python
import openai

query = "What's the difference between Kruskal's and Prim's?"
query_embedding = openai.Embedding.create(
    model="text-embedding-3-small",
    input=[query],
).data[0]["embedding"]

# Cosine similarity search (pgvector)
response = supabase_client.rpc("search_embeddings", {
    "query_embedding": query_embedding,
    "limit": 5,
}).execute()

results = response.data  # Top 5 most similar chunks
```

---

## 8. Admin Panel Future (v2) — Draft Schema

**NOT v1, but sketched for reference:**

```sql
-- Admin users (authenticated via Supabase Auth)
create table public.admin_users (
    id uuid primary key default auth.uid(),
    email text not null unique,
    role text check (role in ('owner', 'editor')) default 'editor',
    created_at timestamptz default now()
);

-- Projects (to allow DB-driven project management instead of MDX)
create table public.projects (
    id uuid primary key default uuid_generate_v4(),
    slug text not null unique,
    title text not null,
    summary text,
    content text,              -- Could be markdown
    tags text[],
    live_url text,
    repo_url text,
    cover_image_url text,
    featured boolean default false,
    published_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    created_by uuid references public.admin_users(id)
);
```

---

## 9. Local Development (Supabase CLI)

### Start Fresh Local Instance

```bash
# Clean start
supabase stop
supabase start

# View logs
supabase status

# Access local Postgres directly (for SQL queries)
supabase db query

# Example query
supabase db query "SELECT COUNT(*) FROM public.messages;"
```

### Reset Local DB (nuke everything)

```bash
supabase db reset
# This re-applies all migrations from supabase/migrations/
```

---

## 10. Monitoring & Troubleshooting

### Check RLS Policies

```sql
-- View all RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Check Extension Status

```sql
-- Verify pgvector is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- List enabled extensions
SELECT extname FROM pg_extension;
```

### Analyze Table Size

```sql
-- See which tables are taking up space
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

---

## Quick Reference: When Building

| Task | Pattern |
|---|---|
| Add a new field to `messages` | ALTER TABLE public.messages ADD COLUMN [name] [type]; |
| Create an index | CREATE INDEX [name]_idx ON public.[table]([column]); |
| Delete old data | DELETE FROM public.[table] WHERE [condition]; |
| Check data volume | SELECT COUNT(*) FROM public.[table]; |
| Fix RLS issue | Review pg_policies, ensure auth.role() check matches your intent |
| Query embeddings | Use pgvector operations: `<->` (cosine), `<#>` (inner product), `@>` (contains) |

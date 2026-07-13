-- Migration 003: V2 Embeddings Schema
-- Purpose: Setup vector embeddings table and enabling pgvector for semantic search / RAG
-- NOTE: Run only when ready to populate embeddings (IVFFlat needs rows for clustering).

-- Enable pgvector extension
create extension if not exists vector;

-- V2 content embeddings table
create table public.content_embeddings (
    id              uuid primary key default uuid_generate_v4(),
    content_slug    text not null,               -- Matches content_items.slug: "kruskals-mst", etc.
    content_lane    text not null check (content_lane in ('projects', 'learn', 'stories', 'notes')),
    chunk_text      text not null,               -- Text chunk being embedded
    chunk_index     integer not null,            -- Chunk sequence within the article
    embedding       vector(1536),                -- OpenAI text-embedding-3-small (1536-dim)
    embedding_model text default 'text-embedding-3-small',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- Slug + lane lookup index (used by RAG to fetch chunks for a specific article)
create index content_embeddings_slug_lane_idx on public.content_embeddings(content_slug, content_lane);

-- NOTE: Create the IVFFlat cosine similarity index AFTER initial embedding ingestion
-- (IVFFlat requires rows to build meaningful cluster centroids; running it on an empty
--  table produces a degenerate index). Run this manually once you have >1000 rows:
--
-- CREATE INDEX content_embeddings_embedding_idx
--   ON public.content_embeddings
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);

comment on table public.content_embeddings is 'V2: Vector embeddings of portfolio content for semantic search / RAG. Source is content_items.content_body, NOT the old MDX files.';
comment on column public.content_embeddings.content_slug is 'Matches content_items.slug — the natural join key for fetching full article after RAG retrieval';
comment on column public.content_embeddings.embedding is 'OpenAI text-embedding-3-small 1536-dim vector; swap embedding_model column if you change providers';

-- Enable RLS
alter table public.content_embeddings enable row level security;

-- Public SELECT: needed for RAG queries that may be called from the frontend
create policy "public_read_embeddings"
  on public.content_embeddings
  for select
  using (true);

-- FIX (Bug 1): INSERT policies use WITH CHECK only — USING clause is invalid for INSERT
-- and will cause Supabase/Postgres to reject the entire migration transaction.
create policy "service_role_write_embeddings"
  on public.content_embeddings
  for insert
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

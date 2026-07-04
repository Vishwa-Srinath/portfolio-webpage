-- Migration 001: Initial Schema
-- File: supabase/migrations/20260101000001_initial_schema.sql
-- Purpose: Create contact form messages and analytics events tables

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

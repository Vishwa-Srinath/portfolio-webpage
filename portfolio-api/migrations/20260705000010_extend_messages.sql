-- Migration 010: extend messages table
-- Purpose: Add replied_at and source_page to messages for better management

alter table public.messages
  add column if not exists replied_at timestamptz,
  add column if not exists source_page text;

comment on column public.messages.source_page is 'Which page the contact form was submitted from';

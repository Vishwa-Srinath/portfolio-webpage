-- Migration 004: profile table + set_updated_at trigger function
-- Purpose: Store singleton profile data for the site owner.
--          Also defines the reusable set_updated_at() trigger function that ALL
--          subsequent migrations rely on (content_items, tech_radar_entries, external_links).
--          It MUST remain in this migration so it exists before any later table needs it.

-- ─────────────────────────────────────────────────────────────────────────────
-- SHARED TRIGGER FUNCTION (defined here once, used by profile, external_links,
-- content_items, and tech_radar_entries)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

comment on function public.set_updated_at() is
  'Generic trigger function: sets updated_at = now() on every row UPDATE. '
  'Used by profile, external_links, content_items, and tech_radar_entries.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILE TABLE (singleton — exactly one row representing the site owner)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.profile (
    id               uuid primary key default uuid_generate_v4(),
    full_name        text not null,
    role_line        text not null,               -- e.g. "CS&E Undergraduate at University of Moratuwa"
    bio_short        text not null,               -- Used on home page hero/bio strip (~2 sentences)
    bio_long         text not null,               -- Used on /about page (multi-paragraph markdown OK)
    headshot_url     text,                         -- Supabase Storage public URL or external CDN URL
    resume_url       text,                         -- Direct link to resume PDF (Storage or Drive)
    location         text,                         -- e.g. "Colombo, Sri Lanka"
    email_public     text,                         -- Displayed on /contact ("Prefer email? Reach me at ...")
    education        jsonb not null default '[]'::jsonb,
        -- Array: [{institution, degree, batch, start_date, end_date, coursework: []}]
        -- Using JSONB (not a separate table) because shape changes more often than row count.
        -- Promote to a real table if you ever need to query "everyone at University X".
    skills           jsonb not null default '{}'::jsonb,
        -- Object: {"core": [...], "comfortable": [...], "exploring": [...]}
        -- Buckets can be renamed or added without a migration.
    timeline         jsonb not null default '[]'::jsonb,
        -- Array: [{year, title, description}] — for the /about timeline strip
    updated_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SINGLETON ENFORCEMENT
-- Postgres GENERATED ALWAYS AS ... STORED only works for expressions that
-- reference OTHER columns — constant expressions like (true) are rejected.
-- The correct portable pattern: a plain boolean DEFAULT true NOT NULL column
-- with a UNIQUE index. Since every row gets true, the unique index allows
-- exactly one row. The column is never updated (no trigger needed for it).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profile
  add column _singleton boolean not null default true;

create unique index profile_singleton_idx on public.profile (_singleton);

-- ─────────────────────────────────────────────────────────────────────────────
-- COMMENTS
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.profile is
  'Singleton row: the site owner''s bio/education/skills/timeline data. '
  'Replaces hardcoded content in Hero.tsx and BioStrip.tsx. '
  'The _singleton generated column + unique index enforces exactly one row at the DB level.';

comment on column public.profile.education is
  'JSONB array of education entries, newest first. Shape: '
  '[{institution, degree, batch, start_date, end_date, coursework: []}]. '
  'Free-form for expandability (bootcamps, certs, MOOCs fit here too).';

comment on column public.profile.skills is
  'JSONB object with proficiency buckets. Shape: '
  '{"core": [...], "comfortable": [...], "exploring": [...]}. '
  'Add a new bucket (e.g. "hardware") by inserting a new key — no migration needed.';

comment on column public.profile.timeline is
  'JSONB array of timeline milestones for the /about page. Shape: '
  '[{year, title, description}]. Ordered newest-first by convention.';

comment on column public.profile._singleton is
  'Always-true boolean column used exclusively to enforce the singleton '
  'constraint via a unique index. Never set to false — never read by application code.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profile enable row level security;

-- Anyone (anonymous visitors) can read the profile — it's public bio data
create policy "public_read_profile"
  on public.profile for select
  using (true);

-- Only the backend service-role key can write (insert/update/delete)
create policy "service_role_write_profile"
  on public.profile for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- FIX (Bug 6): The profile table had updated_at but no trigger to keep it fresh.
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists profile_set_updated_at on public.profile;
create trigger profile_set_updated_at
  before update on public.profile
  for each row execute function public.set_updated_at();

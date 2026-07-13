-- Migration 012: admin_users table
-- Purpose: Admin users linked to Supabase Auth for future admin panel authentication.
--          Rows are created by the site owner manually via Supabase Auth + SQL.
--
-- FIX (Bug 5): The original used `DEFAULT auth.uid()` as the primary key default.
-- auth.uid() returns the JWT caller's UID — when called via service-role key
-- (as the migration runner does), auth.uid() is NULL, causing a NOT NULL violation.
--
-- Correct pattern: use uuid_generate_v4() for the PK and add a FK to auth.users(id)
-- for the Supabase Auth link. This is how Supabase's own documentation recommends
-- linking profile tables to auth.users.

create table if not exists public.admin_users (
    id          uuid primary key default uuid_generate_v4(),
    auth_id     uuid unique references auth.users(id) on delete cascade,
        -- FK to Supabase Auth. Set this after creating the user in Supabase Auth.
        -- NULL is allowed initially so the row can be pre-created before the auth signup.
    email       text not null unique,
    role        text not null check (role in ('owner', 'editor')) default 'editor',
        -- 'owner'  = full access, can manage other admin_users
        -- 'editor' = can create/edit content via the future admin UI
    created_at  timestamptz not null default now()
);

create index if not exists admin_users_auth_id_idx on public.admin_users(auth_id);

comment on table public.admin_users is
  'Admin users for the future admin panel, linked to Supabase Auth via auth_id FK. '
  'Create the Supabase Auth user first, then INSERT here with the returned auth UUID.';

comment on column public.admin_users.auth_id is
  'FK to auth.users(id). Set after creating the user in Supabase Auth Dashboard or via the Auth API. '
  'ON DELETE CASCADE: deleting the auth user also removes this admin_users row.';

comment on column public.admin_users.role is
  'owner: full access including admin_users management. '
  'editor: content CRUD via admin UI (once built). '
  'Future: add more granular roles (e.g. "radar_editor") by adding values to the CHECK constraint.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.admin_users enable row level security;

-- Authenticated admin users can read their own row
create policy "admin_can_read_own_row"
  on public.admin_users for select
  using (auth.uid() = auth_id);

-- Owner role can read all admin_users rows (for the user management screen)
-- Future: uncomment when admin UI exists:
-- create policy "owner_can_read_all_admin_users"
--   on public.admin_users for select
--   using (
--     exists (
--       select 1 from public.admin_users
--       where auth_id = auth.uid() and role = 'owner'
--     )
--   );

-- Service-role has full access for manual provisioning
create policy "service_role_full_access_admin_users"
  on public.admin_users for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

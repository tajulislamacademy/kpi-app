-- ============================================================================
-- Migration 0024 — Subjects (per class+section) + capability RLS
-- ----------------------------------------------------------------------------
-- A managed catalogue of subjects, each tied to a class + section (so streamed
-- 9-10 sections can differ, and lower classes just add a subject per section).
-- Feeds the point-entry subject picker and teacher subject-assignment picker.
-- Reads are broad (any authenticated user — the pickers need them); writes use
-- the new subjects.* capabilities (or full admins). Hard delete: subjects are
-- config, and kpi_entries snapshot the subject string, so removing a subject
-- never affects historical points.
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  name_bn    text not null,
  name_en    text,
  class      text not null,
  section    text not null,
  created_at timestamptz not null default now()
);

-- no duplicate subject for the same class+section
create unique index if not exists subjects_no_dup on public.subjects (class, section, name_bn);

alter table public.subjects enable row level security;

drop policy if exists subjects_auth_read on public.subjects;
create policy subjects_auth_read on public.subjects
  for select using (auth.uid() is not null);

drop policy if exists subjects_admin_insert on public.subjects;
create policy subjects_admin_insert on public.subjects
  for insert with check (public.my_role() = 'admin' or public.has_cap('subjects.create'));

drop policy if exists subjects_admin_update on public.subjects;
create policy subjects_admin_update on public.subjects
  for update using (public.my_role() = 'admin' or public.has_cap('subjects.edit'))
  with check (public.my_role() = 'admin' or public.has_cap('subjects.edit'));

drop policy if exists subjects_admin_delete on public.subjects;
create policy subjects_admin_delete on public.subjects
  for delete using (public.my_role() = 'admin' or public.has_cap('subjects.force_delete'));

-- ----------------------------------------------------------------------------
-- TEARDOWN: drop table if exists public.subjects cascade;
-- ============================================================================

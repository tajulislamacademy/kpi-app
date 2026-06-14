-- ============================================================================
-- Migration 0025 — Sections per class (managed) + RLS
-- ----------------------------------------------------------------------------
-- Each class can have its own sections (one class may have just "A", another
-- "A,B,C" with stream labels). Replaces the hard-coded A-D list. Every
-- class/section dropdown (Students, Teachers, PointEntry, Subjects) reads from
-- here, filtered by class. `name` is the stored value (A/B/...); `label` is an
-- optional display note (e.g. "বিজ্ঞান"). Reads broad; writes reuse the
-- subjects.* capabilities (class config is managed together on the Subjects page).
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

create table if not exists public.sections (
  id         uuid primary key default gen_random_uuid(),
  class      text not null,
  name       text not null,
  label      text,
  created_at timestamptz not null default now()
);

create unique index if not exists sections_no_dup on public.sections (class, name);

alter table public.sections enable row level security;

drop policy if exists sections_auth_read on public.sections;
create policy sections_auth_read on public.sections
  for select using (auth.uid() is not null);

drop policy if exists sections_admin_insert on public.sections;
create policy sections_admin_insert on public.sections
  for insert with check (public.my_role() = 'admin' or public.has_cap('subjects.create'));

drop policy if exists sections_admin_update on public.sections;
create policy sections_admin_update on public.sections
  for update using (public.my_role() = 'admin' or public.has_cap('subjects.edit'))
  with check (public.my_role() = 'admin' or public.has_cap('subjects.edit'));

drop policy if exists sections_admin_delete on public.sections;
create policy sections_admin_delete on public.sections
  for delete using (public.my_role() = 'admin' or public.has_cap('subjects.force_delete'));

-- ----------------------------------------------------------------------------
-- TEARDOWN: drop table if exists public.sections cascade;
-- ============================================================================

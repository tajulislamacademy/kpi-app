-- ============================================================================
-- Migration 0012 — Limited-admin permissions + soft-delete columns (Phase 0)
-- ----------------------------------------------------------------------------
-- Adds the columns the limited-admin feature needs. NO RLS changes here
-- (enforcement is UI-first; DB/RLS per-capability comes in a later migration).
-- Requires 0011 (is_admin) — a promoted admin gets full DB access via 0011, and
-- the UI restricts which areas they see based on `permissions`.
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

-- Safety: ensure is_admin exists even if 0011 wasn't applied.
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Granular capability keys for a promoted (limited) admin, e.g.
-- {'students.view','students.create','point_entry','reports.view'}.
-- Empty for non-admins and for root / role='admin' (they are "all" by rule).
alter table public.profiles add column if not exists permissions text[] not null default '{}';

-- Soft-delete: null = active, timestamp = in Trash (recoverable).
alter table public.students  add column if not exists deleted_at timestamptz;
alter table public.teachers  add column if not exists deleted_at timestamptz;
alter table public.parents   add column if not exists deleted_at timestamptz;
alter table public.questions add column if not exists deleted_at timestamptz;

-- ============================================================================
-- TEARDOWN (uncomment to revert)
-- ----------------------------------------------------------------------------
-- alter table public.profiles  drop column if exists permissions;
-- alter table public.students  drop column if exists deleted_at;
-- alter table public.teachers  drop column if exists deleted_at;
-- alter table public.parents   drop column if exists deleted_at;
-- alter table public.questions drop column if exists deleted_at;
-- ============================================================================

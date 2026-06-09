-- ============================================================================
-- Migration 0015 — Make teacher_kpi / parent_kpi caps real at the DB
-- ----------------------------------------------------------------------------
-- The kpi_entries RLS only knew about `point_entry` (and role='admin'). So the
-- teacher_kpi / parent_kpi capabilities did nothing at the database: a promoted
-- limited admin holding only teacher_kpi could neither enter nor read teacher-
-- target KPI (the TeacherKPI page and the new Details page both came up empty).
--
-- This grants full access to the matching target rows by capability:
--   • teacher_kpi → kpi_entries WHERE target_type = 'teacher'
--   • parent_kpi  → kpi_entries WHERE target_type = 'parent'
-- (has_cap already returns true for root / role='admin' / is_admin-with-cap, so
-- super admins stay fully covered.) `for all` = read + write, fixing both the
-- entry pages and the Details view in one shot.
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

drop policy if exists entries_cap_teacher on public.kpi_entries;
create policy entries_cap_teacher on public.kpi_entries
  for all
  using      (target_type = 'teacher' and public.has_cap('teacher_kpi'))
  with check (target_type = 'teacher' and public.has_cap('teacher_kpi'));

drop policy if exists entries_cap_parent on public.kpi_entries;
create policy entries_cap_parent on public.kpi_entries
  for all
  using      (target_type = 'parent' and public.has_cap('parent_kpi'))
  with check (target_type = 'parent' and public.has_cap('parent_kpi'));

-- ----------------------------------------------------------------------------
-- TEARDOWN:
--   drop policy if exists entries_cap_teacher on public.kpi_entries;
--   drop policy if exists entries_cap_parent  on public.kpi_entries;
-- ============================================================================

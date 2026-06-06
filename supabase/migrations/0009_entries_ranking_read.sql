-- ============================================================================
-- Migration 0009 — let any authenticated user read student entries (rankings)
-- Student & parent dashboards rank a student against the whole cohort, which
-- needs every student's entries. Rankings (names + totals) are already public
-- in-app, so exposing student entry rows to logged-in users is consistent.
-- Replaces the need for the narrower entries_parent_read for students.
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

drop policy if exists entries_auth_read_student on public.kpi_entries;
create policy entries_auth_read_student on public.kpi_entries
  for select using (auth.uid() is not null and target_type = 'student');

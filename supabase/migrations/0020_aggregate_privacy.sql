-- ============================================================================
-- Migration 0020 — Aggregate-only privacy for student KPI (privacy option B)
-- ----------------------------------------------------------------------------
-- Before: entries_auth_read_student (0009) let ANY authenticated user read EVERY
-- student's raw per-question scores. For a minors' data app that over-shares.
--
-- After:
--   • A definer VIEW student_kpi_month_totals exposes only per-student monthly
--     SUMS (no question text, no per-question rows) — enough to render rankings
--     and dashboards for everyone, nothing more. The view runs with definer
--     rights (security_invoker = false) so it can aggregate across all rows while
--     the base-table RLS below stays restrictive.
--   • The broad raw-read policy is dropped. Raw kpi_entries rows are now readable
--     only by: admin (all), the target themselves (entries_owner_read), a parent
--     of the target child (entries_parent_read, 0008), and a teacher for THEIR
--     OWN students (new policy via teacher_can_target_student, migration 0017).
--
-- Apply AFTER 0017. Idempotent. Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

-- Per-student monthly totals (aggregate only — no per-question detail).
drop view if exists public.student_kpi_month_totals;
create view public.student_kpi_month_totals
  with (security_invoker = false) as
  select target_id as student_id, year, month, sum(score)::int as points
  from public.kpi_entries
  where target_type = 'student'
  group by target_id, year, month;
grant select on public.student_kpi_month_totals to anon, authenticated;

-- Remove the broad raw-row read.
drop policy if exists entries_auth_read_student on public.kpi_entries;

-- Teachers may still read the RAW entries of their own students (needed for the
-- point-entry frequency checks, Reports, and the Details view).
drop policy if exists entries_teacher_read_students on public.kpi_entries;
create policy entries_teacher_read_students on public.kpi_entries
  for select using (
    public.my_role() = 'teacher'
    and target_type = 'student'
    and public.teacher_can_target_student(target_id)
  );

-- ----------------------------------------------------------------------------
-- NOTE: the student roster (names/class/section/roll) stays broadly readable
-- (0006) because rankings display names. Only the per-question behavioral scores
-- are now hidden from unrelated users.
-- TEARDOWN:
--   drop view if exists public.student_kpi_month_totals;
--   drop policy if exists entries_teacher_read_students on public.kpi_entries;
--   create policy entries_auth_read_student on public.kpi_entries
--     for select using (auth.uid() is not null and target_type = 'student');
-- ============================================================================

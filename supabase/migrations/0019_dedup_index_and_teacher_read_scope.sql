-- ============================================================================
-- Migration 0019 — Non-partial dedup index (for upsert) + scope teacher reads
-- ----------------------------------------------------------------------------
-- (a) BLOCKER B3 support: the client now upserts entries with
--     ON CONFLICT (target_id, question_id, entry_date) DO NOTHING. PostgREST
--     needs a NON-partial unique index to use as the conflict arbiter — the
--     0010 index had a `WHERE question_id IS NOT NULL` predicate, which an
--     unqualified ON CONFLICT cannot match. Recreate it without the predicate.
--     (NULL question_ids stay distinct under a unique index, so deleted-question
--      rows are unaffected — no dedup regression.)
--
-- (b) Tighten 0014: `entries_teacher_read_parents` let ANY teacher read EVERY
--     parent's KPI. Scope it to parents of the teacher's own students via
--     teacher_can_target_student() (migration 0017).
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- (Apply AFTER 0017, which defines teacher_can_target_student.)
-- ============================================================================

-- (a) swap the partial unique index for a full one
drop index if exists public.kpi_entries_no_dup;
create unique index if not exists kpi_entries_no_dup
  on public.kpi_entries (target_id, question_id, entry_date);

-- (b) re-scope teacher → parent entry reads
drop policy if exists entries_teacher_read_parents on public.kpi_entries;
create policy entries_teacher_read_parents on public.kpi_entries
  for select using (
    public.my_role() = 'teacher'
    and target_type = 'parent'
    and exists (
      select 1 from public.parents p
      where p.id = target_id
        and public.teacher_can_target_student(p.student_id)
    )
  );

-- ----------------------------------------------------------------------------
-- TEARDOWN:
--   drop index if exists public.kpi_entries_no_dup;
--   create unique index kpi_entries_no_dup on public.kpi_entries
--     (target_id, question_id, entry_date) where question_id is not null;
--   (and re-apply 0014's unscoped teacher read policy)
-- ============================================================================

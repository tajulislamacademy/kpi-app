-- ============================================================================
-- Migration 0014 — Teachers can read parent KPI entries (for the Details view)
-- ----------------------------------------------------------------------------
-- The KPI Details page lets a teacher inspect the KPI of their students' parents
-- "as detailed as an admin". Parent (target_type='parent') entries were readable
-- only by the parent (owner) + admin, so a teacher saw them empty. This adds a
-- read policy so any teacher can SELECT parent entries. (The UI already scopes
-- which parents a teacher may pick — those of their guide/class students. Their
-- own teacher KPI is already covered by the owner-read policy; student KPI by the
-- broad student-read policy in 0009.)
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

drop policy if exists entries_teacher_read_parents on public.kpi_entries;
create policy entries_teacher_read_parents on public.kpi_entries
  for select using (
    auth.uid() is not null
    and public.my_role() = 'teacher'
    and target_type = 'parent'
  );

-- ----------------------------------------------------------------------------
-- TEARDOWN: drop policy if exists entries_teacher_read_parents on public.kpi_entries;
-- ============================================================================

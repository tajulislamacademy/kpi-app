-- ============================================================================
-- Migration 0017 — Scope teacher point-entry to their own students + clamp score
-- ----------------------------------------------------------------------------
-- BLOCKER B2: entries_teacher_write/update only checked `entered_by = self AND
-- target_type='student'` — NOT that the student is actually taught/guided by the
-- teacher. So any teacher could insert or edit a point entry for ANY student,
-- with any client-supplied score / max_points. This:
--   • adds teacher_can_target_student() — true iff the student is in the
--     teacher's guide_students, their class-teacher class/section, or one of
--     their subject_assignments class/section;
--   • re-scopes the teacher insert/update policies through it;
--   • adds a DB CHECK so no writer (teacher OR admin) can store a negative score
--     or a score above max_points (defense in depth; the UI also clamps).
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

create or replace function public.teacher_can_target_student(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teachers t
    join public.students s on s.id = p_student
    where t.id = public.my_profile_id()
      and (
        p_student = any(t.guide_students)
        or (t.class_teacher->>'class' = s.class
            and (t.class_teacher->>'section') is not distinct from s.section)
        or exists (
          select 1 from jsonb_array_elements(t.subject_assignments) a
          where a->>'class' = s.class
            and (a->>'section') is not distinct from s.section
        )
      )
  )
$$;

drop policy if exists entries_teacher_write on public.kpi_entries;
create policy entries_teacher_write on public.kpi_entries
  for insert with check (
    public.my_role() = 'teacher'
    and entered_by = public.my_profile_id()
    and target_type = 'student'
    and public.teacher_can_target_student(target_id)
  );

drop policy if exists entries_teacher_update on public.kpi_entries;
create policy entries_teacher_update on public.kpi_entries
  for update
  using (
    public.my_role() = 'teacher'
    and entered_by = public.my_profile_id()
    and target_type = 'student'
    and public.teacher_can_target_student(target_id)
  )
  with check (
    public.my_role() = 'teacher'
    and entered_by = public.my_profile_id()
    and target_type = 'student'
    and public.teacher_can_target_student(target_id)
  );

-- Score sanity at the DB. NOT VALID = enforce on new/updated rows without
-- failing the migration if any legacy/dummy row is out of range.
alter table public.kpi_entries drop constraint if exists kpi_entries_score_chk;
alter table public.kpi_entries add constraint kpi_entries_score_chk
  check (score >= 0 and (max_points is null or score <= max_points)) not valid;

-- ----------------------------------------------------------------------------
-- TEARDOWN:
--   drop policy if exists entries_teacher_write  on public.kpi_entries;
--   drop policy if exists entries_teacher_update on public.kpi_entries;
--   alter table public.kpi_entries drop constraint if exists kpi_entries_score_chk;
--   drop function if exists public.teacher_can_target_student(uuid);
--   (then re-apply 0004's teacher policies for the old unscoped behavior)
-- ============================================================================

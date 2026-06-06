-- ============================================================================
-- Migration 0005 — let teachers read the student roster
-- PointEntryPage (run as a teacher) must read students/profiles to list the
-- class/subject/guide students it scores. Earlier policies only allowed admin
-- and self reads, so a teacher saw zero students. Read-only; teachers cannot
-- write these tables. Scope can be tightened to taught/guided students later.
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

drop policy if exists profiles_teacher_read on public.profiles;
drop policy if exists students_teacher_read on public.students;

create policy profiles_teacher_read on public.profiles
  for select using (public.my_role() = 'teacher');

create policy students_teacher_read on public.students
  for select using (public.my_role() = 'teacher');

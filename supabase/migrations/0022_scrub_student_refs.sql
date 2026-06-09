-- ============================================================================
-- Migration 0022 — Scrub dangling student references on force-delete
-- ----------------------------------------------------------------------------
-- Force-deleting a student deletes their profiles row, which cascades to the
-- students row and (via FKs) sets parents.student_id to NULL and removes their
-- kpi_entries. But teachers.guide_students is a uuid[] with NO foreign key, so a
-- force-deleted student's id lingered in every guide teacher's array (a dangling
-- reference). This trigger removes the id from all guide_students arrays whenever
-- a students row is deleted.
--
-- (Soft-delete is just a deleted_at UPDATE — references are intentionally kept so
-- a restore is lossless; the UI already filters trashed people out of pickers.)
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

create or replace function public.scrub_deleted_student_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.teachers
    set guide_students = array_remove(guide_students, old.id)
    where old.id = any(guide_students);
  return old;
end;
$$;

drop trigger if exists trg_scrub_student on public.students;
create trigger trg_scrub_student
  before delete on public.students
  for each row execute function public.scrub_deleted_student_refs();

-- ----------------------------------------------------------------------------
-- TEARDOWN:
--   drop trigger if exists trg_scrub_student on public.students;
--   drop function if exists public.scrub_deleted_student_refs();
-- ============================================================================

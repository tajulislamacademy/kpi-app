-- ============================================================================
-- Remove ALL dummy people + their KPI entries, KEEP questions / term_config /
-- admin accounts. Run in Supabase → SQL Editor. IRREVERSIBLE — back up first.
-- ----------------------------------------------------------------------------
-- Keeps: questions, term_config, every admin/root profile (role='admin' OR
--        is_admin OR is_root) and its login.
-- Deletes: all student/teacher/parent profiles (+ their students/teachers/parents
--          rows via FK cascade) + all kpi_entries + the deleted people's logins.
-- A promoted limited-admin whose role is teacher/student is preserved.
--
-- NOTE: trg_scrub_student (0022) fires on each student delete and UPDATEs
-- teachers.guide_students. During a BULK wipe the teacher's own profile may
-- already be gone, so that UPDATE trips teachers_id_fkey. We disable the trigger
-- for the wipe and re-enable it after.
-- ============================================================================

-- 0) BEFORE counts (optional — run on its own first to see current state)
-- select
--   (select count(*) from public.students)    as students,
--   (select count(*) from public.teachers)    as teachers,
--   (select count(*) from public.parents)     as parents,
--   (select count(*) from public.kpi_entries) as entries,
--   (select count(*) from public.questions)   as questions,
--   (select count(*) from public.profiles where role='admin' or is_admin or is_root) as admins;

-- 1) Stop the guide-scrub trigger during the bulk wipe.
alter table public.students disable trigger trg_scrub_student;

-- 2) Delete the auth logins of dummy people (admins/root untouched).
delete from auth.users u
using public.profiles p
where p.auth_id = u.id
  and p.role in ('student','teacher','parent')
  and not coalesce(p.is_admin, false)
  and not coalesce(p.is_root, false);

-- 3) Delete the dummy profiles. FK cascades remove their students/teachers/
--    parents rows AND their kpi_entries (target_id ... on delete cascade).
delete from public.profiles
where role in ('student','teacher','parent')
  and not coalesce(is_admin, false)
  and not coalesce(is_root, false);

-- 4) Belt-and-suspenders: clear any kpi_entries left behind.
delete from public.kpi_entries;

-- 5) Re-enable the trigger for normal app use.
alter table public.students enable trigger trg_scrub_student;

-- 6) AFTER counts — should be 0 people / 0 entries, questions unchanged.
select
  (select count(*) from public.students)    as students,
  (select count(*) from public.teachers)    as teachers,
  (select count(*) from public.parents)     as parents,
  (select count(*) from public.kpi_entries) as entries,
  (select count(*) from public.questions)   as questions,
  (select count(*) from public.profiles)    as profiles_left;
-- ============================================================================

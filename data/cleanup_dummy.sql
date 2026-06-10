-- ============================================================================
-- Remove ALL dummy people + their KPI entries, KEEP questions / term_config /
-- admin accounts. Run in Supabase → SQL Editor. IRREVERSIBLE — back up first.
-- ----------------------------------------------------------------------------
-- Keeps: questions, term_config, every admin/root profile (role='admin' OR
--        is_admin OR is_root) and its login.
-- Deletes: all student/teacher/parent profiles (+ their students/teachers/parents
--          rows via FK cascade) + all kpi_entries + the deleted people's logins.
-- A promoted limited-admin whose role is teacher/student is preserved (the
-- is_admin / is_root guards below).
-- ============================================================================

-- 0) BEFORE counts (optional — run on its own to see current state)
-- select
--   (select count(*) from public.students)    as students,
--   (select count(*) from public.teachers)    as teachers,
--   (select count(*) from public.parents)     as parents,
--   (select count(*) from public.kpi_entries) as entries,
--   (select count(*) from public.questions)   as questions,
--   (select count(*) from public.profiles where role='admin' or is_admin or is_root) as admins;

-- 1) Delete the auth logins of dummy people (admins/root untouched).
delete from auth.users u
using public.profiles p
where p.auth_id = u.id
  and p.role in ('student','teacher','parent')
  and not coalesce(p.is_admin, false)
  and not coalesce(p.is_root, false);

-- 2) Delete the dummy profiles. FK cascades remove their students/teachers/
--    parents rows AND their kpi_entries (target_id ... on delete cascade).
delete from public.profiles
where role in ('student','teacher','parent')
  and not coalesce(is_admin, false)
  and not coalesce(is_root, false);

-- 3) Belt-and-suspenders: clear any kpi_entries left behind.
delete from public.kpi_entries;

-- 4) AFTER counts — should be 0 people / 0 entries, questions unchanged.
select
  (select count(*) from public.students)    as students,
  (select count(*) from public.teachers)    as teachers,
  (select count(*) from public.parents)     as parents,
  (select count(*) from public.kpi_entries) as entries,
  (select count(*) from public.questions)   as questions,
  (select count(*) from public.profiles)    as profiles_left;
-- ============================================================================

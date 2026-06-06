-- ============================================================================
-- Migration 0006 — authenticated roster read (for rankings)
-- Student & parent dashboards/reports compute ranks over the whole student
-- roster, so any logged-in user must be able to read student rows and their
-- profile names. Rankings are already public within the app, so this matches
-- existing behaviour. Read-only; still no write access for non-admins.
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

drop policy if exists students_auth_read   on public.students;
drop policy if exists profiles_student_read on public.profiles;

create policy students_auth_read on public.students
  for select using (auth.uid() is not null);

create policy profiles_student_read on public.profiles
  for select using (auth.uid() is not null and role = 'student');

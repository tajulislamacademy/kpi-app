-- ============================================================================
-- Migration 0011 — Promotable admins (is_admin flag)
-- ----------------------------------------------------------------------------
-- Reinstates the old "make anyone an admin" feature on Supabase. Adds
-- profiles.is_admin so any user (teacher / student / parent) can be granted
-- admin rights IN ADDITION to their role (a teacher-admin keeps teacher access).
--
-- is_admin_user() = (role = 'admin' OR is_admin) for the current auth user.
-- Every ADMIN policy switches from `my_role() = 'admin'` to is_admin_user().
-- Role-specific policies (my_role() = 'teacher', self-read, etc.) are left
-- untouched, so a promoted teacher keeps BOTH teacher and admin access.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run.  Idempotent.
-- ============================================================================

-- 1) Column ---------------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 2) Admin predicate (SECURITY DEFINER avoids profiles-RLS recursion) ------
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' or is_admin from public.profiles where auth_id = auth.uid()),
    false
  )
$$;

-- 3) Re-point every admin policy to is_admin_user() ------------------------
-- profiles
drop policy if exists profiles_admin_read  on public.profiles;
create policy profiles_admin_read  on public.profiles for select using (public.is_admin_user());
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all   using (public.is_admin_user()) with check (public.is_admin_user());
-- students
drop policy if exists students_admin_all on public.students;
create policy students_admin_all on public.students for all using (public.is_admin_user()) with check (public.is_admin_user());
-- teachers
drop policy if exists teachers_admin_all on public.teachers;
create policy teachers_admin_all on public.teachers for all using (public.is_admin_user()) with check (public.is_admin_user());
-- questions
drop policy if exists questions_admin_write on public.questions;
create policy questions_admin_write on public.questions for all using (public.is_admin_user()) with check (public.is_admin_user());
-- term_config
drop policy if exists term_admin_write on public.term_config;
create policy term_admin_write on public.term_config for all using (public.is_admin_user()) with check (public.is_admin_user());
-- kpi_entries
drop policy if exists entries_admin_all on public.kpi_entries;
create policy entries_admin_all on public.kpi_entries for all using (public.is_admin_user()) with check (public.is_admin_user());
-- parents
drop policy if exists parents_admin_all on public.parents;
create policy parents_admin_all on public.parents for all using (public.is_admin_user()) with check (public.is_admin_user());

-- 4) admin_set_password: allow promoted admins too ------------------------
create or replace function public.admin_set_password(p_profile_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_auth uuid;
begin
  if not public.is_admin_user() then
    raise exception 'not authorized';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'password too short';
  end if;
  select auth_id into v_auth from public.profiles where id = p_profile_id;
  if v_auth is null then
    raise exception 'user has no login account';
  end if;
  update auth.users
    set encrypted_password = crypt(p_password, gen_salt('bf')),
        updated_at = now()
    where id = v_auth;
end;
$$;

-- 5) Protect the root admin: it can never be demoted -----------------------
create or replace function public.protect_root_admin()
returns trigger
language plpgsql
as $$
begin
  if old.is_root then
    new.role := 'admin';   -- root stays a full admin no matter what
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_root_admin on public.profiles;
create trigger trg_protect_root_admin
  before update on public.profiles
  for each row execute function public.protect_root_admin();

-- ============================================================================
-- TEARDOWN (uncomment to revert)
-- ----------------------------------------------------------------------------
-- drop trigger if exists trg_protect_root_admin on public.profiles;
-- drop function if exists public.protect_root_admin();
-- drop function if exists public.is_admin_user();
-- alter table public.profiles drop column if exists is_admin;
--   (then re-run 0001/0002/0003/0004/0007/0008 admin policies to restore my_role())
-- ============================================================================

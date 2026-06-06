-- ============================================================================
-- Migration 0001 — Students vertical slice (Auth Option B foundation)
-- Tables: profiles, students  |  RLS: enabled with real policies
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- Idempotent-ish: safe to re-run after a clean drop (see teardown at bottom).
-- ============================================================================

-- ---- Enums --------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin','teacher','student','parent');
exception when duplicate_object then null; end $$;

-- ---- profiles -----------------------------------------------------------
-- One row per *person* (student/teacher/parent/admin).
-- DECOUPLED from auth: `auth_id` links to a login account ONLY when the person
-- can sign in. This lets us seed 200 students without creating 200 logins, and
-- attach a Supabase Auth account later. Login-capable users (admins, teachers)
-- get `auth_id` set; bulk students can stay login-less until needed.
create table if not exists public.profiles (
  id         uuid primary key default gen_random_uuid(),
  auth_id    uuid unique references auth.users(id) on delete set null,
  system_id  text unique not null,                 -- TCH-/STD-/PAR-/ADM-YYYYNNNN
  role       public.user_role not null,
  name       text not null,                        -- Bengali name
  name_en    text,
  is_root    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---- students -----------------------------------------------------------
create table if not exists public.students (
  id      uuid primary key references public.profiles(id) on delete cascade,
  class   text not null,
  section text,
  roll    int
);

-- ---- role helper --------------------------------------------------------
-- SECURITY DEFINER so it can read profiles without tripping profiles' own RLS
-- (prevents infinite recursion in policies). Named my_role() to avoid clashing
-- with Postgres' built-in current_role.
create or replace function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_id = auth.uid()
$$;

-- ---- RLS ----------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.students enable row level security;

-- profiles: a user sees their own row; admins see all. Only admins write.
drop policy if exists profiles_self_read  on public.profiles;
drop policy if exists profiles_admin_read  on public.profiles;
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_self_read  on public.profiles
  for select using (auth_id = auth.uid());
create policy profiles_admin_read on public.profiles
  for select using (public.my_role() = 'admin');
create policy profiles_admin_write on public.profiles
  for all using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

-- students: admins full access; a student reads only their own record.
-- (teacher/parent read policies arrive in their own slices.)
drop policy if exists students_admin_all  on public.students;
drop policy if exists students_self_read  on public.students;
create policy students_admin_all on public.students
  for all using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');
create policy students_self_read on public.students
  for select using (
    id = (select p.id from public.profiles p where p.auth_id = auth.uid())
  );

-- ============================================================================
-- TEARDOWN (uncomment to reset this slice before a clean re-run)
-- ----------------------------------------------------------------------------
-- drop table if exists public.students cascade;
-- drop table if exists public.profiles cascade;
-- drop function if exists public.my_role();
-- drop type if exists public.user_role;
-- ============================================================================

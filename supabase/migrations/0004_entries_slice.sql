-- ============================================================================
-- Migration 0004 — KPI entries slice
-- One kpi_entries table holds student, teacher and parent scores
-- (target_type distinguishes them). question text is snapshotted so deleted
-- questions still render in history.
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- helper: current user's profile id (SECURITY DEFINER avoids RLS recursion)
create or replace function public.my_profile_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select id from public.profiles where auth_id = auth.uid() $$;

create table if not exists public.kpi_entries (
  id               uuid primary key default gen_random_uuid(),
  target_type      text not null,                 -- 'student' | 'teacher' | 'parent'
  target_id        uuid not null references public.profiles(id) on delete cascade,
  entered_by       uuid references public.profiles(id) on delete set null,
  question_id      uuid references public.questions(id) on delete set null,
  question_text    text,
  question_text_en text,
  max_points       int,
  score            int  not null default 0,
  role             text,                          -- classTeacher|subjectTeacher|guideTeacher (student)
  subject          text,
  month            int  not null,                 -- 0..11
  year             int  not null,
  entry_date       date not null,
  edit_log         jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists kpi_entries_target_idx on public.kpi_entries (target_type, target_id, year, month);

alter table public.kpi_entries enable row level security;

drop policy if exists entries_admin_all     on public.kpi_entries;
drop policy if exists entries_teacher_write on public.kpi_entries;
drop policy if exists entries_teacher_update on public.kpi_entries;
drop policy if exists entries_owner_read    on public.kpi_entries;

-- admins: everything
create policy entries_admin_all on public.kpi_entries
  for all using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- teachers: may add student entries they themselves enter
create policy entries_teacher_write on public.kpi_entries
  for insert with check (
    public.my_role() = 'teacher'
    and entered_by = public.my_profile_id()
    and target_type = 'student'
  );

-- teachers: may edit entries they entered
create policy entries_teacher_update on public.kpi_entries
  for update using (public.my_role() = 'teacher' and entered_by = public.my_profile_id())
  with check (entered_by = public.my_profile_id());

-- anyone: read entries where they are the target (own KPI) or the enterer
create policy entries_owner_read on public.kpi_entries
  for select using (
    target_id = public.my_profile_id() or entered_by = public.my_profile_id()
  );

-- ============================================================================
-- TEARDOWN
-- drop table if exists public.kpi_entries cascade;
-- drop function if exists public.my_profile_id();
-- ============================================================================

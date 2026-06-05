-- ============================================================================
-- Migration 0003 — Questions + term config slice
-- One questions table covers all three categories (student/teacher/parent),
-- replacing the 3 separate localStorage arrays. term_config is a single row.
-- Read = any authenticated user; write = admin only.
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,                 -- 'student' | 'teacher' | 'parent'
  role          text,                          -- classTeacher|subjectTeacher|guideTeacher (student only)
  text_bn       text not null,
  text_en       text,
  points        int  not null default 0,
  frequency     text not null default 'monthly', -- daily|weekly|monthly|quarterly|annual
  active_months int[] not null default '{0,1,2,3,4,5,6,7,8,9,10,11}',
  created_at    timestamptz not null default now()
);

alter table public.questions enable row level security;
drop policy if exists questions_read        on public.questions;
drop policy if exists questions_admin_write on public.questions;
create policy questions_read on public.questions
  for select using (auth.uid() is not null);
create policy questions_admin_write on public.questions
  for all using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

-- Single-row term configuration (which month indexes belong to each term).
create table if not exists public.term_config (
  id    int primary key default 1,
  term1 int[] not null default '{0,1,2}',
  term2 int[] not null default '{3,4,5}',
  term3 int[] not null default '{6,7,8}',
  term4 int[] not null default '{9,10,11}'
);
alter table public.term_config enable row level security;
drop policy if exists term_read        on public.term_config;
drop policy if exists term_admin_write on public.term_config;
create policy term_read on public.term_config
  for select using (auth.uid() is not null);
create policy term_admin_write on public.term_config
  for all using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');
insert into public.term_config (id) values (1) on conflict (id) do nothing;

-- ============================================================================
-- TEARDOWN
-- drop table if exists public.questions cascade;
-- drop table if exists public.term_config cascade;
-- ============================================================================

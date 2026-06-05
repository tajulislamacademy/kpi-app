-- ============================================================================
-- Migration 0002 — Teachers slice
-- teachers table (1:1 with a profiles row, role='teacher') + RLS.
-- Pragmatic shape: jsonb/array mirrors the current app object to minimize code.
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

create table if not exists public.teachers (
  id                  uuid primary key references public.profiles(id) on delete cascade,
  class_teacher       jsonb,                              -- {class, section} | null
  subject_assignments jsonb  not null default '[]'::jsonb, -- [{class, section, subject}]
  guide_students      uuid[] not null default '{}'        -- student profile ids
);

alter table public.teachers enable row level security;

-- admins manage everything; a teacher can read their own row.
drop policy if exists teachers_admin_all on public.teachers;
drop policy if exists teachers_self_read on public.teachers;
create policy teachers_admin_all on public.teachers
  for all using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');
create policy teachers_self_read on public.teachers
  for select using (
    id = (select p.id from public.profiles p where p.auth_id = auth.uid())
  );

-- ============================================================================
-- TEARDOWN (uncomment to reset this slice)
-- drop table if exists public.teachers cascade;
-- ============================================================================

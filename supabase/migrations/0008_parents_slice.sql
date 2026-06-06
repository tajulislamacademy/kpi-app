-- ============================================================================
-- Migration 0008 — Parents slice
-- A parent is a profiles row (role='parent') linked to one student. Approval
-- status gates login. Parents may read their own child's student entries.
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

create table if not exists public.parents (
  id         uuid primary key references public.profiles(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  relation   text,                                   -- father | mother | guardian
  status     text not null default 'pending'         -- pending | approved | rejected
);

alter table public.parents enable row level security;

drop policy if exists parents_admin_all on public.parents;
drop policy if exists parents_self_read on public.parents;
create policy parents_admin_all on public.parents
  for all using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy parents_self_read on public.parents
  for select using (id = public.my_profile_id());

-- A parent may read their own child's student KPI entries.
drop policy if exists entries_parent_read on public.kpi_entries;
create policy entries_parent_read on public.kpi_entries
  for select using (
    target_type = 'student'
    and target_id = (select student_id from public.parents where id = public.my_profile_id())
  );

-- ============================================================================
-- TEARDOWN
-- drop policy if exists entries_parent_read on public.kpi_entries;
-- drop table if exists public.parents cascade;
-- ============================================================================

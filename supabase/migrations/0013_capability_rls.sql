-- ============================================================================
-- Migration 0013 — Capability RLS (Phase 3: DB-enforced limited admins)
-- ----------------------------------------------------------------------------
-- Makes the per-action permissions REAL at the database, not just the UI.
--
-- Every admin policy becomes `my_role() = 'admin' OR has_cap('<cap>')`, so:
--   • root + dedicated role='admin' keep FULL access (the my_role()='admin'
--     branch) — no risk of an admin being locked out.
--   • a promoted (is_admin) admin can only do what their `permissions` allow.
--
-- Scope of enforcement: WRITES on the four entity tables (create/edit/delete)
-- + kpi_entries (point_entry) + term_config (settings.edit), plus a trigger that
-- blocks privilege escalation on profiles. Reads stay broad (roster/ranking
-- policies already allow any authenticated user to read people — view is gated
-- in the UI only). Soft-delete/restore are UPDATEs, so they fall under the
-- entity's `edit` policy at the DB level (the finer soft_delete/restore split is
-- enforced in the UI).
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

-- Capability predicate (SECURITY DEFINER → no profiles-RLS recursion).
create or replace function public.has_cap(cap text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select is_root or role = 'admin' or (is_admin and cap = any(permissions))
    from public.profiles where auth_id = auth.uid()
  ), false)
$$;

-- helper macro pattern repeated per table -----------------------------------
-- students
drop policy if exists students_admin_all    on public.students;
drop policy if exists students_admin_select on public.students;
drop policy if exists students_admin_insert on public.students;
drop policy if exists students_admin_update on public.students;
drop policy if exists students_admin_delete on public.students;
create policy students_admin_select on public.students for select using (public.my_role() = 'admin' or public.has_cap('students.view'));
create policy students_admin_insert on public.students for insert with check (public.my_role() = 'admin' or public.has_cap('students.create'));
create policy students_admin_update on public.students for update using (public.my_role() = 'admin' or public.has_cap('students.edit') or public.has_cap('students.soft_delete') or public.has_cap('students.restore')) with check (public.my_role() = 'admin' or public.has_cap('students.edit') or public.has_cap('students.soft_delete') or public.has_cap('students.restore'));
create policy students_admin_delete on public.students for delete using (public.my_role() = 'admin' or public.has_cap('students.force_delete'));

-- teachers
drop policy if exists teachers_admin_all    on public.teachers;
drop policy if exists teachers_admin_select on public.teachers;
drop policy if exists teachers_admin_insert on public.teachers;
drop policy if exists teachers_admin_update on public.teachers;
drop policy if exists teachers_admin_delete on public.teachers;
create policy teachers_admin_select on public.teachers for select using (public.my_role() = 'admin' or public.has_cap('teachers.view'));
create policy teachers_admin_insert on public.teachers for insert with check (public.my_role() = 'admin' or public.has_cap('teachers.create'));
create policy teachers_admin_update on public.teachers for update using (public.my_role() = 'admin' or public.has_cap('teachers.edit') or public.has_cap('teachers.soft_delete') or public.has_cap('teachers.restore')) with check (public.my_role() = 'admin' or public.has_cap('teachers.edit') or public.has_cap('teachers.soft_delete') or public.has_cap('teachers.restore'));
create policy teachers_admin_delete on public.teachers for delete using (public.my_role() = 'admin' or public.has_cap('teachers.force_delete'));

-- parents
drop policy if exists parents_admin_all    on public.parents;
drop policy if exists parents_admin_select on public.parents;
drop policy if exists parents_admin_insert on public.parents;
drop policy if exists parents_admin_update on public.parents;
drop policy if exists parents_admin_delete on public.parents;
create policy parents_admin_select on public.parents for select using (public.my_role() = 'admin' or public.has_cap('parents.view'));
create policy parents_admin_insert on public.parents for insert with check (public.my_role() = 'admin' or public.has_cap('parents.create'));
create policy parents_admin_update on public.parents for update using (public.my_role() = 'admin' or public.has_cap('parents.edit') or public.has_cap('parents.soft_delete') or public.has_cap('parents.restore')) with check (public.my_role() = 'admin' or public.has_cap('parents.edit') or public.has_cap('parents.soft_delete') or public.has_cap('parents.restore'));
create policy parents_admin_delete on public.parents for delete using (public.my_role() = 'admin' or public.has_cap('parents.force_delete'));

-- questions
drop policy if exists questions_admin_write  on public.questions;
drop policy if exists questions_admin_select on public.questions;
drop policy if exists questions_admin_insert on public.questions;
drop policy if exists questions_admin_update on public.questions;
drop policy if exists questions_admin_delete on public.questions;
create policy questions_admin_select on public.questions for select using (public.my_role() = 'admin' or public.has_cap('questions.view'));
create policy questions_admin_insert on public.questions for insert with check (public.my_role() = 'admin' or public.has_cap('questions.create'));
create policy questions_admin_update on public.questions for update using (public.my_role() = 'admin' or public.has_cap('questions.edit') or public.has_cap('questions.soft_delete') or public.has_cap('questions.restore')) with check (public.my_role() = 'admin' or public.has_cap('questions.edit') or public.has_cap('questions.soft_delete') or public.has_cap('questions.restore'));
create policy questions_admin_delete on public.questions for delete using (public.my_role() = 'admin' or public.has_cap('questions.force_delete'));

-- kpi_entries (admin path; teacher/parent/owner policies untouched)
drop policy if exists entries_admin_all on public.kpi_entries;
create policy entries_admin_all on public.kpi_entries for all using (public.my_role() = 'admin' or public.has_cap('point_entry')) with check (public.my_role() = 'admin' or public.has_cap('point_entry'));

-- term_config
drop policy if exists term_admin_write on public.term_config;
create policy term_admin_write on public.term_config for all using (public.my_role() = 'admin' or public.has_cap('settings.edit')) with check (public.my_role() = 'admin' or public.has_cap('settings.edit'));

-- profiles stay broad for read/write (shared identity table; every management
-- page joins it). Privilege escalation is blocked by the trigger below.

-- Protect root + block privilege changes by non-(admins.manage) holders.
create or replace function public.protect_root_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_root then
    new.role := 'admin';      -- root is always a full admin
    new.is_root := true;      -- and can't be un-rooted
  end if;
  if (new.is_admin    is distinct from old.is_admin
      or new.permissions is distinct from old.permissions
      or new.role        is distinct from old.role
      or new.is_root     is distinct from old.is_root)
     and not public.has_cap('admins.manage') then
    raise exception 'not authorized to change admin privileges';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_root_admin on public.profiles;
create trigger trg_protect_root_admin
  before update on public.profiles
  for each row execute function public.protect_root_admin();

-- ============================================================================
-- NOTE / known residuals (acceptable for trusted-staff threat model):
--  • Reads are broad (roster/ranking policies). View limits are UI-only.
--  • Force-delete of a person removes the profiles row (cascade), governed by
--    the broad profiles write policy + UI; the *_delete entity policy above is a
--    belt-and-suspenders.
--  • Soft-delete/restore = UPDATE deleted_at → enforced as the entity `edit`
--    cap at the DB; the soft_delete/restore distinction is UI-only.
-- TEARDOWN: re-run 0011's admin policies (is_admin_user) to revert to "any admin".
-- ============================================================================

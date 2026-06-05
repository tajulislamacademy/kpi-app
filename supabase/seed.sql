-- ============================================================================
-- Seed data — Students slice (demo dataset mirrored from App.jsx initStudents)
-- Run AFTER 0001_students_slice.sql. Safe to re-run (uses systemId conflict).
-- These person-records have NO login (auth_id = null) — that's intended.
-- The admin row is linked to a real auth account in docs/SUPABASE_SETUP.md.
-- ============================================================================

-- Root admin (login attached later via SUPABASE_SETUP.md step 3)
insert into public.profiles (system_id, role, name, name_en, is_root)
values ('ADM-20260001','admin','অ্যাডমিন','Admin', true)
on conflict (system_id) do nothing;

-- Demo students — done as TWO separate statements on purpose.
-- A single data-modifying CTE does NOT work here: rows inserted by a wCTE are
-- invisible to the rest of the same query (Postgres snapshot rule), so the
-- students insert would see zero new profiles. Separate statements fix that —
-- statement 2 runs after statement 1 commits and sees its rows.

-- 1) student profile rows (login-less; auth_id stays null)
insert into public.profiles (system_id, role, name, name_en) values
  ('STD-20260001','student','রাফি আহমেদ','Rafi Ahmed'),
  ('STD-20260002','student','সাকিব হাসান','Sakib Hassan'),
  ('STD-20260003','student','নাফিসা ইসলাম','Nafisa Islam'),
  ('STD-20260004','student','তানভীর রহমান','Tanvir Rahman'),
  ('STD-20260005','student','মেহেদী হাসান','Mehedi Hassan'),
  ('STD-20260006','student','রিমা আক্তার','Rima Akter')
on conflict (system_id) do nothing;

-- 2) students detail rows (joins the profiles inserted above)
insert into public.students (id, class, section, roll)
select p.id, v.class, v.section, v.roll
from (values
  ('STD-20260001','8','A',1),
  ('STD-20260002','8','A',2),
  ('STD-20260003','8','A',3),
  ('STD-20260004','7','A',1),
  ('STD-20260005','9','A',5),
  ('STD-20260006','6','B',3)
) as v(system_id, class, section, roll)
join public.profiles p using (system_id)
on conflict (id) do nothing;

-- ============================================================================
-- Migration 0010 — de-duplicate kpi_entries and add a uniqueness guard
-- App already prevents re-entry via the frequency check (freqDone), but a fast
-- double-submit could still insert two identical rows. This:
--   1) deletes existing duplicates, keeping the most recently created row per
--      (target_id, question_id, entry_date);
--   2) adds a partial UNIQUE index so the DB itself rejects future exact dupes.
-- Safe: legitimate entries differ by date (monthly/weekly entered on one date
-- per period) or by question, so this never blocks a real entry. Rows whose
-- question was deleted (question_id IS NULL) are left untouched.
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- 1) remove existing exact duplicates, keeping the latest
with ranked as (
  select id,
         row_number() over (
           partition by target_id, question_id, entry_date
           order by created_at desc, id desc
         ) as rn
  from public.kpi_entries
  where question_id is not null
)
delete from public.kpi_entries e
using ranked r
where e.id = r.id and r.rn > 1;

-- 2) prevent future exact duplicates (same target, same question, same date)
create unique index if not exists kpi_entries_no_dup
  on public.kpi_entries (target_id, question_id, entry_date)
  where question_id is not null;

-- ============================================================================
-- TEARDOWN
-- drop index if exists public.kpi_entries_no_dup;
-- ============================================================================

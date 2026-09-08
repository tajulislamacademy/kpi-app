-- ============================================================================
-- Migration 0026 — dedup key must include role + subject
-- ----------------------------------------------------------------------------
-- BUG: a teacher holding two (or three) subject assignments in the SAME
-- class + section grades the SAME students against the SAME subjectTeacher
-- question set. Entering KPI for the first lesson made every other lesson show
-- as already-filled (✓), and any row that got past the UI was silently dropped
-- here, because the dedup key from 0019 was only:
--     (target_id, question_id, entry_date)
-- Widening it to include role + subject makes "Bangla, 10 June" and
-- "English, 10 June" for the same student + question two distinct rows, while
-- still rejecting a true double-submit of the SAME lesson.
--
-- NULLS NOT DISTINCT is required: teacher- and parent-target rows carry
-- role = NULL and subject = NULL, and under default NULLS DISTINCT semantics
-- those rows would stop being deduped at all. (Postgres 15+.)
--
-- SAFETY ON LIVE DATA: this migration writes NO rows — it only adds an index
-- and drops the old one. The new key is strictly finer than the old one, so
-- every row that is unique under the old index is unique under the new one and
-- the CREATE cannot fail on existing data. Both CREATE and DROP use
-- CONCURRENTLY, so writers are never blocked.
--
-- APPLY ORDER MATTERS — the app sends
--   ON CONFLICT (target_id, question_id, entry_date, role, subject)
-- and PostgREST rejects the whole request if no unique index matches it:
--   1. run STEP 1 below  (both indexes now exist)
--   2. deploy the app code that widens onConflict
--   3. run STEP 2 below  (drops the old, too-broad index)
-- Between 1 and 2 behaviour is unchanged; between 2 and 3 the second lesson's
-- insert errors loudly instead of vanishing — keep that window short.
--
-- Run each statement on its own: CREATE/DROP INDEX CONCURRENTLY cannot run
-- inside a transaction block. In the Supabase SQL Editor, paste and run STEP 1
-- alone, then later STEP 2 alone.
-- ============================================================================

-- Preflight (read-only): confirm Postgres 15+ for NULLS NOT DISTINCT, and see
-- which dedup index is currently live.
--   select current_setting('server_version');
--   select indexname, indexdef from pg_indexes where tablename = 'kpi_entries';

-- --- STEP 1 — add the new, finer index (run alone) --------------------------
create unique index concurrently if not exists kpi_entries_no_dup_v2
  on public.kpi_entries (target_id, question_id, entry_date, role, subject)
  nulls not distinct;

-- --- STEP 2 — after the app deploy, drop the old one (run alone) ------------
-- drop index concurrently if exists public.kpi_entries_no_dup;

-- ----------------------------------------------------------------------------
-- If STEP 1 ever reports "INVALID" (a concurrent build that failed part-way),
-- drop the invalid index and retry — it is not enforcing anything meanwhile:
--   select indexrelid::regclass, indisvalid from pg_index
--     where indexrelid = 'kpi_entries_no_dup_v2'::regclass;
--   drop index concurrently if exists public.kpi_entries_no_dup_v2;
--
-- TEARDOWN (restores 0019 exactly; still writes no rows):
--   create unique index concurrently if not exists kpi_entries_no_dup
--     on public.kpi_entries (target_id, question_id, entry_date);
--   drop index concurrently if exists public.kpi_entries_no_dup_v2;
--   (and redeploy the previous app build, whose onConflict omits role/subject)
-- ============================================================================

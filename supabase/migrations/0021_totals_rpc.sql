-- ============================================================================
-- Migration 0021 — Replace the SECURITY DEFINER view with a definer FUNCTION
-- ----------------------------------------------------------------------------
-- Supabase's linter flags SECURITY DEFINER *views* (they bypass the caller's
-- RLS). Our 0020 view does that on purpose — it aggregates all student entries
-- into monthly SUMS so rankings work while raw rows stay hidden. The data it
-- exposes is harmless (per-student monthly totals, no per-question detail), so
-- the warning is advisory, not a real leak.
--
-- Still, the cleaner Supabase-idiomatic pattern is a SECURITY DEFINER *function*
-- with a fixed search_path (no "Security Definer View" lint, no mutable-path
-- lint), executable by logged-in users only (drops the anon grant 0020 had).
-- Same data, same privacy guarantee.
--
-- Apply AFTER 0020. Idempotent. Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

drop view if exists public.student_kpi_month_totals;

create or replace function public.student_month_totals()
returns table (student_id uuid, year int, month int, points int)
language sql
stable
security definer
set search_path = public
as $$
  select target_id, year, month, sum(score)::int
  from public.kpi_entries
  where target_type = 'student'
  group by target_id, year, month
$$;

revoke all on function public.student_month_totals() from public, anon;
grant execute on function public.student_month_totals() to authenticated;

-- ----------------------------------------------------------------------------
-- TEARDOWN: drop function if exists public.student_month_totals();
--   (and re-create the 0020 view if reverting)
-- ============================================================================

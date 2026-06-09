-- ============================================================================
-- Migration 0023 — Bounded ranking aggregate (scale to 200+ students)
-- ----------------------------------------------------------------------------
-- student_month_totals() (0021) returned ONE row per student PER MONTH, i.e.
-- ~students × 12 × years rows — which crosses PostgREST's 1000-row cap with 200
-- students inside the first year and silently truncates, producing WRONG
-- rankings/KPIs. This replaces it with an aggregate that sums server-side over a
-- requested set of months and returns ONE row per student (≤ #students rows), so
-- the result never approaches the cap.
--
--   p_year   — the year to total.
--   p_months — int[] of month indexes (0-11) to include; NULL = the whole year.
--              (month tab → [m]; a term → its months; yearly → NULL)
--
-- Apply AFTER 0021. Idempotent. Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

drop function if exists public.student_month_totals();

create or replace function public.student_totals(p_year int, p_months int[] default null)
returns table (student_id uuid, points int)
language sql
stable
security definer
set search_path = public
as $$
  select target_id, sum(score)::int
  from public.kpi_entries
  where target_type = 'student'
    and year = p_year
    and (p_months is null or month = any(p_months))
  group by target_id
$$;

revoke all on function public.student_totals(int, int[]) from public, anon;
grant execute on function public.student_totals(int, int[]) to authenticated;

-- Distinct years present in kpi_entries — for the YearSelector, now that the
-- client no longer loads raw entries to derive the set. Tiny result.
create or replace function public.kpi_years()
returns table (year int)
language sql
stable
security definer
set search_path = public
as $$
  select distinct year from public.kpi_entries order by year desc
$$;
revoke all on function public.kpi_years() from public, anon;
grant execute on function public.kpi_years() to authenticated;

-- ----------------------------------------------------------------------------
-- TEARDOWN: drop function if exists public.student_totals(int, int[]);
--   (and re-create student_month_totals() from 0021 if reverting)
-- ============================================================================

// KPI entries data access — Supabase (entries slice).
// kpi_entries holds student/teacher/parent scores; this module covers the
// student point-entry flow. UI shape mirrors the old localStorage entry object.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import type { StudentEntry, TargetEntry } from "../types";

const toUi = (r: any): StudentEntry => ({
  id: r.id,
  studentId: r.target_id,
  teacherId: r.entered_by,
  date: r.entry_date,
  questionId: r.question_id,
  questionText: r.question_text,
  questionTextEn: r.question_text_en,
  maxPoints: r.max_points,
  score: r.score,
  month: r.month,
  year: r.year ?? 2026, // normalize legacy null year so strict `=== year` filters and `|| 2026` consumers agree
  role: r.role,
  subject: r.subject,
  editLog: r.edit_log || [],
});

export async function listStudentEntries(): Promise<StudentEntry[]> {
  const { data, error } = await supabase
    .from("kpi_entries")
    .select("*")
    .eq("target_type", "student");
  if (error) throw error;
  return (data || []).map(toUi);
}

// rows must already be in db shape (snake_case columns). Upsert with
// ignoreDuplicates so a double-submit hitting the (target_id, question_id,
// entry_date) unique index (migration 0010) is a no-op for the dup row instead
// of aborting the whole batch and losing every legitimate entry in it.
export async function insertEntries(rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await supabase
    .from("kpi_entries")
    .upsert(rows, { onConflict: "target_id,question_id,entry_date", ignoreDuplicates: true });
  if (error) throw error;
}

// Appends to edit_log and sets the new score.
export async function updateEntryScore(id: string, newScore: number, oldScore: number, editor: string): Promise<void> {
  const { data: cur, error: e0 } = await supabase
    .from("kpi_entries")
    .select("edit_log")
    .eq("id", id)
    .single();
  if (e0) throw e0;
  const editLog = [
    ...(cur.edit_log || []),
    { editedBy: editor, editedAt: new Date().toISOString().slice(0, 10), oldScore, newScore },
  ];
  const { error } = await supabase
    .from("kpi_entries")
    .update({ score: newScore, edit_log: editLog })
    .eq("id", id);
  if (error) throw error;
}

// Aggregation helpers over a loaded student-entries array (uuid student ids).
export function studentKpiHelpers(entries: StudentEntry[]) {
  const monthKPI = (sid: string, month: number, year: number): number =>
    entries.filter((e) => e.studentId === sid && e.month === month && e.year === year).reduce((s, e) => s + e.score, 0);
  const termKPI = (sid: string, months: number[], year: number): number => (months || []).reduce((s, m) => s + monthKPI(sid, m, year), 0);
  const yearKPI = (sid: string, year: number): number => {
    let total = 0;
    for (let m = 0; m < 12; m++) total += monthKPI(sid, m, year);
    return total;
  };
  return { monthKPI, termKPI, yearKPI };
}

// --- Aggregate-only student totals (privacy: rankings/dashboards) -----------
// Reads the student_kpi_month_totals view (per-student monthly SUMS, no
// per-question detail). Used wherever a full-cohort ranking is needed by users
// who are not allowed to read other students' raw entries (migration 0020).
export interface MonthTotal { studentId: string; year: number; month: number; points: number; }

export async function listStudentMonthTotals(): Promise<MonthTotal[]> {
  const { data, error } = await supabase.from("student_kpi_month_totals").select("*");
  if (error) throw error;
  return (data || []).map((r: any) => ({ studentId: r.student_id, year: r.year ?? 2026, month: r.month, points: r.points || 0 }));
}

// Same monthKPI/termKPI/yearKPI shape as studentKpiHelpers, over the totals view.
export function monthTotalsHelpers(totals: MonthTotal[]) {
  const monthKPI = (sid: string, month: number, year: number): number =>
    totals.filter((x) => x.studentId === sid && x.month === month && x.year === year).reduce((s, x) => s + x.points, 0);
  const termKPI = (sid: string, months: number[], year: number): number => (months || []).reduce((s, m) => s + monthKPI(sid, m, year), 0);
  const yearKPI = (sid: string, year: number): number => {
    let total = 0;
    for (let m = 0; m < 12; m++) total += monthKPI(sid, m, year);
    return total;
  };
  return { monthKPI, termKPI, yearKPI };
}

export function useStudentMonthTotals(enabled = true) {
  const [totals, setTotals] = useState<MonthTotal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setTotals(await listStudentMonthTotals());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);
  return { totals, loading, error, reload };
}

// --- Generic target entries (teacher / parent KPI) --------------------------
const toUiTarget = (r: any): TargetEntry => ({
  id: r.id,
  targetId: r.target_id,
  date: r.entry_date,
  questionId: r.question_id,
  questionText: r.question_text,
  questionTextEn: r.question_text_en,
  maxPoints: r.max_points,
  score: r.score,
  month: r.month,
  year: r.year ?? 2026, // normalize legacy null year (see toUi)
  editLog: r.edit_log || [],
});

export async function listEntriesByTarget(targetType: string): Promise<TargetEntry[]> {
  const { data, error } = await supabase.from("kpi_entries").select("*").eq("target_type", targetType);
  if (error) throw error;
  return (data || []).map(toUiTarget);
}

// Aggregation over target entries (keyed by targetId), same shape as students.
export function targetKpiHelpers(entries: TargetEntry[]) {
  const monthKPI = (tid: string, month: number, year: number): number =>
    entries.filter((e) => e.targetId === tid && e.month === month && e.year === year).reduce((s, e) => s + e.score, 0);
  const termKPI = (tid: string, months: number[], year: number): number => (months || []).reduce((s, m) => s + monthKPI(tid, m, year), 0);
  const yearKPI = (tid: string, year: number): number => {
    let total = 0;
    for (let m = 0; m < 12; m++) total += monthKPI(tid, m, year);
    return total;
  };
  return { monthKPI, termKPI, yearKPI };
}

export function useDbEntriesByTarget(targetType: string, enabled = true) {
  const [entries, setEntries] = useState<TargetEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(await listEntriesByTarget(targetType));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, targetType]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);
  return { entries, loading, error, reload };
}

export function useDbStudentEntries(enabled = true) {
  const [entries, setEntries] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(await listStudentEntries());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);
  return { entries, loading, error, reload };
}

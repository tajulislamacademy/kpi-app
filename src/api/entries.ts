// KPI entries data access — Supabase (entries slice).
// kpi_entries holds student/teacher/parent scores; this module covers the
// student point-entry flow. UI shape mirrors the old localStorage entry object.
import { supabase } from "../supabase";
import { makeCache } from "./cache";
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

// --- Bounded ranking aggregate (scales to 200+ students) --------------------
// student_totals(year, months) sums server-side and returns ONE row per student
// (≤ #students rows), so the result never hits PostgREST's 1000-row cap the way
// loading raw entries would. months=null → whole year; [m] → one month; a term →
// its months. (migration 0023; privacy: aggregate only, no per-question detail.)
export interface StudentTotal { studentId: string; points: number; }

export async function listStudentTotals(year: number, months: number[] | null): Promise<StudentTotal[]> {
  const { data, error } = await supabase.rpc("student_totals", { p_year: year, p_months: months ?? null });
  if (error) throw error;
  return (data || []).map((r: any) => ({ studentId: r.student_id, points: r.points || 0 }));
}

export const totalsMap = (totals: StudentTotal[]): Map<string, number> => new Map(totals.map((t) => [t.studentId, t.points]));

const totalsCache = makeCache<StudentTotal[]>([]);
export function useStudentTotals(year: number, months: number[] | null, enabled = true) {
  const key = `${year}:${months ? [...months].sort((a, b) => a - b).join(",") : "all"}`;
  const { data, loading, error, reload } = totalsCache.useCache(key, () => listStudentTotals(year, months), enabled);
  return { totals: data, loading, error, reload };
}

// Raw entries for ONE student (their own KPI charts / term breakdown). Bounded
// by a single person's history, so it never approaches the row cap.
export async function listStudentEntriesFor(studentId: string): Promise<StudentEntry[]> {
  const { data, error } = await supabase.from("kpi_entries").select("*").eq("target_type", "student").eq("target_id", studentId);
  if (error) throw error;
  return (data || []).map(toUi);
}
const studentEntriesForCache = makeCache<StudentEntry[]>([]);
export function useStudentEntriesFor(studentId: string, enabled = true) {
  const { data, loading, error, reload } = studentEntriesForCache.useCache(studentId || "none", () => studentId ? listStudentEntriesFor(studentId) : Promise.resolve([]), enabled && !!studentId);
  return { entries: data, loading, error, reload };
}

// Distinct years across kpi_entries, for the YearSelector (migration 0023).
export async function listKpiYears(): Promise<number[]> {
  const { data, error } = await supabase.rpc("kpi_years");
  if (error) throw error;
  return (data || []).map((r: any) => r.year as number);
}
const yearsCache = makeCache<number[]>([]);
export function useKpiYears(enabled = true) {
  const { data, reload } = yearsCache.useCache("all", listKpiYears, enabled);
  return { years: data, reload };
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

// Raw entries for ONE teacher/parent target (their own KPI history / detail).
export async function listEntriesForTarget(targetType: string, targetId: string): Promise<TargetEntry[]> {
  const { data, error } = await supabase.from("kpi_entries").select("*").eq("target_type", targetType).eq("target_id", targetId);
  if (error) throw error;
  return (data || []).map(toUiTarget);
}
const entriesForTargetCache = makeCache<TargetEntry[]>([]);
export function useEntriesForTarget(targetType: string, targetId: string, enabled = true) {
  const { data, loading, error, reload } = entriesForTargetCache.useCache(`${targetType}:${targetId || "none"}`, () => targetId ? listEntriesForTarget(targetType, targetId) : Promise.resolve([]), enabled && !!targetId);
  return { entries: data, loading, error, reload };
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

const targetEntriesCache = makeCache<TargetEntry[]>([]);
export function useDbEntriesByTarget(targetType: string, enabled = true) {
  const { data, loading, error, reload } = targetEntriesCache.useCache(targetType, () => listEntriesByTarget(targetType), enabled);
  return { entries: data, loading, error, reload };
}

const studentEntriesCache = makeCache<StudentEntry[]>([]);
export function useDbStudentEntries(enabled = true) {
  const { data, loading, error, reload } = studentEntriesCache.useCache("all", listStudentEntries, enabled);
  return { entries: data, loading, error, reload };
}

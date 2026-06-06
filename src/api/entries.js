// KPI entries data access — Supabase (entries slice).
// kpi_entries holds student/teacher/parent scores; this module covers the
// student point-entry flow. UI shape mirrors the old localStorage entry object.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

const toUi = (r) => ({
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
  year: r.year,
  role: r.role,
  subject: r.subject,
  editLog: r.edit_log || [],
});

export async function listStudentEntries() {
  const { data, error } = await supabase
    .from("kpi_entries")
    .select("*")
    .eq("target_type", "student");
  if (error) throw error;
  return (data || []).map(toUi);
}

// rows must already be in db shape (snake_case columns).
export async function insertEntries(rows) {
  if (!rows.length) return;
  const { error } = await supabase.from("kpi_entries").insert(rows);
  if (error) throw error;
}

// Appends to edit_log and sets the new score.
export async function updateEntryScore(id, newScore, oldScore, editor) {
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
export function studentKpiHelpers(entries) {
  const monthKPI = (sid, month, year) =>
    entries.filter((e) => e.studentId === sid && e.month === month && e.year === year).reduce((s, e) => s + e.score, 0);
  const termKPI = (sid, months, year) => (months || []).reduce((s, m) => s + monthKPI(sid, m, year), 0);
  const yearKPI = (sid, year) => {
    let total = 0;
    for (let m = 0; m < 12; m++) total += monthKPI(sid, m, year);
    return total;
  };
  return { monthKPI, termKPI, yearKPI };
}

// --- Generic target entries (teacher / parent KPI) --------------------------
const toUiTarget = (r) => ({
  id: r.id,
  targetId: r.target_id,
  date: r.entry_date,
  questionId: r.question_id,
  questionText: r.question_text,
  questionTextEn: r.question_text_en,
  maxPoints: r.max_points,
  score: r.score,
  month: r.month,
  year: r.year,
  editLog: r.edit_log || [],
});

export async function listEntriesByTarget(targetType) {
  const { data, error } = await supabase.from("kpi_entries").select("*").eq("target_type", targetType);
  if (error) throw error;
  return (data || []).map(toUiTarget);
}

// Aggregation over target entries (keyed by targetId), same shape as students.
export function targetKpiHelpers(entries) {
  const monthKPI = (tid, month, year) =>
    entries.filter((e) => e.targetId === tid && e.month === month && e.year === year).reduce((s, e) => s + e.score, 0);
  const termKPI = (tid, months, year) => (months || []).reduce((s, m) => s + monthKPI(tid, m, year), 0);
  const yearKPI = (tid, year) => {
    let total = 0;
    for (let m = 0; m < 12; m++) total += monthKPI(tid, m, year);
    return total;
  };
  return { monthKPI, termKPI, yearKPI };
}

export function useDbEntriesByTarget(targetType, enabled = true) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(await listEntriesByTarget(targetType));
    } catch (e) {
      setError(e.message || String(e));
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
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(await listStudentEntries());
    } catch (e) {
      setError(e.message || String(e));
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

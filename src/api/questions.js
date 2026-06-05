// Questions data access — Supabase (questions slice).
// One table holds all three categories (student/teacher/parent). `role` only
// applies to category='student'. Read = any authenticated user; write = admin.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

const toUi = (r) => ({
  id: r.id,
  category: r.category,
  role: r.role,
  textBn: r.text_bn,
  textEn: r.text_en,
  points: r.points,
  frequency: r.frequency,
  activeMonths: r.active_months || [],
});

export async function listQuestions() {
  const { data, error } = await supabase.from("questions").select("*").order("created_at");
  if (error) throw error;
  return (data || []).map(toUi);
}

export async function createQuestion({ category, role, textBn, textEn, points, frequency, activeMonths }) {
  const { error } = await supabase.from("questions").insert({
    category,
    role: category === "student" ? role : null,
    text_bn: textBn,
    text_en: textEn,
    points,
    frequency,
    active_months: activeMonths,
  });
  if (error) throw error;
}

export async function updateQuestion(id, { category, role, textBn, textEn, points, frequency, activeMonths }) {
  const { error } = await supabase
    .from("questions")
    .update({
      role: category === "student" ? role : null,
      text_bn: textBn,
      text_en: textEn,
      points,
      frequency,
      active_months: activeMonths,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuestion(id) {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export function useDbQuestions(enabled = true) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setQuestions(await listQuestions());
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
  return { questions, loading, error, reload };
}

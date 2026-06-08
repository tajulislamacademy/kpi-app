// Questions data access — Supabase (questions slice).
// One table holds all three categories (student/teacher/parent). `role` only
// applies to category='student'. Read = any authenticated user; write = admin.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import type { Question, QuestionInput } from "../types";

const toUi = (r: any): Question => ({
  id: r.id,
  category: r.category,
  role: r.role,
  textBn: r.text_bn,
  textEn: r.text_en,
  points: r.points,
  frequency: r.frequency,
  activeMonths: r.active_months || [],
  deletedAt: r.deleted_at ?? null,
});

export async function listQuestions(withTrash = false): Promise<Question[]> {
  const { data, error } = await supabase.from("questions").select("*").order("created_at");
  if (error) throw error;
  const rows = (data || []).map(toUi);
  return withTrash ? rows : rows.filter(q => !q.deletedAt);
}

export async function softDeleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
export async function restoreQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function createQuestion({ category, role, textBn, textEn, points, frequency, activeMonths }: QuestionInput): Promise<void> {
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

export async function updateQuestion(id: string, { category, role, textBn, textEn, points, frequency, activeMonths }: QuestionInput): Promise<void> {
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

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export function useDbQuestions(enabled = true, withTrash = false) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setQuestions(await listQuestions(withTrash));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, withTrash]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);
  return { questions, loading, error, reload };
}

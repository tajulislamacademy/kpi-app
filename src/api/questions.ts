// Questions data access — Supabase (questions slice).
// One table holds all three categories (student/teacher/parent). `role` only
// applies to category='student'. Read = any authenticated user; write = admin.
import { useMemo } from "react";
import { supabase } from "../supabase";
import { makeCache } from "./cache";
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

const questionsCache = makeCache<Question[]>([]);
export function useDbQuestions(enabled = true, withTrash = false) {
  const { data, loading, error, reload } = questionsCache.useCache("all", () => listQuestions(true), enabled);
  const questions = useMemo(() => withTrash ? data : data.filter(q => !q.deletedAt), [data, withTrash]);
  return { questions, loading, error, reload };
}

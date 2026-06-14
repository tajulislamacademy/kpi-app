// Subjects data access — Supabase (subjects slice). Each subject is tied to a
// class + section. Read = any authenticated user (pickers); write = subjects.*
// caps / admin. Hard delete (config data; entries snapshot the subject string).
import { supabase } from "../supabase";
import { makeCache } from "./cache";
import type { Subject, SubjectInput } from "../types";

const toUi = (r: any): Subject => ({
  id: r.id,
  nameBn: r.name_bn,
  nameEn: r.name_en || "",
  class: r.class,
  section: r.section,
});

export async function listSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase.from("subjects").select("*").order("class").order("section").order("name_bn");
  if (error) throw error;
  return (data || []).map(toUi);
}

export async function createSubject({ nameBn, nameEn, class: cls, section }: SubjectInput): Promise<void> {
  const { error } = await supabase.from("subjects").insert({ name_bn: nameBn, name_en: nameEn || null, class: cls, section });
  if (error) throw error;
}

export async function updateSubject(id: string, { nameBn, nameEn, class: cls, section }: SubjectInput): Promise<void> {
  const { error } = await supabase.from("subjects").update({ name_bn: nameBn, name_en: nameEn || null, class: cls, section }).eq("id", id);
  if (error) throw error;
}

export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

const subjectsCache = makeCache<Subject[]>([]);
export function useDbSubjects(enabled = true) {
  const { data, loading, error, reload } = subjectsCache.useCache("all", listSubjects, enabled);
  return { subjects: data, loading, error, reload };
}

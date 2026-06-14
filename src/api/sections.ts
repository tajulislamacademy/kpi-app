// Sections data access — Supabase. Each class has its own sections. Read = any
// authenticated user (dropdowns); write = subjects.* caps / admin (class config).
import { supabase } from "../supabase";
import { makeCache } from "./cache";
import type { Section, SectionInput } from "../types";

const toUi = (r: any): Section => ({ id: r.id, class: r.class, name: r.name, label: r.label || "" });

export async function listSections(): Promise<Section[]> {
  const { data, error } = await supabase.from("sections").select("*").order("class").order("name");
  if (error) throw error;
  return (data || []).map(toUi);
}

export async function createSection({ class: cls, name, label }: SectionInput): Promise<void> {
  const { error } = await supabase.from("sections").insert({ class: cls, name, label: label || null });
  if (error) throw error;
}

export async function updateSection(id: string, { class: cls, name, label }: SectionInput): Promise<void> {
  const { error } = await supabase.from("sections").update({ class: cls, name, label: label || null }).eq("id", id);
  if (error) throw error;
}

export async function deleteSection(id: string): Promise<void> {
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (error) throw error;
}

const sectionsCache = makeCache<Section[]>([]);
export function useDbSections(enabled = true) {
  const { data, loading, error, reload } = sectionsCache.useCache("all", listSections, enabled);
  return { sections: data, loading, error, reload };
}

// Section name list for a class (the values stored on students/subjects/etc).
export const sectionNamesFor = (sections: Section[], cls: string): string[] => sections.filter(s => s.class === cls).map(s => s.name);

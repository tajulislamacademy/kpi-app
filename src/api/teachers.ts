// Teachers data access — Supabase (teachers slice).
// A teacher is a profiles row (role='teacher') joined 1:1 to a teachers row.
// class_teacher / subject_assignments are jsonb; guide_students is uuid[] of
// student profile ids. Writes require an authenticated admin session (RLS).
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { provisionAuthUser } from "./provision";
import { systemIdToEmail } from "./identity";
import type { Teacher, TeacherInput, TeacherUpdate } from "../types";

const toUi = (r: any): Teacher => ({
  id: r.id,
  systemId: r.profiles?.system_id,
  name: r.profiles?.name,
  nameEn: r.profiles?.name_en,
  authId: r.profiles?.auth_id,
  classTeacher: r.class_teacher,
  subjectAssignments: r.subject_assignments || [],
  guideStudents: r.guide_students || [],
});

export async function listTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from("teachers")
    .select("id, class_teacher, subject_assignments, guide_students, profiles(system_id, name, name_en, auth_id)");
  if (error) throw error;
  return (data || [])
    .map(toUi)
    .sort((a, b) => String(a.systemId).localeCompare(String(b.systemId)));
}

export async function createTeacher({ systemId, name, nameEn, password, classTeacher, subjectAssignments, guideStudents }: TeacherInput): Promise<string> {
  let authId: string | null = null;
  if (password) authId = await provisionAuthUser(systemIdToEmail(systemId), password);
  const { data: prof, error: e1 } = await supabase
    .from("profiles")
    .insert({ system_id: systemId, role: "teacher", name, name_en: nameEn || name, auth_id: authId })
    .select("id")
    .single();
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("teachers").insert({
    id: prof.id,
    class_teacher: classTeacher || null,
    subject_assignments: subjectAssignments || [],
    guide_students: guideStudents || [],
  });
  if (e2) {
    await supabase.from("profiles").delete().eq("id", prof.id);
    throw e2;
  }
  return prof.id;
}

// `password` (optional): reset an existing login via admin_set_password, or
// provision a new login for a login-less teacher (authId/systemId distinguish).
export async function updateTeacher(id: string, { name, nameEn, classTeacher, subjectAssignments, guideStudents, password, authId, systemId }: TeacherUpdate): Promise<void> {
  const { error: e1 } = await supabase.from("profiles").update({ name, name_en: nameEn || name }).eq("id", id);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("teachers")
    .update({
      class_teacher: classTeacher || null,
      subject_assignments: subjectAssignments || [],
      guide_students: guideStudents || [],
    })
    .eq("id", id);
  if (e2) throw e2;
  if (password) {
    if (authId) {
      const { error: e3 } = await supabase.rpc("admin_set_password", { p_profile_id: id, p_password: password });
      if (e3) throw e3;
    } else if (systemId) {
      const newAuthId = await provisionAuthUser(systemIdToEmail(systemId), password);
      const { error: e4 } = await supabase.from("profiles").update({ auth_id: newAuthId }).eq("id", id);
      if (e4) throw e4;
    }
  }
}

export async function deleteTeacher(id: string): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

export function useDbTeachers(enabled = true) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setTeachers(await listTeachers());
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
  return { teachers, loading, error, reload };
}

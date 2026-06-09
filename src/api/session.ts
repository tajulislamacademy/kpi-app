// Builds the in-app SessionUser from a profiles row, loading role-specific
// extras the app relies on: a teacher's class/subject/guide assignments (in the
// teachers table, not profiles), a student's class/section/roll, a parent's
// child + approval status. Shared by the login flow (Auth) and the on-mount
// session re-validation (App).
import { supabase } from "../supabase";
import { capsFor } from "../permissions";
import type { Lang, SessionUser } from "../types";

export async function loadSessionUser(prof: any, lang: Lang): Promise<SessionUser> {
  const base: SessionUser = { id: prof.id, systemId: prof.system_id, name: lang === "bn" ? prof.name : prof.name_en, nameEn: prof.name_en, role: prof.role, isRoot: prof.is_root, isAdmin: prof.role === "admin" || !!prof.is_admin, permissions: capsFor({ isRoot: prof.is_root, role: prof.role, isAdmin: prof.is_admin, permissions: prof.permissions }), backend: true };
  if (prof.role === "teacher") {
    const { data: tc } = await supabase.from("teachers").select("class_teacher,subject_assignments,guide_students,deleted_at").eq("id", prof.id).maybeSingle();
    if (tc) return { ...base, classTeacher: tc.class_teacher, subjectAssignments: tc.subject_assignments || [], guideStudents: tc.guide_students || [], isDeleted: !!tc.deleted_at };
  }
  if (prof.role === "student") {
    const { data: st } = await supabase.from("students").select("class,section,roll,deleted_at").eq("id", prof.id).maybeSingle();
    if (st) return { ...base, class: st.class, section: st.section, roll: st.roll, isDeleted: !!st.deleted_at };
  }
  if (prof.role === "parent") {
    const { data: pr } = await supabase.from("parents").select("student_id,relation,status,deleted_at").eq("id", prof.id).maybeSingle();
    if (pr) return { ...base, studentId: pr.student_id, relation: pr.relation, status: pr.status, isDeleted: !!pr.deleted_at };
  }
  return base;
}

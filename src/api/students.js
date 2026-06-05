// Students data access — Supabase (Phase 3, students slice).
// A student is a `profiles` row (role='student') joined 1:1 to a `students` row.
// Writes require an authenticated admin session (enforced by RLS).
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { provisionAuthUser } from "./provision";
import { systemIdToEmail } from "./identity";

// Shape returned to the UI mirrors the old localStorage student object
// ({ id, systemId, name, nameEn, class, section, roll }) so consumers barely change.
const toUi = (r) => ({
  id: r.id,
  systemId: r.profiles?.system_id,
  name: r.profiles?.name,
  nameEn: r.profiles?.name_en,
  class: r.class,
  section: r.section,
  roll: r.roll,
});

export async function listStudents() {
  const { data, error } = await supabase
    .from("students")
    .select("id, class, section, roll, profiles(system_id, name, name_en)");
  if (error) throw error;
  return (data || [])
    .map(toUi)
    .sort((a, b) => String(a.systemId).localeCompare(String(b.systemId)));
}

// Creates a student. If `password` is given, first provisions a login account
// (auth user) and links it via auth_id, so the student can sign in. Without a
// password the student is a login-less record (auth_id stays null).
// Two dependent inserts: profile first (returns uuid), then student detail.
// Roll back the profile if the student insert fails, so no orphan profile remains.
export async function createStudent({ systemId, name, nameEn, cls, section, roll, password }) {
  let authId = null;
  if (password) {
    authId = await provisionAuthUser(systemIdToEmail(systemId), password);
  }
  const { data: prof, error: e1 } = await supabase
    .from("profiles")
    .insert({ system_id: systemId, role: "student", name, name_en: nameEn || name, auth_id: authId })
    .select("id")
    .single();
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("students")
    .insert({ id: prof.id, class: cls, section: section || null, roll: roll || null });
  if (e2) {
    await supabase.from("profiles").delete().eq("id", prof.id);
    throw e2;
  }
  return prof.id;
}

export async function updateStudent(id, { name, nameEn, cls, section, roll }) {
  const { error: e1 } = await supabase
    .from("profiles")
    .update({ name, name_en: nameEn || name })
    .eq("id", id);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("students")
    .update({ class: cls, section: section || null, roll: roll || null })
    .eq("id", id);
  if (e2) throw e2;
}

// Deleting the profile cascades to the students row (FK on delete cascade).
export async function deleteStudent(id) {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

// Hook: load students once, expose a reload(). `enabled` gates the fetch until
// an admin session exists (RLS would otherwise return zero rows).
export function useDbStudents(enabled = true) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setStudents(await listStudents());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);
  useEffect(() => {
    // Intentional fetch-on-mount; reload() owns its own loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);
  return { students, loading, error, reload };
}

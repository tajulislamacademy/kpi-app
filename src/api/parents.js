// Parents data access — Supabase (parents slice).
// A parent is a profiles row (role='parent') linked to one student, with an
// approval status that gates login. Writes are admin-only (RLS).
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { provisionAuthUser } from "./provision";
import { systemIdToEmail } from "./identity";

const toUi = (r) => ({
  id: r.id,
  systemId: r.profiles?.system_id,
  name: r.profiles?.name,
  nameEn: r.profiles?.name_en,
  authId: r.profiles?.auth_id,
  studentId: r.student_id,
  relation: r.relation,
  status: r.status,
});

export async function listParents() {
  const { data, error } = await supabase
    .from("parents")
    .select("id, student_id, relation, status, profiles(system_id, name, name_en, auth_id)");
  if (error) throw error;
  return (data || []).map(toUi).sort((a, b) => String(a.systemId).localeCompare(String(b.systemId)));
}

export async function createParent({ systemId, name, nameEn, password, studentId, relation, status }) {
  let authId = null;
  if (password) authId = await provisionAuthUser(systemIdToEmail(systemId), password);
  const { data: prof, error: e1 } = await supabase
    .from("profiles")
    .insert({ system_id: systemId, role: "parent", name, name_en: nameEn || name, auth_id: authId })
    .select("id")
    .single();
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("parents")
    .insert({ id: prof.id, student_id: studentId || null, relation, status: status || "approved" });
  if (e2) {
    await supabase.from("profiles").delete().eq("id", prof.id);
    throw e2;
  }
  return prof.id;
}

export async function updateParent(id, { name, nameEn, relation, status, password, authId, systemId }) {
  const { error: e1 } = await supabase.from("profiles").update({ name, name_en: nameEn || name }).eq("id", id);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("parents").update({ relation, status }).eq("id", id);
  if (e2) throw e2;
  if (password) {
    if (authId) {
      const { error: e3 } = await supabase.rpc("admin_set_password", { p_profile_id: id, p_password: password });
      if (e3) throw e3;
    } else {
      const newAuthId = await provisionAuthUser(systemIdToEmail(systemId), password);
      const { error: e4 } = await supabase.from("profiles").update({ auth_id: newAuthId }).eq("id", id);
      if (e4) throw e4;
    }
  }
}

export async function setParentStatus(id, status) {
  const { error } = await supabase.from("parents").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteParent(id) {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

export function useDbParents(enabled = true) {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setParents(await listParents());
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
  return { parents, loading, error, reload };
}

// Parents data access — Supabase (parents slice).
// A parent is a profiles row (role='parent') linked to one student, with an
// approval status that gates login. Writes are admin-only (RLS).
import { useMemo } from "react";
import { supabase } from "../supabase";
import { makeCache } from "./cache";
import { provisionAuthUser } from "./provision";
import { systemIdToEmail } from "./identity";
import type { Parent, ParentInput, ParentUpdate, ParentStatus } from "../types";

const toUi = (r: any): Parent => ({
  id: r.id,
  systemId: r.profiles?.system_id,
  name: r.profiles?.name,
  nameEn: r.profiles?.name_en,
  authId: r.profiles?.auth_id,
  studentId: r.student_id,
  relation: r.relation,
  status: r.status,
  deletedAt: r.deleted_at ?? null,
});

export async function listParents(withTrash = false): Promise<Parent[]> {
  const base = "id, student_id, relation, status, profiles(system_id, name, name_en, auth_id)";
  let { data, error } = await supabase.from("parents").select(`deleted_at, ${base}`);
  if (error && /deleted_at/i.test(error.message || "")) ({ data, error } = await supabase.from("parents").select(base));
  if (error) throw error;
  let rows = (data || []).map(toUi);
  if (!withTrash) rows = rows.filter(p => !p.deletedAt);
  return rows.sort((a, b) => String(a.systemId).localeCompare(String(b.systemId)));
}

export async function softDeleteParent(id: string): Promise<void> {
  const { error } = await supabase.from("parents").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
export async function restoreParent(id: string): Promise<void> {
  const { error } = await supabase.from("parents").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function createParent({ systemId, name, nameEn, password, studentId, relation, status }: ParentInput): Promise<string> {
  let authId: string | null = null;
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

export async function updateParent(id: string, { name, nameEn, relation, status, studentId, password, authId, systemId }: ParentUpdate): Promise<void> {
  const { error: e1 } = await supabase.from("profiles").update({ name, name_en: nameEn || name }).eq("id", id);
  if (e1) throw e1;
  const parentPatch: Record<string, unknown> = { relation, status };
  if (studentId !== undefined) parentPatch.student_id = studentId || null;
  const { error: e2 } = await supabase.from("parents").update(parentPatch).eq("id", id);
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

export async function setParentStatus(id: string, status: ParentStatus): Promise<void> {
  const { error } = await supabase.from("parents").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteParent(id: string): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

const parentsCache = makeCache<Parent[]>([]);
export function useDbParents(enabled = true, withTrash = false) {
  const { data, loading, error, reload } = parentsCache.useCache("all", () => listParents(true), enabled);
  const parents = useMemo(() => withTrash ? data : data.filter(p => !p.deletedAt), [data, withTrash]);
  return { parents, loading, error, reload };
}

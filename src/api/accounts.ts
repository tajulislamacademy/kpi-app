// Cross-role account & access management (admin console).
// Reads every profiles row regardless of role and exposes the access operations
// that are identical for all roles: promote/demote admin, grant/revoke login,
// reset password, delete. Entity-specific fields (class, assignments, child)
// stay in the domain pages. Admin-only by RLS (migration 0011).
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { provisionAuthUser } from "./provision";
import { systemIdToEmail } from "./identity";

export interface Account {
  id: string;
  systemId: string;
  name: string;
  nameEn: string;
  role: string;
  hasLogin: boolean;
  isAdmin: boolean;
  isRoot: boolean;
  parentStatus: string | null; // parents only
}

export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, system_id, name, name_en, role, auth_id, is_admin, is_root, parents(status)");
  if (error) throw error;
  return (data || [])
    .map((r: any): Account => ({
      id: r.id,
      systemId: r.system_id,
      name: r.name,
      nameEn: r.name_en,
      role: r.role,
      hasLogin: !!r.auth_id,
      isAdmin: !!r.is_admin,
      isRoot: !!r.is_root,
      parentStatus: Array.isArray(r.parents) ? (r.parents[0]?.status ?? null) : (r.parents?.status ?? null),
    }))
    .sort((a, b) => String(a.systemId).localeCompare(String(b.systemId)));
}

// Promote/demote admin. Root admin is protected at the DB level (trigger).
export async function setAdmin(profileId: string, value: boolean): Promise<void> {
  const { error } = await supabase.from("profiles").update({ is_admin: value }).eq("id", profileId);
  if (error) throw error;
}

// Give a login-less account a login (provisions an auth user + links it).
export async function grantLogin(profileId: string, systemId: string, password: string): Promise<void> {
  const authId = await provisionAuthUser(systemIdToEmail(systemId), password);
  const { error } = await supabase.from("profiles").update({ auth_id: authId }).eq("id", profileId);
  if (error) throw error;
}

// Disable app login by unlinking the auth account (login resolves by auth_id).
// The orphan auth user is left behind; full deletion needs a service-role step.
export async function revokeLogin(profileId: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ auth_id: null }).eq("id", profileId);
  if (error) throw error;
}

export async function resetPassword(profileId: string, password: string): Promise<void> {
  const { error } = await supabase.rpc("admin_set_password", { p_profile_id: profileId, p_password: password });
  if (error) throw error;
}

export async function deleteAccount(profileId: string): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", profileId);
  if (error) throw error;
}

export function useDbAccounts(enabled = true) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setAccounts(await listAccounts());
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
  return { accounts, loading, error, reload };
}

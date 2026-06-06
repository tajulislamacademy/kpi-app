// Single source of truth for system_id -> auth email mapping (Auth Option B).
//
// Supabase's signUp() rejects non-routable TLDs like ".local", so login-capable
// users created from the app use a valid TLD domain. The root admin was created
// in the dashboard as admin@kpi.local (which bypasses that validation) and keeps
// working, so it stays special-cased here.
export const EMAIL_DOMAIN = "kpiapp.com";

export function systemIdToEmail(id: string): string {
  const v = (id || "").trim();
  if (!v) return "";
  if (v.includes("@")) return v.toLowerCase();                 // already a full email
  if (v.toLowerCase() === "admin" || v.toUpperCase() === "ADM-20260001") return "admin@kpi.local";
  return v.toLowerCase() + "@" + EMAIL_DOMAIN;
}

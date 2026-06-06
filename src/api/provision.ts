// Auth provisioning — how the admin dashboard creates login-capable accounts.
// In production every account is born here: admin fills a form, we create a
// Supabase Auth user + a profiles row. This is the Option-B backbone.
//
// Uses a SECONDARY Supabase client so signUp() does NOT replace the admin's
// own session on the main client. No service_role key, no Edge Function, no CLI.
//
// PREREQUISITE: project email confirmation must be OFF (Authentication →
// Sign In / Providers → Email → "Confirm email" = off). Our emails are
// synthetic (@kpi.local) and have no inbox, so confirmation can never arrive.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const provisionClient = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, storageKey: "kpi-provision" },
});

// Creates an auth account and returns its uuid. Throws on failure.
export async function provisionAuthUser(email: string, password: string): Promise<string> {
  const { data, error } = await provisionClient.auth.signUp({ email, password });
  // Clear the throwaway session this signUp may have created on the 2nd client.
  await provisionClient.auth.signOut().catch(() => {});
  if (error) throw error;
  if (!data?.user) throw new Error("signUp returned no user (email confirmation may be ON)");
  return data.user.id;
}

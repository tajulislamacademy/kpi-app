// Capability keys + the `can()` check for limited-permission admins.
// A capability is "<resource>.<action>" (e.g. "students.create") or an area key
// (e.g. "point_entry"). Root and dedicated role='admin' implicitly hold ALL caps;
// a promoted admin holds exactly profiles.permissions.
import type { SessionUser } from "./types";

export const RESOURCES = ["students", "teachers", "parents", "questions"] as const;
export const ACTIONS = ["view", "create", "edit", "soft_delete", "force_delete", "restore"] as const;
export const AREAS = ["point_entry", "teacher_kpi", "parent_kpi", "reports.view", "settings.edit", "accounts.manage", "admins.manage"] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];

export const ALL_CAPS: string[] = [
  ...RESOURCES.flatMap((r) => ACTIONS.map((a) => `${r}.${a}`)),
  ...AREAS,
];

// Permissions a session should carry, given the raw profile flags.
export function capsFor(opts: { isRoot?: boolean; role?: string | null; isAdmin?: boolean; permissions?: string[] | null }): string[] {
  if (opts.isRoot || opts.role === "admin") return ALL_CAPS;
  if (opts.isAdmin) return opts.permissions || [];
  return [];
}

export function can(user: SessionUser | null | undefined, cap: string): boolean {
  if (!user) return false;
  if (user.isRoot || user.role === "admin") return true;
  return (user.permissions || []).includes(cap);
}

// Centralized badge-colour + label maps for the role / status / relation enums.
// Previously these were copy-pasted (and drifting) across PointEntry, Questions,
// KpiDetails, Accounts, Parents, Dashboards, Students. One source of truth here.
import type { Dict } from "./types";

// --- Teacher entry role (classTeacher | subjectTeacher | guideTeacher) -------
export const teacherRoleBadge = (r?: string | null): string =>
  r === "classTeacher" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    : r === "subjectTeacher" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
export const teacherRoleLabel = (t: Dict, r?: string | null): string =>
  r === "classTeacher" ? t.classTeacher : r === "subjectTeacher" ? t.subjectTeacher : r === "guideTeacher" ? t.guideTeacher : "—";

// --- Account role (admin | teacher | student | parent) -----------------------
export const accountRoleBadge = (role: string): string =>
  role === "admin" ? "bg-primary/15 text-primary"
    : role === "teacher" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
      : role === "student" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
        : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
export const accountRoleLabel = (t: Dict, r: string): string =>
  r === "admin" ? t.admin : r === "teacher" ? t.teacher : r === "student" ? t.student : t.parent;

// --- Parent approval status (approved | rejected | pending) ------------------
export const parentStatusBadge = (s: string): string =>
  s === "approved" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    : s === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
export const parentStatusLabel = (t: Dict, s: string): string =>
  s === "approved" ? t.approved : s === "rejected" ? t.rejected : t.pending;

// --- Parent relation (father | mother | guardian) ----------------------------
export const relationLabel = (t: Dict, r?: string | null): string =>
  r === "father" ? t.father : r === "mother" ? t.mother : r === "guardian" ? t.guardian : "—";

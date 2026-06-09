// Small pure helpers shared across the app.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merge helper (shadcn convention). Combines clsx conditionals
// with tailwind-merge so later utility classes win over earlier conflicting ones.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Safe message from an unknown catch value (strict mode types catch vars unknown).
export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// Strong random temp password for a freshly provisioned account — replaces the
// old fixed "123456" so every account is born with a unique, non-guessable
// secret the admin can reveal/share (ambiguous chars 0/O/1/l/I omitted).
export const genPassword = (len = 10): string => {
  const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const a = crypto.getRandomValues(new Uint32Array(len));
  return Array.from(a, (x) => c[x % c.length]).join("");
};

export const genId = (prefix: string, year: number | undefined, seq: number): string =>
  `${prefix}-${year || new Date().getFullYear()}${String(seq).padStart(4, "0")}`;

// Next sequential system id for a list, derived from the MAX existing suffix
// (not array length) so it survives deletions. e.g. nextSystemId("STD", students).
export const nextSystemId = (prefix: string, rows: { systemId?: string | null }[]): string => {
  const max = rows.reduce((m, r) => { const n = parseInt(String(r.systemId || "").split("-")[1]?.slice(4) ?? "") || 0; return Math.max(m, n); }, 0);
  return genId(prefix, new Date().getFullYear(), max + 1);
};

export const getWeekNumber = (dateStr: string): number => {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
};

// Minimal shape freqDone reads off a KPI entry (callers pass richer objects).
type FreqEntry = { targetId: string; questionId: string | null; date: string; year: number; month: number };

// True if one entry falls in the question's frequency period containing dateStr.
// Shared by freqDone (teacher/parent, keyed by targetId) and PointEntry's
// student check (keyed by studentId) so the period logic can't drift.
export const inSamePeriod = (e: { date: string; year: number; month: number }, frequency: string | undefined, dateStr: string): boolean => {
  const freq = frequency || "monthly";
  const d = new Date(dateStr), year = d.getFullYear(), month = d.getMonth(), week = getWeekNumber(dateStr);
  switch (freq) {
    case "daily": return e.date === dateStr;
    case "weekly": return getWeekNumber(e.date) === week && e.year === year;
    case "quarterly": return Math.floor(new Date(e.date).getMonth() / 3) === Math.floor(month / 3) && e.year === year;
    case "annual": return e.year === year;
    default: return e.month === month && e.year === year;
  }
};

// True if an entry for (targetId, questionId) already exists within the
// question's frequency period containing dateStr.
export const freqDone = (entries: FreqEntry[], targetId: string, questionId: string, frequency: string | undefined, dateStr: string): boolean =>
  entries.some((e) => e.targetId === targetId && e.questionId === questionId && inSamePeriod(e, frequency, dateStr));

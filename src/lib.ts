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

// True if an entry for (targetId, questionId) already exists within the
// question's frequency period containing dateStr. For teacher/parent KPI entries
// keyed by `targetId` (PointEntryPage has the student variant inline).
export const freqDone = (entries: FreqEntry[], targetId: string, questionId: string, frequency: string | undefined, dateStr: string): boolean => {
  const freq = frequency || "monthly";
  const d = new Date(dateStr), year = d.getFullYear(), month = d.getMonth(), week = getWeekNumber(dateStr);
  return entries.some((e) => {
    if (e.targetId !== targetId || e.questionId !== questionId) return false;
    const eYear = e.year;
    switch (freq) {
      case "daily": return e.date === dateStr;
      case "weekly": return getWeekNumber(e.date) === week && eYear === year;
      case "quarterly": return Math.floor(new Date(e.date).getMonth() / 3) === Math.floor(month / 3) && eYear === year;
      case "annual": return eYear === year;
      default: return e.month === month && eYear === year;
    }
  });
};

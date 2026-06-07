import { describe, it, expect } from "vitest";
import { studentKpiHelpers, targetKpiHelpers } from "./entries";
import type { StudentEntry, TargetEntry } from "../types";

const se = (studentId: string, month: number, score: number, year = 2026): StudentEntry =>
  ({ id: `${studentId}-${month}-${score}`, studentId, teacherId: null, date: "2026-01-01", questionId: "q", score, month, year, role: null, subject: null, editLog: [] });

const te = (targetId: string, month: number, score: number, year = 2026): TargetEntry =>
  ({ id: `${targetId}-${month}-${score}`, targetId, date: "2026-01-01", questionId: "q", score, month, year, editLog: [] });

describe("studentKpiHelpers", () => {
  const { monthKPI, termKPI, yearKPI } = studentKpiHelpers([se("s1", 5, 10), se("s1", 5, 5), se("s1", 6, 3), se("s2", 5, 100)]);
  it("monthKPI sums a student's scores for that month+year", () => {
    expect(monthKPI("s1", 5, 2026)).toBe(15);
    expect(monthKPI("s2", 5, 2026)).toBe(100);
    expect(monthKPI("s1", 5, 2025)).toBe(0);
  });
  it("termKPI sums across the given months", () => {
    expect(termKPI("s1", [5, 6], 2026)).toBe(18);
  });
  it("yearKPI sums all 12 months", () => {
    expect(yearKPI("s1", 2026)).toBe(18);
  });
});

describe("targetKpiHelpers", () => {
  const { monthKPI, termKPI, yearKPI } = targetKpiHelpers([te("a", 0, 7), te("a", 0, 3), te("b", 1, 5)]);
  it("aggregates by targetId", () => {
    expect(monthKPI("a", 0, 2026)).toBe(10);
    expect(monthKPI("b", 1, 2026)).toBe(5);
    expect(termKPI("a", [0, 1], 2026)).toBe(10);
    expect(yearKPI("a", 2026)).toBe(10);
  });
});

import { describe, it, expect } from "vitest";
import { genId, getWeekNumber, freqDone, errMsg } from "./lib";

describe("genId", () => {
  it("formats prefix-year + 4-digit zero-padded sequence", () => {
    expect(genId("STD", 2026, 1)).toBe("STD-20260001");
    expect(genId("TCH", 2026, 12)).toBe("TCH-20260012");
    expect(genId("PAR", 2026, 1234)).toBe("PAR-20261234");
  });
});

describe("getWeekNumber", () => {
  it("returns week 1 for Jan 1", () => {
    expect(getWeekNumber("2026-01-01")).toBe(1);
  });
  it("gives the same week for dates in the same week and differs across weeks", () => {
    expect(getWeekNumber("2026-06-10")).toBe(getWeekNumber("2026-06-11"));
    expect(getWeekNumber("2026-06-10")).not.toBe(getWeekNumber("2026-07-10"));
  });
});

describe("freqDone", () => {
  const entries = [{ targetId: "t1", questionId: "q1", date: "2026-06-10", year: 2026, month: 5 }];
  it("monthly: done within same month+year, not other months", () => {
    expect(freqDone(entries, "t1", "q1", "monthly", "2026-06-20")).toBe(true);
    expect(freqDone(entries, "t1", "q1", "monthly", "2026-07-20")).toBe(false);
  });
  it("daily: done only on the exact same date", () => {
    expect(freqDone(entries, "t1", "q1", "daily", "2026-06-10")).toBe(true);
    expect(freqDone(entries, "t1", "q1", "daily", "2026-06-11")).toBe(false);
  });
  it("false for a different target or question", () => {
    expect(freqDone(entries, "t2", "q1", "monthly", "2026-06-20")).toBe(false);
    expect(freqDone(entries, "t1", "q2", "monthly", "2026-06-20")).toBe(false);
  });
});

describe("errMsg", () => {
  it("uses Error.message, else stringifies", () => {
    expect(errMsg(new Error("boom"))).toBe("boom");
    expect(errMsg("plain")).toBe("plain");
    expect(errMsg(42)).toBe("42");
  });
});

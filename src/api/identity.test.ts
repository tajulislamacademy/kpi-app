import { describe, it, expect } from "vitest";
import { systemIdToEmail } from "./identity";

describe("systemIdToEmail", () => {
  it("special-cases the root admin", () => {
    expect(systemIdToEmail("admin")).toBe("admin@kpi.local");
    expect(systemIdToEmail("ADM-20260001")).toBe("admin@kpi.local");
  });
  it("maps student/teacher ids to the app domain (lowercased)", () => {
    expect(systemIdToEmail("STD-20260001")).toBe("std-20260001@kpiapp.com");
    expect(systemIdToEmail("TCH-20260002")).toBe("tch-20260002@kpiapp.com");
  });
  it("passes a full email through (lowercased)", () => {
    expect(systemIdToEmail("Foo@Bar.com")).toBe("foo@bar.com");
  });
  it("returns empty for blank input", () => {
    expect(systemIdToEmail("")).toBe("");
    expect(systemIdToEmail("   ")).toBe("");
  });
});

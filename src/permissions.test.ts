import { describe, it, expect } from "vitest";
import { capsFor, can, ALL_CAPS } from "./permissions";
import type { SessionUser } from "./types";

const user = (o: Partial<SessionUser>): SessionUser => ({ id: "x", systemId: "X", name: "n", nameEn: "n", role: "teacher", backend: true, ...o });

describe("capsFor", () => {
  it("root gets every capability", () => {
    expect(capsFor({ isRoot: true })).toEqual(ALL_CAPS);
  });
  it("dedicated role=admin gets every capability", () => {
    expect(capsFor({ role: "admin" })).toEqual(ALL_CAPS);
  });
  it("promoted admin gets exactly its permissions", () => {
    expect(capsFor({ isAdmin: true, permissions: ["students.view", "point_entry"] })).toEqual(["students.view", "point_entry"]);
  });
  it("promoted admin with no permissions gets none", () => {
    expect(capsFor({ isAdmin: true, permissions: null })).toEqual([]);
  });
  it("a plain user gets none", () => {
    expect(capsFor({ role: "teacher" })).toEqual([]);
    expect(capsFor({ role: "student" })).toEqual([]);
  });
  it("root/admin outrank an empty permissions list", () => {
    expect(capsFor({ isRoot: true, permissions: [] })).toEqual(ALL_CAPS);
    expect(capsFor({ role: "admin", isAdmin: false, permissions: [] })).toEqual(ALL_CAPS);
  });
});

describe("can", () => {
  it("is false for no user", () => {
    expect(can(null, "students.view")).toBe(false);
    expect(can(undefined, "students.view")).toBe(false);
  });
  it("root and role=admin can do anything", () => {
    expect(can(user({ role: "admin" }), "accounts.manage")).toBe(true);
    expect(can(user({ isRoot: true, role: "teacher" }), "admins.manage")).toBe(true);
  });
  it("promoted admin can only do held capabilities", () => {
    const u = user({ role: "teacher", isAdmin: true, permissions: ["students.view"] });
    expect(can(u, "students.view")).toBe(true);
    expect(can(u, "students.create")).toBe(false);
    expect(can(u, "accounts.manage")).toBe(false);
  });
  it("a plain user holds nothing", () => {
    expect(can(user({ role: "teacher" }), "point_entry")).toBe(false);
    expect(can(user({ role: "student", permissions: [] }), "students.view")).toBe(false);
  });
});

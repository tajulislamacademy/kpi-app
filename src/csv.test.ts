import { describe, it, expect } from "vitest";
import { toCSV, parseCSV } from "./csv";

describe("toCSV", () => {
  it("quotes fields containing comma, quote, or newline", () => {
    const csv = toCSV(["a", "b"], [["x,y", 'he said "hi"'], ["line\n2", 1]]);
    expect(csv).toBe('a,b\r\n"x,y","he said ""hi"""\r\n"line\n2",1');
  });
  it("leaves plain fields unquoted and blanks empty", () => {
    expect(toCSV(["a", "b"], [["plain", null], ["", undefined]])).toBe("a,b\r\nplain,\r\n,");
  });
});

describe("parseCSV", () => {
  it("parses a header + rows into keyed objects", () => {
    const rows = parseCSV("name,roll\nAli,1\nBabu,2");
    expect(rows).toEqual([{ name: "Ali", roll: "1" }, { name: "Babu", roll: "2" }]);
  });
  it("handles quoted commas, escaped quotes, and trims cells", () => {
    const rows = parseCSV('name,note\r\n"Ali, Jr","say ""hi"""\r\n  Babu , ok ');
    expect(rows).toEqual([{ name: "Ali, Jr", note: 'say "hi"' }, { name: "Babu", note: "ok" }]);
  });
  it("strips a leading BOM and ignores blank lines", () => {
    const rows = parseCSV("﻿name\nAli\n\n\nBabu\n");
    expect(rows).toEqual([{ name: "Ali" }, { name: "Babu" }]);
  });
  it("returns [] for empty input", () => {
    expect(parseCSV("")).toEqual([]);
    expect(parseCSV("\n  \n")).toEqual([]);
  });
});

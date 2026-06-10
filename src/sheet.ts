// Excel (.xlsx) read/write helpers for bulk import/export, via SheetJS. Kept
// behind the (lazy-loaded) admin pages so the library isn't in the initial bundle.
import * as XLSX from "xlsx";

// Build a one-sheet workbook from a header + rows and trigger a .xlsx download.
export function downloadSheet(filename: string, header: string[], rows: (string | number | null | undefined)[][]): void {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

// Read the first sheet of an .xlsx/.xls file into objects keyed by the header
// row, every cell coerced to a trimmed string.
export async function parseSheet(file: File): Promise<Record<string, string>[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
  return rows.map((r) => {
    const o: Record<string, string> = {};
    for (const k of Object.keys(r)) o[String(k).trim()] = String(r[k] ?? "").trim();
    return o;
  });
}

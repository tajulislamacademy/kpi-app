import type { Lang } from "../types";

interface Props { lang: Lang; selectedYear: number; setSelectedYear: (y: number) => void; availableYears: number[]; }

export function YearSelector({ lang, selectedYear, setSelectedYear, availableYears }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 10, padding: "8px 14px" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>📅 {lang === "bn" ? "বছর" : "Year"}:</span>
      <select style={{ border: "none", background: "transparent", fontSize: 15, fontWeight: 800, color: "var(--foreground)", outline: "none", cursor: "pointer" }} value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
        {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

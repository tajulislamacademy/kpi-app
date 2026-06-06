import { S } from "../theme";

// Four term cards (term1..term4). getTermKPI(id, months, year) supplies each value.
export function TermBreakdown({ t, lang, termConfig, selectedYear, getTermKPI, id }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
      {["term1", "term2", "term3", "term4"].map(term => (
        <div key={term} style={{ ...S.card, textAlign: "center", padding: 14 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{t[term]}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{getTermKPI(id, termConfig[term], selectedYear)}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{lang === "bn" ? "পয়েন্ট" : "pts"}</div>
        </div>
      ))}
    </div>
  );
}

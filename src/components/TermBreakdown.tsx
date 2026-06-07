import { S } from "../theme";
import type { Dict, Lang, TermConfig } from "../types";

interface Props {
  t: Dict;
  lang: Lang;
  termConfig: TermConfig;
  selectedYear: number;
  getTermKPI: (id: string, months: number[], year: number) => number;
  id: string;
}

// Four term cards (term1..term4). getTermKPI(id, months, year) supplies each value.
export function TermBreakdown({ t, lang, termConfig, selectedYear, getTermKPI, id }: Props) {
  const terms: (keyof TermConfig)[] = ["term1", "term2", "term3", "term4"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
      {terms.map((term) => (
        <div key={term} style={{ ...S.card, textAlign: "center", padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>{t[term]}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>{getTermKPI(id, termConfig[term], selectedYear)}</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{lang === "bn" ? "পয়েন্ট" : "pts"}</div>
        </div>
      ))}
    </div>
  );
}

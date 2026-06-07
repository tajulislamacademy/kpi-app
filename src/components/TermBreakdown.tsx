import { Card, CardContent } from "./ui/card";
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {terms.map((term) => (
        <Card key={term} className="py-0 text-center">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{t[term]}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{getTermKPI(id, termConfig[term], selectedYear)}</div>
            <div className="text-xs text-muted-foreground">{lang === "bn" ? "পয়েন্ট" : "pts"}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { cn } from "../lib";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { Dict, Lang, Student } from "../types";

type RankRow = Student & { kpi: number };
interface Props { title: string; list: RankRow[]; lang: Lang; t: Dict; }

export function RankCard({ title, list, lang, t }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="pt-0">
        {list.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 border-b border-border/50 py-2 last:border-0">
            <div className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
              i === 0 ? "bg-amber-400 text-amber-950" : i === 1 ? "bg-slate-300 text-slate-800" : i === 2 ? "bg-orange-300 text-orange-950" : "bg-muted text-muted-foreground",
            )}>{i + 1}</div>
            <div className="flex-1 truncate text-sm font-medium text-foreground">{lang === "bn" ? s.name : s.nameEn}</div>
            <div className="text-xs text-muted-foreground">{t.class} {s.class}{s.section}</div>
            <div className="text-sm font-bold tabular-nums text-foreground">{s.kpi}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

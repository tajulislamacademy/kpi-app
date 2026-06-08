import { CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { Lang } from "../types";

interface Props { lang: Lang; selectedYear: number; setSelectedYear: (y: number) => void; availableYears: number[]; }

export function YearSelector({ lang, selectedYear, setSelectedYear, availableYears }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-semibold text-foreground">{lang === "bn" ? "বছর" : "Year"}:</span>
      <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
        <SelectTrigger size="sm" className="h-8 w-20 border-0 bg-transparent font-bold shadow-none focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{availableYears.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

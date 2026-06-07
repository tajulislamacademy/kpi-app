import type { CSSProperties } from "react";
import { cn } from "../lib";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import type { Lang } from "../types";

interface Props { lang: Lang; value: number[]; onToggle: (i: number) => void; style?: CSSProperties; }

// Toggleable 12-month grid. value = array of active month indexes; onToggle(i).
export function MonthsPicker({ lang, value, onToggle, style }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5" style={style}>
      {MONTHS.map((m, i) => (
        <button
          key={m}
          type="button"
          onClick={() => onToggle(i)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            value.includes(i)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {T[lang][m].slice(0, 3)}
        </button>
      ))}
    </div>
  );
}

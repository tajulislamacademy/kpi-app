import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib";

interface TabItem { key: string; label: ReactNode; show?: boolean; }
interface Props { items: TabItem[]; active: string; onChange: (key: string) => void; style?: CSSProperties; }

// Pill tab row. items: [{key,label}]. onChange(key) handles selection.
export function Tabs({ items, active, onChange, style }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5" style={style}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            active === it.key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

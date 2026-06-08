import type { ReactNode } from "react";

interface Props { icon: ReactNode; value: ReactNode; label: ReactNode; }

// Compact metric card. `icon` is rendered in a tinted chip (pass a lucide icon
// element). `value` uses tabular-nums so numbers align across a grid.
export function StatCard({ icon, value, label }: Props) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5">{icon}</div>
      <div className="truncate text-2xl font-extrabold tabular-nums text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

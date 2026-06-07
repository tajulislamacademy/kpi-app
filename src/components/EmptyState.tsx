import type { LucideIcon } from "lucide-react";

interface Props { icon?: LucideIcon; title: string; hint?: string; }

// Centered empty-state placeholder (muted icon + message). Use inside cards/tables
// when there is no data to show.
export function EmptyState({ icon: Icon, title, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/50" />}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {hint && <p className="max-w-sm text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

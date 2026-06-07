import type { ReactNode } from "react";
import { cn } from "../lib";

// Standard page shell: centers content, unifies max-width, padding and vertical
// rhythm. width="data" for tables/dashboards, "form" for single-column forms.
export function Page({ children, width = "data", className }: { children: ReactNode; width?: "data" | "form"; className?: string }) {
  return (
    <div className={cn("mx-auto w-full space-y-6 px-4 py-6 sm:px-6", width === "form" ? "max-w-2xl" : "max-w-6xl", className)}>
      {children}
    </div>
  );
}

// Page title + optional subtitle + optional action (button / year selector).
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

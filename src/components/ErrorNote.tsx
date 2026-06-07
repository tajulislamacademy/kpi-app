import type { Lang } from "../types";

interface Props { lang: Lang; error?: string | null; }

// Inline "data load failed" banner. Renders nothing when error is falsy, so
// callers can drop it in unconditionally: <ErrorNote lang={lang} error={err} />.
export function ErrorNote({ lang, error }: Props) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
      {(lang === "bn" ? "ডেটা লোড ব্যর্থ: " : "Load failed: ") + error}
    </div>
  );
}

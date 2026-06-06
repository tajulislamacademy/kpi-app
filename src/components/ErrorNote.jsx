// Inline "data load failed" banner. Renders nothing when error is falsy, so
// callers can drop it in unconditionally: <ErrorNote lang={lang} error={err} />.
export function ErrorNote({ lang, error }) {
  if (!error) return null;
  return <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>{(lang === "bn" ? "ডেটা লোড ব্যর্থ: " : "Load failed: ") + error}</div>;
}

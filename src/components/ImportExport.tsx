import { useRef, useState } from "react";
import { Download, Upload, FileText } from "lucide-react";
import { genId } from "../lib";
import { downloadSheet, parseSheet } from "../sheet";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import type { Dict, Lang } from "../types";

export interface ImportExportConfig {
  filename: string;                                              // "students"
  prefix: string;                                               // "STD"
  exportHeader: string[];
  toExportRow: (r: any) => (string | number | null | undefined)[];
  importHeader: string[];                                       // expected columns
  templateExample: string[];                                    // one sample row (aligned to importHeader)
  existing: any[];                                              // current rows: systemId seq + dedupe
  rowKey?: (r: any) => string;                                  // existing row → dedupe key
  importRowKey?: (row: Record<string, string>) => string;       // import row → same key space
  validate: (row: Record<string, string>) => string | null;    // null = ok, else reason
  create: (row: Record<string, string>, systemId: string) => Promise<void>;
}

interface Props { t: Dict; lang: Lang; config: ImportExportConfig; onDone: () => void; showNotif: (m: string) => void; }
interface Result { ok: number; skipped: { line: number; reason: string }[]; }

const suffix = (id: unknown) => parseInt(String(id || "").split("-")[1]?.slice(4) ?? "") || 0;

export function ImportExport({ t, lang, config, onDone, showNotif }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const doExport = () => downloadSheet(`${config.filename}.xlsx`, config.exportHeader, config.existing.map(config.toExportRow));
  const doTemplate = () => downloadSheet(`${config.filename}_template.xlsx`, config.importHeader, [config.templateExample]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    setBusy(true);
    setProgress("");
    try {
      const rows = await parseSheet(file);
      if (!rows.length) { showNotif(lang === "bn" ? "ফাইল খালি বা ভুল" : "Empty or invalid file"); return; }
      if (!config.importHeader.some((h) => h in rows[0])) {
        showNotif((lang === "bn" ? "কলাম মিলছে না। প্রত্যাশিত: " : "Columns don't match. Expected: ") + config.importHeader.join(", "));
        return;
      }
      const seen = new Set(config.rowKey ? config.existing.map(config.rowKey) : []);
      let seq = config.existing.reduce((m, r) => Math.max(m, suffix(r.systemId)), 0);
      const skipped: { line: number; reason: string }[] = [];
      let ok = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i], line = i + 2; // +2: header is line 1, data starts at 2
        const err = config.validate(row);
        if (err) { skipped.push({ line, reason: err }); continue; }
        if (config.importRowKey) {
          const key = config.importRowKey(row);
          if (seen.has(key)) { skipped.push({ line, reason: lang === "bn" ? "ডুপ্লিকেট" : "duplicate" }); continue; }
          seen.add(key);
        }
        try {
          await config.create(row, genId(config.prefix, new Date().getFullYear(), ++seq));
          ok++;
          setProgress(`${ok}/${rows.length}`);
        } catch (err2) {
          seq--; // id wasn't consumed
          skipped.push({ line, reason: err2 instanceof Error ? err2.message : String(err2) });
        }
      }
      setResult({ ok, skipped });
      if (ok) onDone();
    } catch (err) {
      showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + (err instanceof Error ? err.message : String(err)));
    } finally { setBusy(false); setProgress(""); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={doExport}><Download className="h-4 w-4" />{lang === "bn" ? "এক্সপোর্ট" : "Export"}</Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={doTemplate}><FileText className="h-4 w-4" />{lang === "bn" ? "টেমপ্লেট" : "Template"}</Button>
      <Button variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />{busy ? (progress || (lang === "bn" ? "চলছে…" : "Working…")) : (lang === "bn" ? "ইমপোর্ট" : "Import")}</Button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />

      <Dialog open={!!result} onOpenChange={(o) => { if (!o) setResult(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{lang === "bn" ? "ইমপোর্ট ফলাফল" : "Import result"}</DialogTitle></DialogHeader>
          {result && (
            <div className="space-y-3 text-sm">
              <div className="flex gap-4">
                <span className="font-semibold text-green-600 dark:text-green-400">{lang === "bn" ? "সফল" : "Imported"}: {result.ok}</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{lang === "bn" ? "বাদ" : "Skipped"}: {result.skipped.length}</span>
              </div>
              {result.skipped.length > 0 && (
                <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-xs">
                  {result.skipped.map((s, i) => (
                    <div key={i}><span className="font-semibold">{lang === "bn" ? "লাইন" : "Line"} {s.line}:</span> <span className="text-muted-foreground">{s.reason}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={() => setResult(null)}>{t.save ? (lang === "bn" ? "ঠিক আছে" : "OK") : "OK"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

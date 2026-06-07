import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import type { Dict, Lang, TargetEntry } from "../types";

interface Props {
  t: Dict;
  lang: Lang;
  entry: TargetEntry;
  score: number | string;
  setScore: (v: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

// Score-edit dialog for a target KPI entry (teacher/parent). Rendered only while
// editing, so it's always open; ESC / overlay / Cancel route to onCancel.
export function EditScoreModal({ t, lang, entry, score, setScore, onSave, onCancel }: Props) {
  const max = entry.maxPoints || 0;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>✏️ {lang === "bn" ? "পয়েন্ট সম্পাদনা" : "Edit Points"}</DialogTitle></DialogHeader>
        <div className="text-sm text-muted-foreground">{lang === "bn" ? entry.questionText : entry.questionTextEn} · max {max}</div>
        {(entry.editLog || []).length > 0 && (
          <div className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <div className="mb-1 text-xs font-bold">{lang === "bn" ? "ইতিহাস" : "History"}</div>
            {entry.editLog.map((log, i) => (<div key={i} className="text-xs">{log.editedAt}: {log.oldScore}→{log.newScore}</div>))}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="esm-score">{lang === "bn" ? "নতুন পয়েন্ট" : "New Score"} (max:{max})</Label>
          <Input id="esm-score" type="number" min={0} max={max} className="w-32 text-lg font-bold" value={score} onChange={(e) => setScore(Math.min(parseInt(e.target.value) || 0, max))} />
        </div>
        <DialogFooter><Button variant="outline" onClick={onCancel}>{t.cancel}</Button><Button onClick={onSave}>{t.save}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

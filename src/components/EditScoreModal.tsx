import { S } from "../theme";
import { Modal } from "./Modal";
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

// Score-edit modal for a target KPI entry (teacher/parent). Shows the question,
// max, edit history, and a clamped number input. entry must be truthy.
export function EditScoreModal({ t, lang, entry, score, setScore, onSave, onCancel }: Props) {
  const max = entry.maxPoints || 0;
  return (
    <Modal>
      <h3 style={{ ...S.ct, marginBottom: 16 }}>✏️ {lang === "bn" ? "পয়েন্ট সম্পাদনা" : "Edit Points"}</h3>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>{lang === "bn" ? entry.questionText : entry.questionTextEn} · max {max}</div>
      {(entry.editLog || []).length > 0 && <div style={{ background: "#fef3c7", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>{lang === "bn" ? "ইতিহাস" : "History"}</div>{entry.editLog.map((log, i) => (<div key={i} style={{ fontSize: 12, color: "#78350f" }}>{log.editedAt}: {log.oldScore}→{log.newScore}</div>))}</div>}
      <div style={S.fg}><label style={S.lbl}>{lang === "bn" ? "নতুন পয়েন্ট" : "New Score"} (max:{max})</label><input style={{ ...S.inp, maxWidth: 120, fontSize: 18, fontWeight: 700, color: "#0f172a" }} type="number" min="0" max={max} value={score} onChange={(e) => setScore(Math.min(parseInt(e.target.value) || 0, max))} /></div>
      <div style={{ display: "flex", gap: 8 }}><button onClick={onSave} style={S.saveBtn}>{t.save}</button><button onClick={onCancel} style={S.cancelBtn}>{t.cancel}</button></div>
    </Modal>
  );
}

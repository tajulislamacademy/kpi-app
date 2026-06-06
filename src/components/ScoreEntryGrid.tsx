import { S } from "../theme";
import type { Dict, Lang, Person, Question } from "../types";

interface Props {
  t: Dict;
  lang: Lang;
  isMobile: boolean;
  targets: Person[];
  questions: Question[];
  getScore: (tid: string, qid: string) => number | string;
  setScore: (tid: string, qid: string, val: string) => void;
  getTotal: (tid: string) => number;
  isFreqDone: (tid: string, qid: string) => boolean;
  onSubmit: () => void;
  submitting: boolean;
  whoLabel: string;
  emptyMsg: string;
}

// Score-entry grid for a list of targets (teachers / parents) against a set of
// questions. Mobile = stacked cards, desktop = table. A frequency-completed
// cell shows ✓ instead of an input. getScore/setScore/getTotal/isFreqDone all
// key off the target id; onSubmit posts the batch.
export function ScoreEntryGrid({ t, lang, isMobile, targets, questions, getScore, setScore, getTotal, isFreqDone, onSubmit, submitting, whoLabel, emptyMsg }: Props) {
  if (questions.length === 0) return <div style={S.empty}>{emptyMsg}</div>;
  const maxTotal = questions.reduce((s, q) => s + q.points, 0);
  const submitBtn = (full: boolean) => (
    <button onClick={onSubmit} disabled={submitting} style={full ? { ...S.submitBtn, width: "100%", padding: 14, fontSize: 16, marginTop: 4, borderRadius: 10, ...(submitting ? { opacity: 0.6, cursor: "wait" } : {}) } : { ...S.submitBtn, ...(submitting ? { opacity: 0.6, cursor: "wait" } : {}) }}>{submitting ? (lang === "bn" ? "জমা হচ্ছে…" : "Submitting…") : t.submitPoints}</button>
  );
  if (isMobile) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {targets.map((tg) => (<div key={tg.id} style={{ ...S.card, marginBottom: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid #f8fafc" }}>
          <div><div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{lang === "bn" ? tg.name : tg.nameEn}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{tg.systemId}</div></div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}><div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{getTotal(tg.id)}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>/{maxTotal} pts</div></div>
        </div>
        {questions.map((q) => (<div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ flex: 1, marginRight: 12 }}><div style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>{lang === "bn" ? q.textBn : q.textEn}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>max {q.points}</div></div>
          {isFreqDone(tg.id, q.id) ? <div style={{ width: 64, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0fdf4", borderRadius: 8, fontSize: 12, color: "#166534", fontWeight: 700 }}>✓</div> : <input type="number" min="0" max={q.points} style={{ ...S.scoreInp, width: 64, height: 44, fontSize: 18, fontWeight: 700 }} value={getScore(tg.id, q.id)} onChange={(e) => setScore(tg.id, q.id, e.target.value)} placeholder="0" />}
        </div>))}
      </div>))}
      {submitBtn(true)}
    </div>
  );
  return (
    <div style={S.card}><div style={{ overflowX: "auto" }}><table style={S.table}><thead><tr><th style={{ ...S.th, minWidth: 140 }}>{whoLabel}</th>{questions.map((q) => (<th key={q.id} style={{ ...S.th, minWidth: 80, textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 600 }}>{lang === "bn" ? q.textBn : q.textEn}</div><div style={{ fontSize: 10, color: "#0f172a" }}>/{q.points}</div></th>))}<th style={{ ...S.th, minWidth: 70, textAlign: "center" }}>{lang === "bn" ? "মোট" : "Total"}</th></tr></thead><tbody>{targets.map((tg, i) => (<tr key={tg.id} style={i % 2 === 0 ? { background: "#fafafa" } : {}}><td style={S.td}><div style={{ fontWeight: 600, fontSize: 13 }}>{lang === "bn" ? tg.name : tg.nameEn}</div><div style={{ fontSize: 10, color: "#94a3b8" }}>{tg.systemId}</div></td>{questions.map((q) => (<td key={q.id} style={{ ...S.td, textAlign: "center" }}>{isFreqDone(tg.id, q.id) ? <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>✓</span> : <input type="number" min="0" max={q.points} style={{ ...S.scoreInp, width: 52 }} value={getScore(tg.id, q.id)} onChange={(e) => setScore(tg.id, q.id, e.target.value)} placeholder="0" />}</td>))}<td style={{ ...S.td, textAlign: "center" }}><strong style={{ color: "#0f172a", fontSize: 15 }}>{getTotal(tg.id)}</strong><div style={{ fontSize: 10, color: "#94a3b8" }}>/{maxTotal}</div></td></tr>))}</tbody></table></div><div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>{submitBtn(false)}</div></div>
  );
}

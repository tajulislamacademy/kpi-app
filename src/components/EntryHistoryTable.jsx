import { S } from "../theme";

// Recent KPI entries (newest first, capped at 50) with an edit button per row.
// people = the target list (teachers/parents); whoLabel = that column's header.
export function EntryHistoryTable({ t, lang, entries, people, whoLabel, onEdit }) {
  return (
    <div style={S.card}><h3 style={S.ct}>{t.entryHistory}</h3><div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{lang === "bn" ? "তারিখ" : "Date"}</th><th style={S.th}>{whoLabel}</th><th style={S.th}>{lang === "bn" ? "প্রশ্ন" : "Question"}</th><th style={S.th}>{t.points}</th><th style={S.th}>✏️</th></tr></thead><tbody>{[...entries].reverse().slice(0, 50).map((e, i) => { const who = people.find(x => x.id === e.targetId); const edited = (e.editLog || []).length > 0; return (<tr key={e.id} style={i % 2 === 0 ? { background: "#fafafa" } : {}}><td style={S.td}>{e.date}</td><td style={S.td}>{lang === "bn" ? who?.name : who?.nameEn}</td><td style={S.td}><div style={{ fontSize: 13 }}>{lang === "bn" ? e.questionText : e.questionTextEn}</div></td><td style={S.td}>{edited ? <span><span style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: 12, marginRight: 4 }}>{e.editLog[0].oldScore}</span><strong style={{ color: "#0f172a" }}>{e.score}</strong></span> : <strong style={{ color: "#0f172a" }}>{e.score}</strong>}</td><td style={S.td}><button onClick={() => onEdit(e)} style={{ padding: "4px 10px", background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✏️</button></td></tr>); })}</tbody></table></div></div>
  );
}

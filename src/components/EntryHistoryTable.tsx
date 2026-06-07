import { S } from "../theme";
import type { Dict, Lang, Person, TargetEntry } from "../types";

interface Props {
  t: Dict;
  lang: Lang;
  entries: TargetEntry[];
  people: Person[];
  whoLabel: string;
  onEdit: (e: TargetEntry) => void;
}

// Recent KPI entries (newest first, capped at 50) with an edit button per row.
// people = the target list (teachers/parents); whoLabel = that column's header.
export function EntryHistoryTable({ t, lang, entries, people, whoLabel, onEdit }: Props) {
  return (
    <div style={S.card}><h3 style={S.ct}>{t.entryHistory}</h3><div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{lang === "bn" ? "তারিখ" : "Date"}</th><th style={S.th}>{whoLabel}</th><th style={S.th}>{lang === "bn" ? "প্রশ্ন" : "Question"}</th><th style={S.th}>{t.points}</th><th style={S.th}>✏️</th></tr></thead><tbody>{[...entries].reverse().slice(0, 50).map((e, i) => { const who = people.find((x) => x.id === e.targetId); const edited = (e.editLog || []).length > 0; return (<tr key={e.id} style={i % 2 === 0 ? { background: "var(--muted)" } : {}}><td style={S.td}>{e.date}</td><td style={S.td}>{lang === "bn" ? who?.name : who?.nameEn}</td><td style={S.td}><div style={{ fontSize: 13 }}>{lang === "bn" ? e.questionText : e.questionTextEn}</div></td><td style={S.td}>{edited ? <span><span style={{ textDecoration: "line-through", color: "var(--muted-foreground)", fontSize: 12, marginRight: 4 }}>{e.editLog[0].oldScore}</span><strong style={{ color: "var(--foreground)" }}>{e.score}</strong></span> : <strong style={{ color: "var(--foreground)" }}>{e.score}</strong>}</td><td style={S.td}><button onClick={() => onEdit(e)} style={{ padding: "4px 10px", background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✏️</button></td></tr>); })}</tbody></table></div></div>
  );
}

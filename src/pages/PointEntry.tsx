import { useState } from "react";
import { S } from "../theme";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { useIsMobile } from "../composables";
import { getWeekNumber, errMsg } from "../lib";
import { Tabs, ErrorNote } from "../components";
import { useDbStudents } from "../api/students";
import { useDbTeachers } from "../api/teachers";
import { useDbQuestions } from "../api/questions";
import { useDbStudentEntries, insertEntries, updateEntryScore } from "../api/entries";
import type { Dict, Lang, SessionUser, SubjectAssignment, StudentEntry } from "../types";

type Scores = Record<string, Record<string, number>>;
interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; isAdmin: boolean; }

export function PointEntryPage({ t, lang, currentUser, showNotif, isAdmin }: Props) {
  const isMobile = useIsMobile();
  const { students, error: e1 } = useDbStudents(true);
  const { questions: allQuestions, error: e2 } = useDbQuestions(true);
  const questions = allQuestions.filter(q => q.category === "student");
  const { teachers, error: e3 } = useDbTeachers(true);
  const { entries, reload: reloadEntries, error: e4 } = useDbStudentEntries(true);
  const loadErr = e1 || e2 || e3 || e4;
  const [activeRole, setActiveRole] = useState("classTeacher");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedAssign, setSelectedAssign] = useState<SubjectAssignment | null>(null);
  const [allScores, setAllScores] = useState<Scores>({});
  const [editEntry, setEditEntry] = useState<StudentEntry | null>(null);
  const [editScore, setEditScore] = useState<number | string>("");
  const [fTc, setFTc] = useState("all"), [fSt, setFSt] = useState("all"), [fYr, setFYr] = useState("all"), [fMo, setFMo] = useState("all"), [fRo, setFRo] = useState("all");
  const cm = new Date(selectedDate).getMonth(), cw = getWeekNumber(selectedDate), cy = new Date(selectedDate).getFullYear();
  const ct = currentUser.classTeacher;
  const classStudents = ct ? students.filter(s => s.class === ct.class && s.section === ct.section) : [];
  const subjectAssignments = currentUser.subjectAssignments || [];
  const subjectStudents = selectedAssign ? students.filter(s => s.class === selectedAssign.class && s.section === selectedAssign.section) : [];
  const guideIds = currentUser.guideStudents || [];
  const guideStudents = students.filter(s => guideIds.includes(s.id));
  const weekDoneCheck = (sid: string) => entries.some(e => e.studentId === sid && e.teacherId === currentUser.id && e.role === "guideTeacher" && getWeekNumber(e.date) === cw && new Date(e.date).getFullYear() === cy);
  const isQFreqDone = (sid: string, qid: string) => { const q = questions.find(x => x.id === qid); const freq = q?.frequency || "monthly"; const d = new Date(selectedDate), year = d.getFullYear(), month = d.getMonth(); return entries.some(e => { if (e.studentId !== sid || e.questionId !== qid) return false; const ed = new Date(e.date), eYear = e.year || 2026; switch (freq) { case "daily": return e.date === selectedDate; case "weekly": return getWeekNumber(e.date) === cw && eYear === year; case "quarterly": return Math.floor(ed.getMonth() / 3) === Math.floor(month / 3) && eYear === year; case "annual": return eYear === year; default: return e.month === month && eYear === year; } }); };
  const roleQs = questions.filter(q => q.role === activeRole && q.activeMonths.includes(cm));
  const curStudents = activeRole === "classTeacher" ? classStudents : activeRole === "subjectTeacher" ? subjectStudents : guideStudents;
  const setScore = (sid: string, qid: string, val: string) => { const max = questions.find(q => q.id === qid)?.points || 0; setAllScores(p => ({ ...p, [sid]: { ...(p[sid] || {}), [qid]: Math.min(parseInt(val) || 0, max) } })); };
  const getScore = (sid: string, qid: string): number | string => allScores[sid]?.[qid] ?? "";
  const getTotal = (sid: string) => roleQs.reduce((s, q) => s + (allScores[sid]?.[q.id] || 0), 0);
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    const rows: Record<string, unknown>[] = [];
    curStudents.forEach(s => {
      if (activeRole === "guideTeacher" && weekDoneCheck(s.id)) return;
      roleQs.forEach(q => {
        if (isQFreqDone(s.id, q.id)) return; // skip questions already entered for this period
        rows.push({ target_type: "student", target_id: s.id, entered_by: currentUser.id, question_id: q.id, question_text: q.textBn, question_text_en: q.textEn, max_points: q.points, score: allScores[s.id]?.[q.id] || 0, role: activeRole, subject: selectedAssign?.subject || "", month: cm, year: cy, entry_date: selectedDate, edit_log: [] });
      });
    });
    if (!rows.length) { showNotif(lang === "bn" ? "জমা দেওয়ার মতো কিছু নেই" : "Nothing to submit"); return; }
    setSubmitting(true);
    try { await insertEntries(rows); await reloadEntries(); setAllScores({}); showNotif(t.entrySuccess); }
    catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
    finally { setSubmitting(false); }
  };
  const handleEditSave = async () => {
    if (!editEntry) return;
    const max = questions.find(q => q.id === editEntry.questionId)?.points || editEntry.maxPoints || 0;
    const ns = Math.min(parseInt(String(editScore)) || 0, max);
    try {
      await updateEntryScore(editEntry.id, ns, editEntry.score, "admin");
      await reloadEntries();
      setEditEntry(null); showNotif(lang === "bn" ? "সম্পাদনা সফল!" : "Edited!");
    } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
  };
  const entryYears = [...new Set(entries.map(e => e.year || 2026))].sort((a, b) => b - a);
  const filtered = entries.filter(e => isAdmin || e.teacherId === currentUser.id).filter(e => fTc === "all" || e.teacherId === fTc).filter(e => fSt === "all" || e.studentId === fSt).filter(e => fYr === "all" || (e.year || 2026) === parseInt(fYr)).filter(e => fMo === "all" || e.month === parseInt(fMo)).filter(e => fRo === "all" || e.role === fRo).slice().reverse();
  const tabs = [{ key: "classTeacher", label: t.classTeacher, show: isAdmin || !!currentUser.classTeacher }, { key: "subjectTeacher", label: t.subjectTeacher, show: isAdmin || subjectAssignments.length > 0 }, { key: "guideTeacher", label: t.guideTeacher, show: isAdmin || guideIds.length > 0 }].filter(x => x.show);
  const freqLabel = (f?: string) => { const map: Record<string, string> = { daily: t.daily, weekly: t.weekly, monthly: t.monthly, quarterly: t.quarterly, annual: t.annual }; return map[f || "monthly"] || t.monthly; };
  return (<div style={S.page}>
    <h2 style={S.pt}>{t.pointEntry}</h2>
    <ErrorNote lang={lang} error={loadErr} />
    {editEntry && isAdmin && (() => { const s = students.find(x => x.id === editEntry.studentId), q = questions.find(x => x.id === editEntry.questionId), tc = teachers.find(x => x.id === editEntry.teacherId); return (
      <div style={S.modalBg}><div style={S.modalBox}>
        <h3 style={{ ...S.ct, marginBottom: 16 }}>✏️ {lang === "bn" ? "পয়েন্ট সম্পাদনা" : "Edit Points"}</h3>
        <div style={S.editInfoBox}>{[[lang === "bn" ? "শিক্ষার্থী" : "Student", lang === "bn" ? s?.name : s?.nameEn], [lang === "bn" ? "শিক্ষক" : "Teacher", `${lang === "bn" ? tc?.name : tc?.nameEn}(${editEntry.date})`], [lang === "bn" ? "বর্তমান" : "Current", `${editEntry.score}/${q?.points || editEntry.maxPoints}`]].map(([l, v], i) => (<div key={i} style={S.editInfoRow}><span style={S.editInfoLabel}>{l}:</span><span style={S.editInfoVal}>{v}</span></div>))}</div>
        {(editEntry.editLog || []).length > 0 && <div style={{ background: "#fef3c7", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>{lang === "bn" ? "ইতিহাস" : "History"}</div>{editEntry.editLog.map((log, i) => (<div key={i} style={{ fontSize: 12, color: "#78350f", padding: "3px 0" }}>{log.editedAt}: {log.oldScore}→{log.newScore}</div>))}</div>}
        <div style={S.fg}><label style={S.lbl}>{lang === "bn" ? "নতুন পয়েন্ট" : "New Score"} (max:{q?.points || editEntry.maxPoints})</label><input style={{ ...S.inp, maxWidth: 120, fontSize: 18, fontWeight: 700, color: "var(--foreground)" }} type="number" min="0" max={q?.points || editEntry.maxPoints} value={editScore} onChange={e => setEditScore(Math.min(parseInt(e.target.value) || 0, q?.points || editEntry.maxPoints || 0))} /></div>
        <div style={{ display: "flex", gap: 8 }}><button onClick={handleEditSave} style={S.saveBtn}>{t.save}</button><button onClick={() => setEditEntry(null)} style={S.cancelBtn}>{t.cancel}</button></div>
      </div></div>
    ); })()}
    <div style={S.fg}><label style={S.lbl}>{t.selectDate}</label><input style={{ ...S.inp, maxWidth: 200 }} type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
    <Tabs items={tabs} active={activeRole} onChange={(k) => { setActiveRole(k); setAllScores({}); setSelectedAssign(null); }} style={{ marginTop: 16 }} />
    {activeRole === "subjectTeacher" && <div style={{ ...S.card, marginBottom: 12 }}><label style={S.lbl}>{lang === "bn" ? "শ্রেণী ও বিষয় নির্বাচন" : "Select Class & Subject"}</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{(isAdmin ? [{ class: "8", section: "A", subject: "গণিত/Math" }] : subjectAssignments).map((a, i) => (<button key={i} onClick={() => { setSelectedAssign(a); setAllScores({}); }} style={{ padding: "8px 14px", border: "2px solid", borderColor: selectedAssign === a ? "var(--primary)" : "var(--muted)", borderRadius: 8, background: selectedAssign === a ? "var(--muted)" : "var(--card)", color: selectedAssign === a ? "var(--foreground)" : "var(--muted-foreground)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{t.class}{a.class}{a.section}—{a.subject}</button>))}</div></div>}
    {activeRole === "guideTeacher" && <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#92400e" }}>⚠️{lang === "bn" ? "গাইড শিক্ষক সপ্তাহে ১ বার।" : "Guide teacher: once per week."}</div>}
    {activeRole === "classTeacher" && !isAdmin && !currentUser.classTeacher && <div style={S.empty}>{t.noClassRole}</div>}
    {activeRole === "subjectTeacher" && !selectedAssign && <div style={S.empty}>{t.selectClassSubject}</div>}
    {(activeRole !== "subjectTeacher" || selectedAssign) && (activeRole !== "classTeacher" || isAdmin || currentUser.classTeacher) && roleQs.length === 0 && <div style={S.empty}>{lang === "bn" ? "এই ভূমিকা ও মাসের জন্য কোনো প্রশ্ন নেই — প্রশ্নমালায় এই ভূমিকার প্রশ্ন যোগ করুন" : "No questions for this role & month — add some in Questions first"}</div>}
    {(activeRole !== "subjectTeacher" || selectedAssign) && (activeRole !== "classTeacher" || isAdmin || currentUser.classTeacher) && roleQs.length > 0 && curStudents.length === 0 && <div style={S.empty}>{lang === "bn" ? "কোনো শিক্ষার্থী পাওয়া যায়নি — অনুমতি (RLS) বা নিয়োগ যাচাই করুন" : "No students found — check permissions (RLS) or assignment"}</div>}
    {curStudents.length > 0 && roleQs.length > 0 && (activeRole !== "subjectTeacher" || selectedAssign) && (isMobile ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {curStudents.map((s) => { const wd = activeRole === "guideTeacher" && weekDoneCheck(s.id); const maxPts = roleQs.reduce((x, q) => x + q.points, 0); return (<div key={s.id} style={{ ...S.card, marginBottom: 0, opacity: wd ? 0.65 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid var(--border)" }}>
            <div><div style={{ fontWeight: 700, fontSize: 15, color: "var(--foreground)" }}>{lang === "bn" ? s.name : s.nameEn}</div><div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.systemId} · {t.class}{s.class}{s.section} · Roll {s.roll}</div></div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}><div style={{ fontSize: 24, fontWeight: 900, color: "var(--foreground)", lineHeight: 1 }}>{getTotal(s.id)}</div><div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/{maxPts} pts</div></div>
          </div>
          {activeRole === "guideTeacher" && wd && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>⚠️ {lang === "bn" ? "এই সপ্তাহে পয়েন্ট দেওয়া হয়েছে" : "Already submitted this week"}</div>}
          {roleQs.map(q => { const qd = isQFreqDone(s.id, q.id); return (<div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ flex: 1, marginRight: 12 }}><div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{lang === "bn" ? q.textBn : q.textEn}</div><div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{freqLabel(q.frequency)} · max {q.points}</div></div>
            {qd ? <div style={{ width: 64, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0fdf4", borderRadius: 8, fontSize: 12, color: "#166534", fontWeight: 700 }}>✓</div> : <input type="number" min="0" max={q.points} disabled={wd} style={{ ...S.scoreInp, width: 64, height: 44, fontSize: 18, fontWeight: 700 }} value={getScore(s.id, q.id)} onChange={e => setScore(s.id, q.id, e.target.value)} placeholder="0" />}
          </div>); })}
        </div>); })}
        <button onClick={handleSubmit} disabled={submitting} style={{ ...S.submitBtn, width: "100%", padding: 14, fontSize: 16, marginTop: 4, borderRadius: 10, ...(submitting ? { opacity: 0.6, cursor: "wait" } : {}) }}>{submitting ? (lang === "bn" ? "জমা হচ্ছে…" : "Submitting…") : t.submitPoints}</button>
      </div>
    ) : (<div style={S.card}>
      <div style={{ overflowX: "auto" }}><table style={S.table}><thead><tr>
        <th style={{ ...S.th, minWidth: 120 }}>{lang === "bn" ? "শিক্ষার্থী" : "Student"}</th>
        {roleQs.map(q => (<th key={q.id} style={{ ...S.th, minWidth: 80, textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)" }}>{lang === "bn" ? q.textBn : q.textEn}</div><div style={{ fontSize: 10, color: "var(--foreground)" }}>/{q.points}</div><div style={{ fontSize: 9, color: "var(--muted-foreground)", marginTop: 1 }}>{freqLabel(q.frequency)}</div></th>))}
        <th style={{ ...S.th, minWidth: 70, textAlign: "center" }}>{lang === "bn" ? "মোট" : "Total"}</th>
        {activeRole === "guideTeacher" && <th style={{ ...S.th, minWidth: 70 }}>{lang === "bn" ? "অবস্থা" : "Status"}</th>}
      </tr></thead><tbody>
        {curStudents.map((s, i) => { const wd = activeRole === "guideTeacher" && weekDoneCheck(s.id); return (<tr key={s.id} style={{ ...(i % 2 === 0 ? { background: "var(--muted)" } : {}), opacity: wd ? 0.5 : 1 }}>
          <td style={S.td}><div style={{ fontWeight: 600, fontSize: 13 }}>{lang === "bn" ? s.name : s.nameEn}</div><div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{s.systemId}</div></td>
          {roleQs.map(q => { const qd = isQFreqDone(s.id, q.id); return (<td key={q.id} style={{ ...S.td, textAlign: "center" }}>{qd ? <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600 }}>✓</span> : <input type="number" min="0" max={q.points} disabled={wd} style={{ ...S.scoreInp, width: 52 }} value={getScore(s.id, q.id)} onChange={e => setScore(s.id, q.id, e.target.value)} placeholder="0" />}</td>); })}
          <td style={{ ...S.td, textAlign: "center" }}><strong style={{ color: "var(--foreground)", fontSize: 15 }}>{getTotal(s.id)}</strong><div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>/{roleQs.reduce((acc, q) => acc + q.points, 0)}</div></td>
          {activeRole === "guideTeacher" && <td style={S.td}>{wd ? <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>⚠️{lang === "bn" ? "দেওয়া" : "Done"}</span> : <span style={{ fontSize: 11, color: "var(--foreground)", fontWeight: 600 }}>✅{lang === "bn" ? "বাকি" : "Pending"}</span>}</td>}
        </tr>); })}
      </tbody></table></div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><button onClick={handleSubmit} disabled={submitting} style={{ ...S.submitBtn, ...(submitting ? { opacity: 0.6, cursor: "wait" } : {}) }}>{submitting ? (lang === "bn" ? "জমা হচ্ছে…" : "Submitting…") : t.submitPoints}</button></div>
    </div>))}
    <div style={S.card}>
      <h3 style={S.ct}>{lang === "bn" ? "এন্ট্রি তালিকা" : "Entry List"}</h3>
      {isAdmin && (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 16, background: "var(--muted)", borderRadius: 10, padding: "14px 16px" }}>
        {[{ l: lang === "bn" ? "বছর" : "Year", v: fYr, set: setFYr, opts: [{ v: "all", l: lang === "bn" ? "সব" : "All" }, ...entryYears.map(y => ({ v: String(y), l: String(y) }))] }, { l: lang === "bn" ? "শিক্ষক" : "Teacher", v: fTc, set: setFTc, opts: [{ v: "all", l: lang === "bn" ? "সবাই" : "All" }, ...teachers.map(tc => ({ v: tc.id, l: (lang === "bn" ? tc.name : tc.nameEn) || "" }))] }, { l: lang === "bn" ? "শিক্ষার্থী" : "Student", v: fSt, set: setFSt, opts: [{ v: "all", l: lang === "bn" ? "সবাই" : "All" }, ...students.map(s => ({ v: s.id, l: `${lang === "bn" ? s.name : s.nameEn}` }))] }, { l: lang === "bn" ? "মাস" : "Month", v: fMo, set: setFMo, opts: [{ v: "all", l: lang === "bn" ? "সব" : "All" }, ...MONTHS.map((m, i) => ({ v: String(i), l: T[lang][m] }))] }, { l: lang === "bn" ? "ভূমিকা" : "Role", v: fRo, set: setFRo, opts: [{ v: "all", l: lang === "bn" ? "সব" : "All" }, { v: "classTeacher", l: t.classTeacher }, { v: "subjectTeacher", l: t.subjectTeacher }, { v: "guideTeacher", l: t.guideTeacher }] }].map(({ l, v, set, opts }) => (<div key={l} style={S.fg}><label style={{ ...S.lbl, fontSize: 12 }}>{l}</label><select style={{ ...S.inp, fontSize: 13 }} value={v} onChange={e => set(e.target.value)}>{opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>))}
        <div style={{ display: "flex", alignItems: "flex-end" }}><button onClick={() => { setFTc("all"); setFSt("all"); setFYr("all"); setFMo("all"); setFRo("all"); }} style={{ ...S.cancelBtn, width: "100%", fontSize: 13 }}>🔄{lang === "bn" ? "রিসেট" : "Reset"}</button></div>
      </div>)}
      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 8 }}>{lang === "bn" ? `${filtered.length}টি এন্ট্রি` : `${filtered.length} entries`}</div>
      <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{lang === "bn" ? "তারিখ" : "Date"}</th><th style={S.th}>{lang === "bn" ? "শিক্ষক" : "Teacher"}</th><th style={S.th}>{lang === "bn" ? "শিক্ষার্থী" : "Student"}</th><th style={S.th}>{lang === "bn" ? "ভূমিকা" : "Role"}</th><th style={S.th}>{lang === "bn" ? "প্রশ্ন" : "Q"}</th><th style={S.th}>{t.points}</th>{isAdmin && <th style={S.th}>✏️</th>}</tr></thead>
      <tbody>{filtered.map((e, i) => { const s = students.find(x => x.id === e.studentId), q = questions.find(x => x.id === e.questionId), tc = teachers.find(x => x.id === e.teacherId), edited = (e.editLog || []).length > 0; const rC = e.role === "classTeacher" ? "#eff6ff" : e.role === "subjectTeacher" ? "#f0fdf4" : "#f5f5f4"; const rT = e.role === "classTeacher" ? "#1d4ed8" : e.role === "subjectTeacher" ? "#166534" : "#57534e"; const rL = e.role === "classTeacher" ? t.classTeacher : e.role === "subjectTeacher" ? t.subjectTeacher : t.guideTeacher;
        return (<tr key={i} style={i % 2 === 0 ? { background: "var(--muted)" } : {}}><td style={S.td}>{e.date}</td><td style={S.td}><div style={{ fontSize: 13 }}>{lang === "bn" ? tc?.name : tc?.nameEn}</div>{edited && <span style={{ fontSize: 10, background: "#f5f5f4", color: "#57534e", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>✏️{lang === "bn" ? "সম্পাদিত" : "Edited"}</span>}</td><td style={S.td}>{lang === "bn" ? s?.name : s?.nameEn}</td><td style={S.td}><span style={{ fontSize: 11, background: rC, color: rT, padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>{rL}</span></td><td style={S.td}><div style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{lang === "bn" ? (q?.textBn || e.questionText) : (q?.textEn || e.questionTextEn)}</div></td><td style={S.td}>{edited ? <span><span style={{ textDecoration: "line-through", color: "var(--muted-foreground)", fontSize: 12, marginRight: 4 }}>{e.editLog[0].oldScore}</span><strong style={{ color: "var(--foreground)" }}>{e.score}</strong></span> : <strong style={{ color: "var(--foreground)" }}>{e.score}</strong>}</td>{isAdmin && <td style={S.td}><button onClick={() => { setEditEntry(e); setEditScore(e.score); }} style={{ padding: "4px 10px", background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✏️</button></td>}</tr>); })}</tbody></table></div>
    </div>
  </div>);
}

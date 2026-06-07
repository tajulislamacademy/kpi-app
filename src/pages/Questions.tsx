import { useState } from "react";
import type { CSSProperties } from "react";
import { S } from "../theme";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { ConfirmDialog, Modal, PageHeader, Tabs, MonthsPicker, ErrorNote } from "../components";
import { useDbQuestions, createQuestion, updateQuestion, deleteQuestion } from "../api/questions";
import type { Dict, Lang, Question, QuestionInput, QuestionCategory, Frequency } from "../types";

interface Props { t: Dict; lang: Lang; showNotif: (msg: string) => void; }
interface QForm { textBn: string; textEn: string; role?: string; points: number | string; activeMonths: number[]; frequency: string; }

export function QuestionsPage({ t, lang, showNotif }: Props) {
  const { questions: allQ, loading, error, reload } = useDbQuestions(true);
  const [qTab, setQTab] = useState<QuestionCategory>("student");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewQ, setViewQ] = useState<Question | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const blankS: QForm = { textBn: "", textEn: "", role: "classTeacher", points: 10, activeMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], frequency: "monthly" };
  const blankO: QForm = { textBn: "", textEn: "", points: 10, activeMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], frequency: "monthly" };
  const [form, setForm] = useState<QForm>(blankS);
  const toggleM = (m: number) => { const am = form.activeMonths.includes(m) ? form.activeMonths.filter(x => x !== m) : [...form.activeMonths, m]; setForm({ ...form, activeMonths: am }); };
  const isStd = qTab === "student";
  const stdQ = allQ.filter(q => q.category === "student");
  const tchrQ = allQ.filter(q => q.category === "teacher");
  const parQ = allQ.filter(q => q.category === "parent");
  const curQs = isStd ? stdQ : qTab === "teacher" ? tchrQ : parQ;
  const rColor = (r?: string | null) => r === "classTeacher" ? "#eff6ff" : r === "subjectTeacher" ? "#f0fdf4" : "#f5f5f4";
  const rText = (r?: string | null) => r === "classTeacher" ? "#1d4ed8" : r === "subjectTeacher" ? "#166534" : "#57534e";
  const rLabel = (r?: string | null) => r === "classTeacher" ? t.classTeacher : r === "subjectTeacher" ? t.subjectTeacher : t.guideTeacher;
  const openAdd = () => { setEditId(null); setForm(isStd ? blankS : blankO); setShowForm(true); };
  const openEdit = (q: Question) => { setEditId(q.id); setForm(isStd ? { textBn: q.textBn, textEn: q.textEn, role: q.role || "classTeacher", points: q.points, activeMonths: [...q.activeMonths], frequency: q.frequency || "monthly" } : { textBn: q.textBn, textEn: q.textEn, points: q.points, activeMonths: [...q.activeMonths], frequency: q.frequency || "monthly" }); setShowForm(true); };
  const handleSave = async () => {
    if (!form.textBn) { showNotif(lang === "bn" ? "প্রশ্ন লিখুন" : "Enter question"); return; }
    setSaving(true);
    try {
      const pts = parseInt(String(form.points)) || 0;
      const payload: QuestionInput = { category: qTab, role: isStd ? (form.role || null) : null, textBn: form.textBn, textEn: form.textEn, points: pts, frequency: (form.frequency || "monthly") as Frequency, activeMonths: form.activeMonths };
      if (editId) { await updateQuestion(editId, payload); showNotif(lang === "bn" ? "আপডেট হয়েছে!" : "Updated!"); }
      else { await createQuestion(payload); showNotif(lang === "bn" ? "প্রশ্ন যোগ হয়েছে!" : "Question added!"); }
      await reload();
      setShowForm(false); setEditId(null); setForm(isStd ? blankS : blankO);
    } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + (e instanceof Error ? e.message : String(e))); }
    finally { setSaving(false); }
  };
  const doDelete = async (id: string) => {
    try { await deleteQuestion(id); await reload(); showNotif(lang === "bn" ? "মুছা হয়েছে!" : "Deleted!"); }
    catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + (e instanceof Error ? e.message : String(e))); }
  };
  const aBtn = (bg: string, cl: string, bc: string): CSSProperties => ({ padding: "4px 8px", background: bg, color: cl, border: "1px solid " + bc, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 });
  const freqLabel = (f?: string) => { const map: Record<string, string> = { daily: t.daily, weekly: t.weekly, monthly: t.monthly, quarterly: t.quarterly, annual: t.annual }; return map[f || "monthly"] || t.monthly; };
  const qRow = (q: Question, i: number) => (<tr key={q.id} style={i % 2 === 0 ? { background: "var(--muted)" } : {}}><td style={S.td}>{i + 1}</td><td style={S.td}><div style={{ maxWidth: 200, fontWeight: 500, fontSize: 13 }}>{lang === "bn" ? q.textBn : q.textEn}</div></td><td style={S.td}><strong style={{ color: "var(--foreground)" }}>{q.points}</strong></td><td style={S.td}><span style={{ background: "#f1f5f9", color: "var(--foreground)", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{freqLabel(q.frequency || "monthly")}</span></td><td style={S.td}><div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>{MONTHS.map((m, mi) => (<span key={m} style={{ padding: "1px 5px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: q.activeMonths.includes(mi) ? "#0f172a" : "#e2e8f0", color: q.activeMonths.includes(mi) ? "#fff" : "#94a3b8" }}>{T[lang][m].slice(0, 3)}</span>))}</div></td><td style={S.td}><div style={{ display: "flex", gap: 4 }}><button onClick={() => setViewQ(q)} style={aBtn("#f0fdf4", "#166534", "#bbf7d0")}>👁️</button><button onClick={() => openEdit(q)} style={aBtn("#f8fafc", "#0f172a", "#e2e8f0")}>✏️</button><button onClick={() => setConfirmDel({ id: q.id, name: lang === "bn" ? q.textBn : q.textEn })} style={aBtn("#fee2e2", "#991b1b", "#fca5a5")}>🗑️</button></div></td></tr>);
  const qTable = (list: Question[]) => (<div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>#</th><th style={S.th}>{lang === "bn" ? "প্রশ্ন" : "Question"}</th><th style={S.th}>{t.pointsPerEntry}</th><th style={S.th}>{t.frequency}</th><th style={S.th}>{t.activeMonths}</th><th style={S.th}>{lang === "bn" ? "অ্যাকশন" : "Action"}</th></tr></thead><tbody>{list.map(qRow)}</tbody></table></div>);
  return (<div style={S.page}>
    {confirmDel && <ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); doDelete(id); }} onCancel={() => setConfirmDel(null)} />}
    {viewQ && (<Modal maxWidth={520}>
      <h3 style={S.ct}>🔍 {lang === "bn" ? "প্রশ্ন বিবরণ" : "Question Details"}</h3>
      <div style={{ background: "var(--muted)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>{viewQ.textBn}</div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 12, fontStyle: "italic" }}>{viewQ.textEn}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isStd && <span style={{ background: rColor(viewQ.role), color: rText(viewQ.role), padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{rLabel(viewQ.role)}</span>}
          <span style={{ background: "var(--muted)", color: "var(--foreground)", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{t.pointsPerEntry}: {viewQ.points}</span>
        </div>
      </div>
      <div style={S.fg}><label style={{ ...S.lbl, marginBottom: 8 }}>{t.activeMonths}:</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{MONTHS.map((m, mi) => (<span key={m} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: viewQ.activeMonths.includes(mi) ? "#0f172a" : "#e2e8f0", color: viewQ.activeMonths.includes(mi) ? "#fff" : "#94a3b8" }}>{T[lang][m]}</span>))}</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={() => { setViewQ(null); openEdit(viewQ); }} style={S.saveBtn}>✏️ {t.edit}</button>
        <button onClick={() => setViewQ(null)} style={S.cancelBtn}>{t.cancel}</button>
      </div>
    </Modal>)}
    <PageHeader title={t.questions} subtitle={`${lang === "bn" ? "মোট " + curQs.length + "টি" : "Total " + curQs.length}${loading ? " · …" : ""}`} actionLabel={`+ ${t.addQuestion}`} onAction={openAdd} />
    <ErrorNote lang={lang} error={error} />
    <Tabs items={[{ key: "student", label: `${t.stdQuestions} (${stdQ.length})` }, { key: "teacher", label: `${t.tchrQuestions} (${tchrQ.length})` }, { key: "parent", label: `${t.parQuestions} (${parQ.length})` }]} active={qTab} onChange={(k) => { setQTab(k as QuestionCategory); setShowForm(false); setEditId(null); }} />
    {showForm && (<div style={S.card}>
      <h3 style={S.ct}>{editId ? (lang === "bn" ? "প্রশ্ন সম্পাদনা" : "Edit Question") : (lang === "bn" ? "নতুন প্রশ্ন" : "New Question")}</h3>
      <div style={S.grid2}>
        <div style={S.fg}><label style={S.lbl}>{lang === "bn" ? "প্রশ্ন (বাংলা)" : "Question (BN)"}</label><input style={S.inp} value={form.textBn} onChange={e => setForm({ ...form, textBn: e.target.value })} /></div>
        <div style={S.fg}><label style={S.lbl}>{lang === "bn" ? "প্রশ্ন (ইংরেজি)" : "Question (EN)"}</label><input style={S.inp} value={form.textEn} onChange={e => setForm({ ...form, textEn: e.target.value })} /></div>
        {isStd && <div style={S.fg}><label style={S.lbl}>{t.role}</label><select style={S.inp} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="classTeacher">{t.classTeacher}</option><option value="subjectTeacher">{t.subjectTeacher}</option><option value="guideTeacher">{t.guideTeacher}</option></select></div>}
        <div style={S.fg}><label style={S.lbl}>{t.pointsPerEntry}</label><input style={S.inp} type="number" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} /></div>
        <div style={S.fg}><label style={S.lbl}>{t.frequency}</label><select style={S.inp} value={form.frequency || "monthly"} onChange={e => setForm({ ...form, frequency: e.target.value })}><option value="daily">{t.daily}</option><option value="weekly">{t.weekly}</option><option value="monthly">{t.monthly}</option><option value="quarterly">{t.quarterly}</option><option value="annual">{t.annual}</option></select></div>
      </div>
      <div style={S.fg}><label style={S.lbl}>{t.activeMonths}</label><MonthsPicker lang={lang} value={form.activeMonths} onToggle={toggleM} style={{ marginTop: 6 }} /></div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={handleSave} disabled={saving} style={{ ...S.saveBtn, ...(saving ? { opacity: 0.6, cursor: "wait" } : {}) }}>{saving ? (lang === "bn" ? "সংরক্ষণ…" : "Saving…") : t.save}</button><button onClick={() => { setShowForm(false); setEditId(null); }} style={S.cancelBtn}>{t.cancel}</button></div>
    </div>)}
    {isStd && ["classTeacher", "subjectTeacher", "guideTeacher"].map(role => (<div key={role} style={S.card}><h3 style={S.ct}><span style={{ background: rColor(role), color: rText(role), padding: "3px 10px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>{rLabel(role)}</span></h3>{qTable(curQs.filter(q => q.role === role))}</div>))}
    {!isStd && <div style={S.card}>{qTable(curQs)}</div>}
  </div>);
}

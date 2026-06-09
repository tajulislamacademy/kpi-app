import { useState } from "react";
import { CalendarDays, BarChart3, Trophy, Target } from "lucide-react";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { useIsMobile } from "../composables";
import { freqDone, errMsg } from "../lib";
import { StatCard, BarChart, YearSelector, TermBreakdown, EditScoreModal, EntryHistoryTable, ScoreEntryGrid, ErrorNote, DatePicker } from "../components";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDbTeachers } from "../api/teachers";
import { useDbParents } from "../api/parents";
import { useDbQuestions } from "../api/questions";
import { useDbEntriesByTarget, useEntriesForTarget, insertEntries, updateEntryScore, targetKpiHelpers } from "../api/entries";
import type { Dict, Lang, SessionUser, TermConfig, TargetEntry } from "../types";

type Scores = Record<string, Record<string, number>>;
interface EntryProps { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; selectedYear: number; setSelectedYear: (y: number) => void; }
interface SelfProps { t: Dict; lang: Lang; currentUser: SessionUser; selectedYear: number; setSelectedYear: (y: number) => void; termConfig: TermConfig; }

const PAGE = "mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6";
const HEAD = "flex flex-wrap items-start justify-between gap-3";
const TITLE = "text-xl font-extrabold text-foreground sm:text-2xl";
const GRID4 = "grid grid-cols-2 gap-3 sm:grid-cols-4";

function ChartCard({ title, data, cm }: { title: string; data: { label: string; val: number }[]; cm: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent><BarChart data={data} cm={cm} /></CardContent>
    </Card>
  );
}

export function TeacherKPIPage({ t, lang, currentUser, showNotif, selectedYear, setSelectedYear }: EntryProps) {
  const isMobile = useIsMobile();
  const { teachers, error: e1 } = useDbTeachers(true);
  const { questions: allQ, error: e2 } = useDbQuestions(true);
  const teacherQuestions = allQ.filter(q => q.category === "teacher");
  const { entries: teacherEntries, reload, error: e3 } = useDbEntriesByTarget("teacher", true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [allScores, setAllScores] = useState<Scores>({});
  const [submitting, setSubmitting] = useState(false);
  const cm = new Date(selectedDate).getMonth(), cy = new Date(selectedDate).getFullYear();
  const yearsSet = [...new Set(teacherEntries.map(e => e.year))]; if (!yearsSet.includes(selectedYear)) yearsSet.push(selectedYear); const availableYears = yearsSet.sort((a, b) => b - a);
  const activeQs = teacherQuestions.filter(q => q.activeMonths.includes(cm));
  const setScore = (tid: string, qid: string, val: string) => { const max = teacherQuestions.find(q => q.id === qid)?.points || 0; setAllScores(p => ({ ...p, [tid]: { ...(p[tid] || {}), [qid]: Math.max(0, Math.min(parseInt(val, 10) || 0, max)) } })); };
  const getScore = (tid: string, qid: string): number | string => allScores[tid]?.[qid] ?? "";
  const getTotal = (tid: string) => activeQs.reduce((s, q) => s + (allScores[tid]?.[q.id] || 0), 0);
  const isFreqDone = (tid: string, qid: string) => freqDone(teacherEntries, tid, qid, teacherQuestions.find(x => x.id === qid)?.frequency, selectedDate);
  const [editEntry, setEditEntry] = useState<TargetEntry | null>(null);
  const [editScore, setEditScore] = useState<number | string>("");
  const handleEditSave = async () => { if (!editEntry) return; try { await updateEntryScore(editEntry.id, parseInt(String(editScore)) || 0, editEntry.score, "admin"); await reload(); setEditEntry(null); showNotif(lang === "bn" ? "সম্পাদনা সফল!" : "Edited!"); } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); } };
  const handleSubmit = async () => {
    const rows: Record<string, unknown>[] = []; teachers.forEach(tc => { activeQs.forEach(q => { if (isFreqDone(tc.id, q.id)) return; rows.push({ target_type: "teacher", target_id: tc.id, entered_by: currentUser.id, question_id: q.id, question_text: q.textBn, question_text_en: q.textEn, max_points: q.points, score: allScores[tc.id]?.[q.id] || 0, month: cm, year: cy, entry_date: selectedDate, edit_log: [] }); }); });
    if (!rows.length) { showNotif(lang === "bn" ? "জমা দেওয়ার মতো কিছু নেই" : "Nothing to submit"); return; }
    setSubmitting(true);
    try { await insertEntries(rows); await reload(); setAllScores({}); showNotif(lang === "bn" ? "পয়েন্ট জমা হয়েছে!" : "Points submitted!"); }
    catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
    finally { setSubmitting(false); }
  };
  return (
    <div className={PAGE}>
      {editEntry && <EditScoreModal t={t} lang={lang} entry={editEntry} score={editScore} setScore={setEditScore} onSave={handleEditSave} onCancel={() => setEditEntry(null)} />}
      <div className={HEAD}>
        <h2 className={TITLE}>{t.tchrKpiEntry}</h2>
        <YearSelector lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} />
      </div>
      <ErrorNote lang={lang} error={e1 || e2 || e3} />
      <div className="space-y-1.5"><Label>{t.selectDate}</Label><DatePicker value={selectedDate} onChange={setSelectedDate} /></div>
      <ScoreEntryGrid t={t} lang={lang} isMobile={isMobile} targets={teachers} questions={activeQs} getScore={getScore} setScore={setScore} getTotal={getTotal} isFreqDone={isFreqDone} onSubmit={handleSubmit} submitting={submitting} whoLabel={t.teachers} emptyMsg={t.noQForMonth} />
      <EntryHistoryTable t={t} lang={lang} entries={teacherEntries} people={teachers} whoLabel={t.teachers} onEdit={(e) => { setEditEntry(e); setEditScore(e.score); }} />
    </div>
  );
}

export function ParentKPIPage({ t, lang, currentUser, showNotif, selectedYear, setSelectedYear }: EntryProps) {
  const isMobile = useIsMobile();
  const { parents, error: e1 } = useDbParents(true);
  const { questions: allQ, error: e2 } = useDbQuestions(true);
  const parentQuestions = allQ.filter(q => q.category === "parent");
  const { entries: parentEntries, reload, error: e3 } = useDbEntriesByTarget("parent", true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [allScores, setAllScores] = useState<Scores>({});
  const [submitting, setSubmitting] = useState(false);
  const approvedParents = parents.filter(p => p.status === "approved");
  const cm = new Date(selectedDate).getMonth(), cy = new Date(selectedDate).getFullYear();
  const yearsSet = [...new Set(parentEntries.map(e => e.year))]; if (!yearsSet.includes(selectedYear)) yearsSet.push(selectedYear); const availableYears = yearsSet.sort((a, b) => b - a);
  const activeQs = parentQuestions.filter(q => q.activeMonths.includes(cm));
  const setScore = (pid: string, qid: string, val: string) => { const max = parentQuestions.find(q => q.id === qid)?.points || 0; setAllScores(p => ({ ...p, [pid]: { ...(p[pid] || {}), [qid]: Math.max(0, Math.min(parseInt(val, 10) || 0, max)) } })); };
  const getScore = (pid: string, qid: string): number | string => allScores[pid]?.[qid] ?? "";
  const getTotal = (pid: string) => activeQs.reduce((s, q) => s + (allScores[pid]?.[q.id] || 0), 0);
  const isFreqDone = (pid: string, qid: string) => freqDone(parentEntries, pid, qid, parentQuestions.find(x => x.id === qid)?.frequency, selectedDate);
  const [editEntry, setEditEntry] = useState<TargetEntry | null>(null);
  const [editScore, setEditScore] = useState<number | string>("");
  const handleEditSave = async () => { if (!editEntry) return; try { await updateEntryScore(editEntry.id, parseInt(String(editScore)) || 0, editEntry.score, "admin"); await reload(); setEditEntry(null); showNotif(lang === "bn" ? "সম্পাদনা সফল!" : "Edited!"); } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); } };
  const handleSubmit = async () => {
    const rows: Record<string, unknown>[] = []; approvedParents.forEach(p => { activeQs.forEach(q => { if (isFreqDone(p.id, q.id)) return; rows.push({ target_type: "parent", target_id: p.id, entered_by: currentUser.id, question_id: q.id, question_text: q.textBn, question_text_en: q.textEn, max_points: q.points, score: allScores[p.id]?.[q.id] || 0, month: cm, year: cy, entry_date: selectedDate, edit_log: [] }); }); });
    if (!rows.length) { showNotif(lang === "bn" ? "জমা দেওয়ার মতো কিছু নেই" : "Nothing to submit"); return; }
    setSubmitting(true);
    try { await insertEntries(rows); await reload(); setAllScores({}); showNotif(lang === "bn" ? "পয়েন্ট জমা হয়েছে!" : "Points submitted!"); }
    catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
    finally { setSubmitting(false); }
  };
  return (
    <div className={PAGE}>
      {editEntry && <EditScoreModal t={t} lang={lang} entry={editEntry} score={editScore} setScore={setEditScore} onSave={handleEditSave} onCancel={() => setEditEntry(null)} />}
      <div className={HEAD}>
        <h2 className={TITLE}>{t.parKpiEntry}</h2>
        <YearSelector lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} />
      </div>
      <ErrorNote lang={lang} error={e1 || e2 || e3} />
      <div className="space-y-1.5"><Label>{t.selectDate}</Label><DatePicker value={selectedDate} onChange={setSelectedDate} /></div>
      <ScoreEntryGrid t={t} lang={lang} isMobile={isMobile} targets={approvedParents} questions={activeQs} getScore={getScore} setScore={setScore} getTotal={getTotal} isFreqDone={isFreqDone} onSubmit={handleSubmit} submitting={submitting} whoLabel={t.parent} emptyMsg={t.noQForMonth} />
      <EntryHistoryTable t={t} lang={lang} entries={parentEntries} people={parents} whoLabel={t.parent} onEdit={(e) => { setEditEntry(e); setEditScore(e.score); }} />
    </div>
  );
}

export function MyTeacherKPIPage({ t, lang, currentUser, selectedYear, setSelectedYear, termConfig }: SelfProps) {
  const tid = currentUser.id, cm = new Date().getMonth();
  const { entries: teacherEntries } = useEntriesForTarget("teacher", tid);
  const { monthKPI: getTchrMonthKPI, termKPI: getTchrTermKPI, yearKPI: getTchrYearKPI } = targetKpiHelpers(teacherEntries);
  const monthData = MONTHS.map((m, i) => ({ label: T[lang][m].slice(0, 3), val: getTchrMonthKPI(tid, i, selectedYear) }));
  const tchrYears = [...new Set([...teacherEntries.filter(e => e.targetId === tid).map(e => e.year), selectedYear])].sort((a, b) => b - a);
  return (
    <div className={PAGE}>
      <div className={HEAD}>
        <div><h2 className={TITLE}>{t.myTchrKPI}</h2><p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? currentUser.name : (currentUser.nameEn || currentUser.name)}</p></div>
        <YearSelector lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={tchrYears.length > 0 ? tchrYears : [selectedYear]} />
      </div>
      <div className={GRID4}>
        <StatCard icon={<CalendarDays />} value={getTchrMonthKPI(tid, cm, selectedYear)} label={T[lang][MONTHS[cm]] + " " + t.myMonthly} />
        <StatCard icon={<BarChart3 />} value={getTchrYearKPI(tid, selectedYear)} label={selectedYear + " " + t.myYearly} />
        <StatCard icon={<Trophy />} value={getTchrTermKPI(tid, termConfig.term1, selectedYear)} label={t.term1} />
        <StatCard icon={<Target />} value={getTchrTermKPI(tid, termConfig.term2, selectedYear)} label={t.term2} />
      </div>
      <ChartCard title={`📈 ${t.progressChart} — ${selectedYear}`} data={monthData} cm={cm} />
      <TermBreakdown t={t} lang={lang} termConfig={termConfig} selectedYear={selectedYear} getTermKPI={getTchrTermKPI} id={tid} />
    </div>
  );
}

export function MyParentKPIPage({ t, lang, currentUser, selectedYear, setSelectedYear, termConfig }: SelfProps) {
  const pid = currentUser.id, cm = new Date().getMonth();
  const { entries: parentEntries } = useEntriesForTarget("parent", pid);
  const { monthKPI: getParMonthKPI, termKPI: getParTermKPI, yearKPI: getParYearKPI } = targetKpiHelpers(parentEntries);
  const monthData = MONTHS.map((m, i) => ({ label: T[lang][m].slice(0, 3), val: getParMonthKPI(pid, i, selectedYear) }));
  const parYears = [...new Set([...parentEntries.filter(e => e.targetId === pid).map(e => e.year), selectedYear])].sort((a, b) => b - a);
  return (
    <div className={PAGE}>
      <div className={HEAD}>
        <div><h2 className={TITLE}>{t.myKPI}</h2><p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? currentUser.name : (currentUser.nameEn || currentUser.name)}</p></div>
        <YearSelector lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={parYears.length > 0 ? parYears : [selectedYear]} />
      </div>
      <div className={GRID4}>
        <StatCard icon={<CalendarDays />} value={getParMonthKPI(pid, cm, selectedYear)} label={T[lang][MONTHS[cm]] + " " + t.myMonthly} />
        <StatCard icon={<BarChart3 />} value={getParYearKPI(pid, selectedYear)} label={selectedYear + " " + t.myYearly} />
        <StatCard icon={<Trophy />} value={getParTermKPI(pid, termConfig.term1, selectedYear)} label={t.term1} />
        <StatCard icon={<Target />} value={getParTermKPI(pid, termConfig.term2, selectedYear)} label={t.term2} />
      </div>
      <ChartCard title={`📈 ${t.progressChart} — ${selectedYear}`} data={monthData} cm={cm} />
      <TermBreakdown t={t} lang={lang} termConfig={termConfig} selectedYear={selectedYear} getTermKPI={getParTermKPI} id={pid} />
    </div>
  );
}

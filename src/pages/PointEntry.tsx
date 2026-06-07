import { useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { useIsMobile } from "../composables";
import { getWeekNumber, errMsg, cn } from "../lib";
import { Tabs, ErrorNote } from "../components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDbStudents } from "../api/students";
import { useDbTeachers } from "../api/teachers";
import { useDbQuestions } from "../api/questions";
import { useDbStudentEntries, insertEntries, updateEntryScore } from "../api/entries";
import type { Dict, Lang, SessionUser, SubjectAssignment, StudentEntry } from "../types";

type Scores = Record<string, Record<string, number>>;
interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; isAdmin: boolean; }

const roleBadge = (r?: string | null) =>
  r === "classTeacher" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    : r === "subjectTeacher" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
const EMPTY = "py-8 text-center text-muted-foreground";

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
  const editMax = editEntry ? (questions.find(q => q.id === editEntry.questionId)?.points || editEntry.maxPoints || 0) : 0;
  const editInfoTc = editEntry ? teachers.find(x => x.id === editEntry.teacherId) : undefined;
  const editInfoSt = editEntry ? students.find(x => x.id === editEntry.studentId) : undefined;
  const filterDefs = [
    { l: lang === "bn" ? "বছর" : "Year", v: fYr, set: setFYr, opts: [{ v: "all", l: lang === "bn" ? "সব" : "All" }, ...entryYears.map(y => ({ v: String(y), l: String(y) }))] },
    { l: lang === "bn" ? "শিক্ষক" : "Teacher", v: fTc, set: setFTc, opts: [{ v: "all", l: lang === "bn" ? "সবাই" : "All" }, ...teachers.map(tc => ({ v: tc.id, l: (lang === "bn" ? tc.name : tc.nameEn) || "" }))] },
    { l: lang === "bn" ? "শিক্ষার্থী" : "Student", v: fSt, set: setFSt, opts: [{ v: "all", l: lang === "bn" ? "সবাই" : "All" }, ...students.map(s => ({ v: s.id, l: `${lang === "bn" ? s.name : s.nameEn}` }))] },
    { l: lang === "bn" ? "মাস" : "Month", v: fMo, set: setFMo, opts: [{ v: "all", l: lang === "bn" ? "সব" : "All" }, ...MONTHS.map((m, i) => ({ v: String(i), l: T[lang][m] }))] },
    { l: lang === "bn" ? "ভূমিকা" : "Role", v: fRo, set: setFRo, opts: [{ v: "all", l: lang === "bn" ? "সব" : "All" }, { v: "classTeacher", l: t.classTeacher }, { v: "subjectTeacher", l: t.subjectTeacher }, { v: "guideTeacher", l: t.guideTeacher }] },
  ];
  const maxPts = roleQs.reduce((acc, q) => acc + q.points, 0);
  const showGrid = curStudents.length > 0 && roleQs.length > 0 && (activeRole !== "subjectTeacher" || selectedAssign);
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.pointEntry}</h2>
      <ErrorNote lang={lang} error={loadErr} />

      <div className="space-y-1.5"><Label>{t.selectDate}</Label><Input type="date" className="w-50" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
      <Tabs items={tabs} active={activeRole} onChange={(k) => { setActiveRole(k); setAllScores({}); setSelectedAssign(null); }} />

      {activeRole === "subjectTeacher" && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <Label>{lang === "bn" ? "শ্রেণী ও বিষয় নির্বাচন" : "Select Class & Subject"}</Label>
            <div className="flex flex-wrap gap-2">
              {(isAdmin ? [{ class: "8", section: "A", subject: "গণিত/Math" }] : subjectAssignments).map((a, i) => (
                <Button key={i} variant={selectedAssign === a ? "default" : "outline"} size="sm" onClick={() => { setSelectedAssign(a); setAllScores({}); }}>{t.class}{a.class}{a.section}—{a.subject}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {activeRole === "guideTeacher" && <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">⚠️ {lang === "bn" ? "গাইড শিক্ষক সপ্তাহে ১ বার।" : "Guide teacher: once per week."}</div>}

      {activeRole === "classTeacher" && !isAdmin && !currentUser.classTeacher && <div className={EMPTY}>{t.noClassRole}</div>}
      {activeRole === "subjectTeacher" && !selectedAssign && <div className={EMPTY}>{t.selectClassSubject}</div>}
      {(activeRole !== "subjectTeacher" || selectedAssign) && (activeRole !== "classTeacher" || isAdmin || currentUser.classTeacher) && roleQs.length === 0 && <div className={EMPTY}>{lang === "bn" ? "এই ভূমিকা ও মাসের জন্য কোনো প্রশ্ন নেই — প্রশ্নমালায় এই ভূমিকার প্রশ্ন যোগ করুন" : "No questions for this role & month — add some in Questions first"}</div>}
      {(activeRole !== "subjectTeacher" || selectedAssign) && (activeRole !== "classTeacher" || isAdmin || currentUser.classTeacher) && roleQs.length > 0 && curStudents.length === 0 && <div className={EMPTY}>{lang === "bn" ? "কোনো শিক্ষার্থী পাওয়া যায়নি — অনুমতি (RLS) বা নিয়োগ যাচাই করুন" : "No students found — check permissions (RLS) or assignment"}</div>}

      {showGrid && (isMobile ? (
        <div className="flex flex-col gap-3">
          {curStudents.map((s) => { const wd = activeRole === "guideTeacher" && weekDoneCheck(s.id); return (
            <Card key={s.id} style={{ opacity: wd ? 0.65 : 1 }}>
              <CardContent className="pt-6">
                <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                  <div><div className="text-sm font-bold text-foreground">{lang === "bn" ? s.name : s.nameEn}</div><div className="text-xs text-muted-foreground">{s.systemId} · {t.class}{s.class}{s.section} · Roll {s.roll}</div></div>
                  <div className="ml-2 shrink-0 text-right"><div className="text-2xl font-black leading-none text-foreground">{getTotal(s.id)}</div><div className="text-xs text-muted-foreground">/{maxPts} pts</div></div>
                </div>
                {wd && <div className="mb-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">⚠️ {lang === "bn" ? "এই সপ্তাহে পয়েন্ট দেওয়া হয়েছে" : "Already submitted this week"}</div>}
                {roleQs.map(q => { const qd = isQFreqDone(s.id, q.id); return (
                  <div key={q.id} className="flex items-center justify-between border-b border-border py-2.5">
                    <div className="mr-3 flex-1"><div className="text-sm font-medium text-foreground">{lang === "bn" ? q.textBn : q.textEn}</div><div className="text-xs text-muted-foreground">{freqLabel(q.frequency)} · max {q.points}</div></div>
                    {qd ? <div className="grid h-11 w-16 place-items-center rounded-lg bg-green-100 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-300">✓</div> : <Input type="number" min={0} max={q.points} disabled={wd} className="h-11 w-16 text-center text-lg font-bold" value={getScore(s.id, q.id)} onChange={e => setScore(s.id, q.id, e.target.value)} placeholder="0" />}
                  </div>
                ); })}
              </CardContent>
            </Card>
          ); })}
          <Button onClick={handleSubmit} disabled={submitting} size="lg" className="w-full">{submitting ? (lang === "bn" ? "জমা হচ্ছে…" : "Submitting…") : t.submitPoints}</Button>
        </div>
      ) : (
        <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="min-w-30">{lang === "bn" ? "শিক্ষার্থী" : "Student"}</TableHead>
                {roleQs.map(q => (<TableHead key={q.id} className="min-w-20 text-center"><div className="text-xs font-semibold text-muted-foreground">{lang === "bn" ? q.textBn : q.textEn}</div><div className="text-xs text-foreground">/{q.points}</div><div className="text-[10px] text-muted-foreground">{freqLabel(q.frequency)}</div></TableHead>))}
                <TableHead className="min-w-16 text-center">{lang === "bn" ? "মোট" : "Total"}</TableHead>
                {activeRole === "guideTeacher" && <TableHead className="min-w-16">{lang === "bn" ? "অবস্থা" : "Status"}</TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {curStudents.map((s) => { const wd = activeRole === "guideTeacher" && weekDoneCheck(s.id); return (
                  <TableRow key={s.id} style={{ opacity: wd ? 0.5 : 1 }}>
                    <TableCell><div className="text-sm font-semibold">{lang === "bn" ? s.name : s.nameEn}</div><div className="text-xs text-muted-foreground">{s.systemId}</div></TableCell>
                    {roleQs.map(q => { const qd = isQFreqDone(s.id, q.id); return (<TableCell key={q.id} className="text-center">{qd ? <span className="text-xs font-semibold text-muted-foreground">✓</span> : <Input type="number" min={0} max={q.points} disabled={wd} className="mx-auto h-9 w-14 text-center font-bold" value={getScore(s.id, q.id)} onChange={e => setScore(s.id, q.id, e.target.value)} placeholder="0" />}</TableCell>); })}
                    <TableCell className="text-center"><strong className="text-base text-foreground">{getTotal(s.id)}</strong><div className="text-xs text-muted-foreground">/{maxPts}</div></TableCell>
                    {activeRole === "guideTeacher" && <TableCell>{wd ? <span className="text-xs font-semibold text-destructive">⚠️{lang === "bn" ? "দেওয়া" : "Done"}</span> : <span className="text-xs font-semibold text-green-600 dark:text-green-400">✅{lang === "bn" ? "বাকি" : "Pending"}</span>}</TableCell>}
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
            <div className="flex justify-end p-4"><Button onClick={handleSubmit} disabled={submitting}>{submitting ? (lang === "bn" ? "জমা হচ্ছে…" : "Submitting…") : t.submitPoints}</Button></div>
        </Card>
      ))}

      <Card className="overflow-hidden">
        <CardHeader><CardTitle className="text-base">{lang === "bn" ? "এন্ট্রি তালিকা" : "Entry List"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isAdmin && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-4 sm:grid-cols-3 lg:grid-cols-6">
              {filterDefs.map(({ l, v, set, opts }) => (
                <div key={l} className="space-y-1"><Label className="text-xs">{l}</Label><Select value={v} onValueChange={set}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{opts.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent></Select></div>
              ))}
              <div className="flex items-end"><Button variant="outline" className="w-full gap-1" onClick={() => { setFTc("all"); setFSt("all"); setFYr("all"); setFMo("all"); setFRo("all"); }}><RotateCcw className="h-4 w-4" />{lang === "bn" ? "রিসেট" : "Reset"}</Button></div>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{lang === "bn" ? `${filtered.length}টি এন্ট্রি` : `${filtered.length} entries`}</div>
        </CardContent>
        <div className="border-t border-border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{lang === "bn" ? "তারিখ" : "Date"}</TableHead>
              <TableHead>{lang === "bn" ? "শিক্ষক" : "Teacher"}</TableHead>
              <TableHead>{lang === "bn" ? "শিক্ষার্থী" : "Student"}</TableHead>
              <TableHead>{lang === "bn" ? "ভূমিকা" : "Role"}</TableHead>
              <TableHead>{lang === "bn" ? "প্রশ্ন" : "Q"}</TableHead>
              <TableHead>{t.points}</TableHead>
              {isAdmin && <TableHead>✏️</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((e) => { const s = students.find(x => x.id === e.studentId), q = questions.find(x => x.id === e.questionId), tc = teachers.find(x => x.id === e.teacherId), edited = (e.editLog || []).length > 0; const rL = e.role === "classTeacher" ? t.classTeacher : e.role === "subjectTeacher" ? t.subjectTeacher : t.guideTeacher;
                return (
                  <TableRow key={e.id}>
                    <TableCell>{e.date}</TableCell>
                    <TableCell><div className="text-sm">{lang === "bn" ? tc?.name : tc?.nameEn}</div>{edited && <Badge variant="secondary" className="text-[10px]">✏️{lang === "bn" ? "সম্পাদিত" : "Edited"}</Badge>}</TableCell>
                    <TableCell>{lang === "bn" ? s?.name : s?.nameEn}</TableCell>
                    <TableCell><Badge className={cn("border-transparent text-xs font-semibold", roleBadge(e.role))}>{rL}</Badge></TableCell>
                    <TableCell><div className="max-w-30 truncate text-sm">{lang === "bn" ? (q?.textBn || e.questionText) : (q?.textEn || e.questionTextEn)}</div></TableCell>
                    <TableCell>{edited ? <span><span className="mr-1 text-xs text-muted-foreground line-through">{e.editLog[0].oldScore}</span><strong className="text-foreground">{e.score}</strong></span> : <strong className="text-foreground">{e.score}</strong>}</TableCell>
                    {isAdmin && <TableCell><Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { setEditEntry(e); setEditScore(e.score); }}><Pencil className="h-3.5 w-3.5" /></Button></TableCell>}
                  </TableRow>
                ); })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!editEntry && isAdmin} onOpenChange={(o) => { if (!o) setEditEntry(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>✏️ {lang === "bn" ? "পয়েন্ট সম্পাদনা" : "Edit Points"}</DialogTitle></DialogHeader>
          {editEntry && <>
            <div className="space-y-1 rounded-lg bg-muted p-4 text-sm">
              <div><span className="font-semibold text-muted-foreground">{lang === "bn" ? "শিক্ষার্থী" : "Student"}:</span> {lang === "bn" ? editInfoSt?.name : editInfoSt?.nameEn}</div>
              <div><span className="font-semibold text-muted-foreground">{lang === "bn" ? "শিক্ষক" : "Teacher"}:</span> {lang === "bn" ? editInfoTc?.name : editInfoTc?.nameEn} ({editEntry.date})</div>
              <div><span className="font-semibold text-muted-foreground">{lang === "bn" ? "বর্তমান" : "Current"}:</span> {editEntry.score}/{editMax}</div>
            </div>
            {(editEntry.editLog || []).length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <div className="mb-1 text-xs font-bold">{lang === "bn" ? "ইতিহাস" : "History"}</div>
                {editEntry.editLog.map((log, i) => (<div key={i} className="text-xs">{log.editedAt}: {log.oldScore}→{log.newScore}</div>))}
              </div>
            )}
            <div className="space-y-1.5"><Label>{lang === "bn" ? "নতুন পয়েন্ট" : "New Score"} (max:{editMax})</Label><Input type="number" min={0} max={editMax} className="w-32 text-lg font-bold" value={editScore} onChange={e => setEditScore(Math.min(parseInt(e.target.value) || 0, editMax))} /></div>
            <DialogFooter><Button variant="outline" onClick={() => setEditEntry(null)}>{t.cancel}</Button><Button onClick={handleEditSave}>{t.save}</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

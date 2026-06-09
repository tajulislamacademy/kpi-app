import { useState, useMemo } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { T } from "../i18n";
import { MONTHS, CLASSES, SECTIONS, SUBJECTS } from "../constants";
import { useIsMobile } from "../composables";
import { getWeekNumber, inSamePeriod, errMsg, cn } from "../lib";
import { Tabs, ErrorNote, Combobox, DatePicker, Page } from "../components";
import { teacherRoleBadge, teacherRoleLabel } from "../labels";
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
import { useStudentEntriesForStudents, useRecentStudentEntries, useKpiYears, insertEntries, updateEntryScore } from "../api/entries";
import type { Dict, Lang, SessionUser, SubjectAssignment, StudentEntry } from "../types";

type Scores = Record<string, Record<string, number>>;
interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; isAdmin: boolean; }

const EMPTY = "py-8 text-center text-muted-foreground";

export function PointEntryPage({ t, lang, currentUser, showNotif, isAdmin }: Props) {
  const isMobile = useIsMobile();
  const { students, error: e1 } = useDbStudents(true);
  const { questions: allQuestions, error: e2 } = useDbQuestions(true);
  const questions = allQuestions.filter(q => q.category === "student");
  const { teachers, error: e3 } = useDbTeachers(true);
  const loadErr = e1 || e2 || e3;
  const [activeRole, setActiveRole] = useState("classTeacher");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedAssign, setSelectedAssign] = useState<SubjectAssignment | null>(null);
  // Admin scope picker (admins have no teaching assignment, so they choose any class/section/subject).
  const [adminClass, setAdminClass] = useState("8");
  const [adminSection, setAdminSection] = useState("A");
  const [adminSubject, setAdminSubject] = useState<string>(SUBJECTS[0]);
  const [allScores, setAllScores] = useState<Scores>({});
  const [editEntry, setEditEntry] = useState<StudentEntry | null>(null);
  const [editScore, setEditScore] = useState<number | string>("");
  const [fTc, setFTc] = useState("all"), [fSt, setFSt] = useState("all"), [fYr, setFYr] = useState("all"), [fMo, setFMo] = useState("all"), [fRo, setFRo] = useState("all");
  const cm = new Date(selectedDate).getMonth(), cw = getWeekNumber(selectedDate), cy = new Date(selectedDate).getFullYear();
  const ct = currentUser.classTeacher;
  // For admins the class/section comes from the scope picker; teachers use their assignment.
  const classStudents = ct ? students.filter(s => s.class === ct.class && s.section === ct.section)
    : isAdmin ? students.filter(s => s.class === adminClass && s.section === adminSection) : [];
  const subjectAssignments = currentUser.subjectAssignments || [];
  // Effective subject assignment: admin = picked class/section/subject; teacher = selected one.
  const effAssign: SubjectAssignment | null = isAdmin ? { class: adminClass, section: adminSection, subject: adminSubject } : selectedAssign;
  const subjectStudents = effAssign ? students.filter(s => s.class === effAssign.class && s.section === effAssign.section) : [];
  const guideIds = currentUser.guideStudents || [];
  const guideStudents = isAdmin ? students.filter(s => s.class === adminClass && s.section === adminSection) : students.filter(s => guideIds.includes(s.id));
  const roleQs = questions.filter(q => q.role === activeRole && q.activeMonths.includes(cm));
  const curStudents = activeRole === "classTeacher" ? classStudents : activeRole === "subjectTeacher" ? subjectStudents : guideStudents;
  const curStudentIds = curStudents.map(s => s.id); // hook keys by sorted ids, so a fresh array here is fine
  // Grid freq-checks load only the displayed class's entries for the year; the
  // review list loads recent entries (own, for a teacher) — neither unbounded.
  const { entries: gridEntries, reload: reloadGrid } = useStudentEntriesForStudents(curStudentIds, cy);
  const { entries: histEntries, reload: reloadHist } = useRecentStudentEntries(isAdmin ? null : currentUser.id, 500);
  const reloadEntries = async () => { await reloadGrid(); await reloadHist(); };
  const weekDoneCheck = (sid: string) => gridEntries.some(e => e.studentId === sid && e.teacherId === currentUser.id && e.role === "guideTeacher" && getWeekNumber(e.date) === cw && new Date(e.date).getFullYear() === cy);
  const isQFreqDone = (sid: string, qid: string) => { const q = questions.find(x => x.id === qid); return gridEntries.some(e => e.studentId === sid && e.questionId === qid && inSamePeriod(e, q?.frequency, selectedDate)); };
  const setScore = (sid: string, qid: string, val: string) => { const max = questions.find(q => q.id === qid)?.points || 0; setAllScores(p => ({ ...p, [sid]: { ...(p[sid] || {}), [qid]: Math.max(0, Math.min(parseInt(val, 10) || 0, max)) } })); };
  const getScore = (sid: string, qid: string): number | string => allScores[sid]?.[qid] ?? "";
  const getTotal = (sid: string) => roleQs.reduce((s, q) => s + (allScores[sid]?.[q.id] || 0), 0);
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    const rows: Record<string, unknown>[] = [];
    curStudents.forEach(s => {
      if (activeRole === "guideTeacher" && weekDoneCheck(s.id)) return;
      roleQs.forEach(q => {
        if (isQFreqDone(s.id, q.id)) return; // skip questions already entered for this period
        rows.push({ target_type: "student", target_id: s.id, entered_by: currentUser.id, question_id: q.id, question_text: q.textBn, question_text_en: q.textEn, max_points: q.points, score: allScores[s.id]?.[q.id] || 0, role: activeRole, subject: effAssign?.subject || "", month: cm, year: cy, entry_date: selectedDate, edit_log: [] });
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
    const ns = Math.max(0, Math.min(parseInt(String(editScore), 10) || 0, max));
    try {
      await updateEntryScore(editEntry.id, ns, editEntry.score, "admin");
      await reloadEntries();
      setEditEntry(null); showNotif(lang === "bn" ? "সম্পাদনা সফল!" : "Edited!");
    } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
  };
  const { years: kpiYears } = useKpiYears();
  const entryYears = useMemo(() => { const ys = [...kpiYears]; if (!ys.includes(cy)) ys.push(cy); return ys.sort((a, b) => b - a); }, [kpiYears, cy]);
  // histEntries is already scoped (own, for a teacher) + recent-limited; filters apply within it.
  const filtered = useMemo(() => histEntries.filter(e => fTc === "all" || e.teacherId === fTc).filter(e => fSt === "all" || e.studentId === fSt).filter(e => fYr === "all" || (e.year || 2026) === parseInt(fYr)).filter(e => fMo === "all" || e.month === parseInt(fMo)).filter(e => fRo === "all" || e.role === fRo), [histEntries, fTc, fSt, fYr, fMo, fRo]);
  // id → record maps so the entry-list render is O(rows) not O(rows × people).
  const stMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);
  const tcMap = useMemo(() => new Map(teachers.map(x => [x.id, x])), [teachers]);
  const qMap = useMemo(() => new Map(allQuestions.map(q => [q.id, q])), [allQuestions]);
  const tabs = [{ key: "classTeacher", label: t.classTeacher, show: isAdmin || !!currentUser.classTeacher }, { key: "subjectTeacher", label: t.subjectTeacher, show: isAdmin || subjectAssignments.length > 0 }, { key: "guideTeacher", label: t.guideTeacher, show: isAdmin || guideIds.length > 0 }].filter(x => x.show);
  const freqLabel = (f?: string) => { const map: Record<string, string> = { daily: t.daily, weekly: t.weekly, monthly: t.monthly, quarterly: t.quarterly, annual: t.annual }; return map[f || "monthly"] || t.monthly; };
  const editMax = editEntry ? (questions.find(q => q.id === editEntry.questionId)?.points || editEntry.maxPoints || 0) : 0;
  const editInfoTc = editEntry ? teachers.find(x => x.id === editEntry.teacherId) : undefined;
  const editInfoSt = editEntry ? students.find(x => x.id === editEntry.studentId) : undefined;
  const filterDefs = [
    { l: lang === "bn" ? "বছর" : "Year", v: fYr, set: setFYr, searchable: false, opts: [{ v: "all", l: lang === "bn" ? "সব" : "All" }, ...entryYears.map(y => ({ v: String(y), l: String(y) }))] },
    { l: lang === "bn" ? "শিক্ষক" : "Teacher", v: fTc, set: setFTc, searchable: true, opts: [{ v: "all", l: lang === "bn" ? "সবাই" : "All" }, ...teachers.map(tc => ({ v: tc.id, l: (lang === "bn" ? tc.name : tc.nameEn) || "" }))] },
    { l: lang === "bn" ? "শিক্ষার্থী" : "Student", v: fSt, set: setFSt, searchable: true, opts: [{ v: "all", l: lang === "bn" ? "সবাই" : "All" }, ...students.map(s => ({ v: s.id, l: `${lang === "bn" ? s.name : s.nameEn}` }))] },
    { l: lang === "bn" ? "মাস" : "Month", v: fMo, set: setFMo, searchable: false, opts: [{ v: "all", l: lang === "bn" ? "সব" : "All" }, ...MONTHS.map((m, i) => ({ v: String(i), l: T[lang][m] }))] },
    { l: lang === "bn" ? "ভূমিকা" : "Role", v: fRo, set: setFRo, searchable: false, opts: [{ v: "all", l: lang === "bn" ? "সব" : "All" }, { v: "classTeacher", l: t.classTeacher }, { v: "subjectTeacher", l: t.subjectTeacher }, { v: "guideTeacher", l: t.guideTeacher }] },
  ];
  const maxPts = roleQs.reduce((acc, q) => acc + q.points, 0);
  const showGrid = curStudents.length > 0 && roleQs.length > 0 && (activeRole !== "subjectTeacher" || effAssign);
  return (
    <Page>
      <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.pointEntry}</h2>
      <ErrorNote lang={lang} error={loadErr} />

      <div className="space-y-1.5"><Label>{t.selectDate}</Label><DatePicker value={selectedDate} onChange={setSelectedDate} /></div>
      <Tabs items={tabs} active={activeRole} onChange={(k) => { setActiveRole(k); setAllScores({}); setSelectedAssign(null); }} />

      {isAdmin && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-6">
            <div className="space-y-1.5"><Label>{t.class}</Label><Select value={adminClass} onValueChange={v => { setAdminClass(v); setAllScores({}); }}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>{t.section}</Label><Select value={adminSection} onValueChange={v => { setAdminSection(v); setAllScores({}); }}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            {activeRole === "subjectTeacher" && <div className="space-y-1.5"><Label>{lang === "bn" ? "বিষয়" : "Subject"}</Label><Select value={adminSubject} onValueChange={v => { setAdminSubject(v); setAllScores({}); }}><SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger><SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>}
          </CardContent>
        </Card>
      )}
      {!isAdmin && activeRole === "subjectTeacher" && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <Label>{lang === "bn" ? "শ্রেণী ও বিষয় নির্বাচন" : "Select Class & Subject"}</Label>
            <div className="flex flex-wrap gap-2">
              {subjectAssignments.map((a, i) => (
                <Button key={i} variant={selectedAssign === a ? "default" : "outline"} size="sm" onClick={() => { setSelectedAssign(a); setAllScores({}); }}>{t.class}{a.class}{a.section}—{a.subject}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {activeRole === "guideTeacher" && <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">⚠️ {lang === "bn" ? "গাইড শিক্ষক সপ্তাহে ১ বার।" : "Guide teacher: once per week."}</div>}

      {activeRole === "classTeacher" && !isAdmin && !currentUser.classTeacher && <div className={EMPTY}>{t.noClassRole}</div>}
      {activeRole === "subjectTeacher" && !effAssign && <div className={EMPTY}>{t.selectClassSubject}</div>}
      {(activeRole !== "subjectTeacher" || effAssign) && (activeRole !== "classTeacher" || isAdmin || currentUser.classTeacher) && roleQs.length === 0 && <div className={EMPTY}>{lang === "bn" ? "এই ভূমিকা ও মাসের জন্য কোনো প্রশ্ন নেই — প্রশ্নমালায় এই ভূমিকার প্রশ্ন যোগ করুন" : "No questions for this role & month — add some in Questions first"}</div>}
      {(activeRole !== "subjectTeacher" || effAssign) && (activeRole !== "classTeacher" || isAdmin || currentUser.classTeacher) && roleQs.length > 0 && curStudents.length === 0 && <div className={EMPTY}>{lang === "bn" ? "কোনো শিক্ষার্থী পাওয়া যায়নি — অনুমতি (RLS) বা নিয়োগ যাচাই করুন" : "No students found — check permissions (RLS) or assignment"}</div>}

      {showGrid && (isMobile ? (
        <div className="flex flex-col gap-3">
          {curStudents.map((s) => { const wd = activeRole === "guideTeacher" && weekDoneCheck(s.id); return (
            <Card key={s.id} style={{ opacity: wd ? 0.65 : 1 }}>
              <CardContent className="pt-6">
                <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
                  <div><div className="text-sm font-bold text-foreground">{lang === "bn" ? s.name : s.nameEn}</div><div className="text-xs text-muted-foreground">{s.systemId} · {t.class}{s.class}{s.section} · Roll {s.roll}</div></div>
                  <div className="ml-2 shrink-0 text-right"><div className="text-2xl font-black leading-none text-foreground">{getTotal(s.id)}</div><div className="text-xs text-muted-foreground">/{maxPts} pts</div></div>
                </div>
                {wd && <div className="mb-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">⚠️ {lang === "bn" ? "এই সপ্তাহে পয়েন্ট দেওয়া হয়েছে" : "Already submitted this week"}</div>}
                {roleQs.map(q => { const qd = isQFreqDone(s.id, q.id); return (
                  <div key={q.id} className="flex items-center justify-between border-b border-border/50 py-2.5">
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
              {filterDefs.map(({ l, v, set, opts, searchable }) => (
                <div key={l} className="space-y-1"><Label className="text-xs">{l}</Label>
                  {searchable
                    ? <Combobox options={opts.map(o => ({ value: o.v, label: o.l }))} value={v} onChange={set} placeholder={l} searchPlaceholder={lang === "bn" ? "খুঁজুন…" : "Search…"} className="h-9 border border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-transparent" />
                    : <Select value={v} onValueChange={set}><SelectTrigger className="h-9 w-full border border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-transparent"><SelectValue /></SelectTrigger><SelectContent>{opts.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent></Select>}
                </div>
              ))}
              <div className="flex items-end"><Button variant="outline" className="w-full gap-1" onClick={() => { setFTc("all"); setFSt("all"); setFYr("all"); setFMo("all"); setFRo("all"); }}><RotateCcw className="h-4 w-4" />{lang === "bn" ? "রিসেট" : "Reset"}</Button></div>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{lang === "bn" ? `${filtered.length}টি এন্ট্রি` : `${filtered.length} entries`}</div>
        </CardContent>
        <div className="border-t border-border/50">
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
              {filtered.map((e) => { const s = stMap.get(e.studentId), q = e.questionId ? qMap.get(e.questionId) : undefined, tc = e.teacherId ? tcMap.get(e.teacherId) : undefined, edited = (e.editLog || []).length > 0; const rL = teacherRoleLabel(t, e.role);
                return (
                  <TableRow key={e.id}>
                    <TableCell>{e.date}</TableCell>
                    <TableCell><div className="text-sm">{lang === "bn" ? tc?.name : tc?.nameEn}</div>{edited && <Badge variant="secondary" className="text-[10px]">✏️{lang === "bn" ? "সম্পাদিত" : "Edited"}</Badge>}</TableCell>
                    <TableCell>{lang === "bn" ? s?.name : s?.nameEn}</TableCell>
                    <TableCell><Badge className={cn("border-transparent text-xs font-semibold", teacherRoleBadge(e.role))}>{rL}</Badge></TableCell>
                    <TableCell><div className="max-w-30 truncate text-sm">{lang === "bn" ? (q?.textBn || e.questionText) : (q?.textEn || e.questionTextEn)}</div></TableCell>
                    <TableCell>{edited ? <span><span className="mr-1 text-xs text-muted-foreground line-through">{e.editLog[0].oldScore}</span><strong className="text-foreground">{e.score}</strong></span> : <strong className="text-foreground">{e.score}</strong>}</TableCell>
                    {isAdmin && <TableCell><Button size="icon" variant="outline" aria-label={t.edit} className="h-8 w-8" onClick={() => { setEditEntry(e); setEditScore(e.score); }}><Pencil className="h-3.5 w-3.5" /></Button></TableCell>}
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
            <div className="space-y-1.5"><Label>{lang === "bn" ? "নতুন পয়েন্ট" : "New Score"} (max:{editMax})</Label><Input type="number" min={0} max={editMax} className="w-32 text-lg font-bold" value={editScore} onChange={e => setEditScore(Math.max(0, Math.min(parseInt(e.target.value, 10) || 0, editMax)))} /></div>
            <DialogFooter><Button variant="outline" onClick={() => setEditEntry(null)}>{t.cancel}</Button><Button onClick={handleEditSave}>{t.save}</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </Page>
  );
}

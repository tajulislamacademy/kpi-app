import { useState } from "react";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { cn } from "../lib";
import { Tabs, ErrorNote, Combobox, YearSelector, EmptyState, Page } from "../components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";
import { useDbStudents } from "../api/students";
import { useDbTeachers } from "../api/teachers";
import { useDbParents } from "../api/parents";
import { useDbStudentEntries, useDbEntriesByTarget } from "../api/entries";
import type { Dict, Lang, SessionUser } from "../types";

interface Props { t: Dict; lang: Lang; currentUser: SessionUser; isAdmin: boolean; selectedYear: number; setSelectedYear: (y: number) => void; }
type TType = "student" | "teacher" | "parent";

const roleBadge = (r?: string | null) =>
  r === "classTeacher" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    : r === "subjectTeacher" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";

export function KpiDetailsPage({ t, lang, currentUser, isAdmin, selectedYear, setSelectedYear }: Props) {
  const { students, error: e1 } = useDbStudents(true);
  const { teachers, error: e2 } = useDbTeachers(true);
  const { parents, error: e3 } = useDbParents(true);
  const { entries: studentEntries, error: e4 } = useDbStudentEntries(true);
  const { entries: teacherEntries } = useDbEntriesByTarget("teacher", true);
  const { entries: parentEntries } = useDbEntriesByTarget("parent", true);
  const loadErr = e1 || e2 || e3 || e4;

  const isTeacher = currentUser.role === "teacher", isStudent = currentUser.role === "student";
  const ct = currentUser.classTeacher;
  const guideIds = currentUser.guideStudents || [];
  // Students a teacher may inspect (their guide + class-teacher roster).
  const scopedStudents = students.filter(s => guideIds.includes(s.id) || (ct && s.class === ct.class && s.section === ct.section));
  const scopedStudentIds = scopedStudents.map(s => s.id);
  const scopedParents = parents.filter(p => p.studentId && scopedStudentIds.includes(p.studentId));

  // Allowed target types + person list per role.
  const allowedTypes: TType[] = isAdmin ? ["student", "teacher", "parent"]
    : isTeacher ? ["student", "teacher", "parent"]
      : isStudent ? ["student"]
        : ["student", "parent"]; // parent: child + self
  const personsFor = (type: TType): { id: string; name: string; nameEn: string; systemId?: string }[] => {
    const map = (arr: { id: string; name?: string; nameEn?: string; systemId?: string }[]) => arr.map(x => ({ id: x.id, name: x.name || "", nameEn: x.nameEn || "", systemId: x.systemId }));
    if (isAdmin) return map(type === "student" ? students : type === "teacher" ? teachers : parents);
    if (isTeacher) {
      if (type === "student") return map(scopedStudents);
      if (type === "teacher") return map(teachers.filter(tc => tc.id === currentUser.id));
      return map(scopedParents);
    }
    if (isStudent) return map(students.filter(s => s.id === currentUser.id));
    // parent
    if (type === "student") return map(students.filter(s => s.id === currentUser.studentId));
    return map(parents.filter(p => p.id === currentUser.id));
  };

  const [tType, setTType] = useState<TType>(allowedTypes[0]);
  const persons = personsFor(tType);
  const [targetId, setTargetId] = useState<string>("");
  const effId = targetId && persons.some(p => p.id === targetId) ? targetId : (persons[0]?.id || "");
  const [selMonth, setSelMonth] = useState(new Date().getMonth());

  const teacherName = (id?: string | null) => { const tc = teachers.find(x => x.id === id); return tc ? (lang === "bn" ? tc.name : tc.nameEn) : (lang === "bn" ? "অ্যাডমিন" : "Admin"); };
  const roleLabel = (r?: string | null) => r === "classTeacher" ? t.classTeacher : r === "subjectTeacher" ? t.subjectTeacher : r === "guideTeacher" ? t.guideTeacher : "—";

  // Rows for the selected target/month/year (snapshot text → deleted questions still show).
  const rows = (tType === "student"
    ? studentEntries.filter(e => e.studentId === effId && e.month === selMonth && (e.year || selectedYear) === selectedYear).map(e => ({ id: e.id, date: e.date, q: lang === "bn" ? e.questionText : e.questionTextEn, role: e.role, who: teacherName(e.teacherId), score: e.score, max: e.maxPoints || 0 }))
    : (tType === "teacher" ? teacherEntries : parentEntries).filter(e => e.targetId === effId && e.month === selMonth && e.year === selectedYear).map(e => ({ id: e.id, date: e.date, q: lang === "bn" ? e.questionText : e.questionTextEn, role: null as string | null, who: "", score: e.score, max: e.maxPoints || 0 })))
    .sort((a, b) => a.date.localeCompare(b.date));
  const total = rows.reduce((s, r) => s + r.score, 0);
  const maxTotal = rows.reduce((s, r) => s + r.max, 0);

  const allYears = [...new Set([...studentEntries.map(e => e.year || 2026), ...teacherEntries.map(e => e.year), ...parentEntries.map(e => e.year), selectedYear])].sort((a, b) => b - a);
  const typeLabel = (ty: TType) => ty === "student" ? t.student : ty === "teacher" ? t.teacher : t.parent;
  const showStudentCols = tType === "student";

  return (
    <Page>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{lang === "bn" ? "বিস্তারিত KPI" : "KPI Details"}</h2>
        <YearSelector lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={allYears} />
      </div>
      <ErrorNote lang={lang} error={loadErr} />

      {allowedTypes.length > 1 && (
        <Tabs items={allowedTypes.map(ty => ({ key: ty, label: typeLabel(ty) }))} active={tType} onChange={(k) => { setTType(k as TType); setTargetId(""); }} />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1 space-y-1.5">
          <Label>{lang === "bn" ? "ব্যক্তি" : "Person"}</Label>
          <Combobox
            options={persons.map(p => ({ value: p.id, label: `${lang === "bn" ? p.name : p.nameEn}${p.systemId ? ` · ${p.systemId}` : ""}` }))}
            value={effId}
            onChange={setTargetId}
            placeholder={lang === "bn" ? "নির্বাচন" : "Select"}
            searchPlaceholder={lang === "bn" ? "নাম/ID খুঁজুন…" : "Search name/ID…"}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t.month}</Label>
          <Select value={String(selMonth)} onValueChange={v => setSelMonth(parseInt(v))}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{T[lang][m]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{T[lang][MONTHS[selMonth]]} {selectedYear} — {lang === "bn" ? "বিস্তারিত" : "Details"}</CardTitle>
          {rows.length > 0 && <Badge variant="secondary" className="text-sm">{lang === "bn" ? "মোট" : "Total"}: <span className="tabular-nums">{total}/{maxTotal}</span></Badge>}
        </CardHeader>
        <CardContent className="px-0">
          {!effId ? (
            <EmptyState icon={Inbox} title={lang === "bn" ? "ব্যক্তি নির্বাচন করুন" : "Select a person"} />
          ) : rows.length === 0 ? (
            <EmptyState icon={Inbox} title={lang === "bn" ? "এই মাসে কোনো এন্ট্রি নেই" : "No entries this month"} />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{lang === "bn" ? "তারিখ" : "Date"}</TableHead>
                <TableHead>{lang === "bn" ? "প্রশ্ন" : "Question"}</TableHead>
                {showStudentCols && <TableHead>{lang === "bn" ? "ভূমিকা" : "Role"}</TableHead>}
                {showStudentCols && <TableHead>{lang === "bn" ? "কে দিয়েছে" : "By"}</TableHead>}
                <TableHead className="text-right">{t.points}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums">{r.date}</TableCell>
                    <TableCell><div className="max-w-xs whitespace-normal text-sm">{r.q}</div></TableCell>
                    {showStudentCols && <TableCell><Badge className={cn("border-transparent text-xs font-semibold", roleBadge(r.role))}>{roleLabel(r.role)}</Badge></TableCell>}
                    {showStudentCols && <TableCell className="text-sm">{r.who}</TableCell>}
                    <TableCell className="text-right font-bold tabular-nums">{r.score}<span className="font-normal text-muted-foreground">/{r.max}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Page>
  );
}

import { useMemo } from "react";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { StatCard, RankCard, BarChart, YearSelector, TermBreakdown, ErrorNote } from "../components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDbStudents } from "../api/students";
import { useDbTeachers } from "../api/teachers";
import { useDbStudentEntries, studentKpiHelpers } from "../api/entries";
import type { Dict, Lang, SessionUser, TermConfig, Parent } from "../types";

interface AdminProps { t: Dict; lang: Lang; currentUser: SessionUser; isAdmin: boolean; selectedYear: number; setSelectedYear: (y: number) => void; pendingParents: Parent[]; }
interface SelfProps { t: Dict; lang: Lang; currentUser: SessionUser; selectedYear: number; setSelectedYear: (y: number) => void; termConfig: TermConfig; }

const PAGE = "mx-auto max-w-6xl space-y-4 p-4 sm:p-6";
const HEAD = "flex flex-wrap items-start justify-between gap-3";
const TITLE = "text-xl font-extrabold text-foreground sm:text-2xl";
const SUB = "mt-1 text-sm text-muted-foreground";
const GRID4 = "grid grid-cols-2 gap-3 sm:grid-cols-4";

function ChartCard({ title, data, cm }: { title: string; data: { label: string; val: number }[]; cm: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent><BarChart data={data} cm={cm} /></CardContent>
    </Card>
  );
}

export function AdminTeacherDashboard({ t, lang, currentUser, isAdmin, selectedYear, setSelectedYear, pendingParents }: AdminProps) {
  const cm = new Date().getMonth();
  const { students, error: e1 } = useDbStudents(true);
  const { teachers, error: e2 } = useDbTeachers(true);
  const { entries, error: e3 } = useDbStudentEntries(true);
  const helpers = useMemo(() => studentKpiHelpers(entries), [entries]);
  const availableYears = useMemo(() => { const ys = [...new Set(entries.map(e => e.year))]; if (!ys.includes(selectedYear)) ys.push(selectedYear); return ys.sort((a, b) => b - a); }, [entries, selectedYear]);
  const ranked = useMemo(() => [...students].map(s => ({ ...s, kpi: helpers.yearKPI(s.id, selectedYear) })).sort((a, b) => b.kpi - a.kpi), [students, helpers, selectedYear]);
  const mRanked = useMemo(() => [...students].map(s => ({ ...s, kpi: helpers.monthKPI(s.id, cm, selectedYear) })).sort((a, b) => b.kpi - a.kpi), [students, helpers, selectedYear, cm]);
  const totalE = useMemo(() => entries.filter(e => e.month === cm && e.year === selectedYear).length, [entries, cm, selectedYear]);
  return (
    <div className={PAGE}>
      <ErrorNote lang={lang} error={e1 || e2 || e3} />
      <div className={HEAD}>
        <div><h2 className={TITLE}>{t.dashboard}</h2><p className={SUB}>{lang === "bn" ? `স্বাগতম, ${currentUser.name}` : `${t.welcome}, ${currentUser.name}`}</p></div>
        <YearSelector lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} />
      </div>
      {isAdmin && (
        <div className={GRID4}>
          <StatCard icon="🎓" value={students.length} label={t.totalStudents} />
          <StatCard icon="👨‍🏫" value={teachers.length} label={t.totalTeachers} />
          <StatCard icon="✏️" value={totalE} label={t.monthlyKPI} />
          <StatCard icon={pendingParents.length > 0 ? "⏳" : "🏆"} value={pendingParents.length > 0 ? pendingParents.length : (lang === "bn" ? ranked[0]?.name : ranked[0]?.nameEn || "-")} label={pendingParents.length > 0 ? (lang === "bn" ? "অনুমোদন বাকি" : "Pending") : (lang === "bn" ? "শীর্ষ শিক্ষার্থী" : "Top Student")} />
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <RankCard title={`🏆 ${t.topStudents} — ${lang === "bn" ? "বার্ষিক" : "Yearly"} ${selectedYear}`} list={ranked.slice(0, 5)} lang={lang} t={t} />
        <RankCard title={`📅 ${T[lang][MONTHS[cm]]} — ${lang === "bn" ? "মাসিক" : "Monthly"}`} list={mRanked.slice(0, 5)} lang={lang} t={t} />
      </div>
    </div>
  );
}

export function StudentDashboard({ t, lang, currentUser, selectedYear, setSelectedYear, termConfig }: SelfProps) {
  const sid = currentUser.id, cm = new Date().getMonth();
  const { students, error: e1 } = useDbStudents(true);
  const { entries, error: e2 } = useDbStudentEntries(true);
  const helpers = useMemo(() => studentKpiHelpers(entries), [entries]);
  const { monthKPI: getStudentMonthKPI, termKPI: getStudentTermKPI, yearKPI: getStudentYearKPI } = helpers;
  const availableYears = useMemo(() => { const ys = [...new Set(entries.map(e => e.year))]; if (!ys.includes(selectedYear)) ys.push(selectedYear); return ys.sort((a, b) => b - a); }, [entries, selectedYear]);
  const myRank = useMemo(() => [...students].map(s => ({ id: s.id, kpi: getStudentYearKPI(s.id, selectedYear) })).sort((a, b) => b.kpi - a.kpi).findIndex(s => s.id === sid) + 1, [students, getStudentYearKPI, selectedYear, sid]);
  const monthData = useMemo(() => MONTHS.map((m, i) => ({ label: T[lang][m].slice(0, 3), val: getStudentMonthKPI(sid, i, selectedYear) })), [getStudentMonthKPI, sid, selectedYear, lang]);
  return (
    <div className={PAGE}>
      <ErrorNote lang={lang} error={e1 || e2} />
      <div className={HEAD}>
        <div><h2 className={TITLE}>{t.myKPI}</h2><p className={SUB}>{lang === "bn" ? `স্বাগতম, ${currentUser.name}` : `${t.welcome}, ${currentUser.name}`}</p><p className="text-xs text-muted-foreground">{currentUser.systemId}</p></div>
        <YearSelector lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} />
      </div>
      <div className={GRID4}>
        <StatCard icon="🏆" value={`#${myRank}`} label={t.myRank} />
        <StatCard icon="📅" value={getStudentMonthKPI(sid, cm, selectedYear)} label={`${T[lang][MONTHS[cm]]} ${t.myMonthly}`} />
        <StatCard icon="📊" value={getStudentYearKPI(sid, selectedYear)} label={`${selectedYear} ${t.myYearly}`} />
        <StatCard icon="🎓" value={`${currentUser.class}${currentUser.section || ""}`} label={t.class} />
      </div>
      <ChartCard title={`📈 ${t.progressChart} — ${selectedYear}`} data={monthData} cm={cm} />
      <TermBreakdown t={t} lang={lang} termConfig={termConfig} selectedYear={selectedYear} getTermKPI={getStudentTermKPI} id={sid} />
    </div>
  );
}

export function ParentDashboard({ t, lang, currentUser, selectedYear, setSelectedYear, termConfig }: SelfProps) {
  const { students, error: e1 } = useDbStudents(true);
  const { entries, error: e2 } = useDbStudentEntries(true);
  const helpers = useMemo(() => studentKpiHelpers(entries), [entries]);
  const { monthKPI: getStudentMonthKPI, termKPI: getStudentTermKPI, yearKPI: getStudentYearKPI } = helpers;
  const availableYears = useMemo(() => { const ys = [...new Set(entries.map(e => e.year))]; if (!ys.includes(selectedYear)) ys.push(selectedYear); return ys.sort((a, b) => b - a); }, [entries, selectedYear]);
  const child = students.find(s => s.id === currentUser.studentId);
  if (!child) return <div className={PAGE}><ErrorNote lang={lang} error={e1 || e2} /><div className="py-8 text-center text-muted-foreground">{lang === "bn" ? "শিক্ষার্থী পাওয়া যায়নি" : "Student not found"}</div></div>;
  const sid = child.id, cm = new Date().getMonth();
  const allRanked = [...students].map(s => ({ ...s, kpi: getStudentYearKPI(s.id, selectedYear) })).sort((a, b) => b.kpi - a.kpi);
  const myRank = allRanked.findIndex(s => s.id === sid) + 1;
  const monthData = MONTHS.map((m, i) => ({ label: T[lang][m].slice(0, 3), val: getStudentMonthKPI(sid, i, selectedYear) }));
  const relLabel = currentUser.relation === "father" ? t.father : currentUser.relation === "mother" ? t.mother : t.guardian;
  return (
    <div className={PAGE}>
      <ErrorNote lang={lang} error={e1 || e2} />
      <div className={HEAD}>
        <div><h2 className={TITLE}>{t.childKPI}</h2><p className={SUB}>{relLabel}: {currentUser.name}</p></div>
        <YearSelector lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} />
      </div>
      <Card className="bg-muted/40">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">{(lang === "bn" ? child.name : child.nameEn)?.[0]}</div>
          <div>
            <div className="text-base font-extrabold text-foreground">{lang === "bn" ? child.name : child.nameEn}</div>
            <div className="text-sm text-foreground">{child.systemId}</div>
            <div className="text-xs text-muted-foreground">{t.class} {child.class}{child.section} | {t.roll}: {child.roll}</div>
          </div>
        </CardContent>
      </Card>
      <div className={GRID4}>
        <StatCard icon="🏆" value={`#${myRank}`} label={t.myRank} />
        <StatCard icon="📅" value={getStudentMonthKPI(sid, cm, selectedYear)} label={`${T[lang][MONTHS[cm]]} ${t.myMonthly}`} />
        <StatCard icon="📊" value={getStudentYearKPI(sid, selectedYear)} label={`${selectedYear} ${t.myYearly}`} />
        <StatCard icon="👥" value={students.length} label={lang === "bn" ? "মোট শিক্ষার্থী" : "Total Students"} />
      </div>
      <ChartCard title={`📈 ${t.progressChart} — ${selectedYear}`} data={monthData} cm={cm} />
      <TermBreakdown t={t} lang={lang} termConfig={termConfig} selectedYear={selectedYear} getTermKPI={getStudentTermKPI} id={sid} />
    </div>
  );
}

import { useState, useMemo } from "react";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { YearSelector, Tabs, ErrorNote , Page } from "../components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useDbStudents } from "../api/students";
import { useStudentTotals, totalsMap, useKpiYears } from "../api/entries";
import type { Dict, Lang, SessionUser, TermConfig } from "../types";

interface Props {
  t: Dict;
  lang: Lang;
  termConfig: TermConfig;
  currentUser: SessionUser;
  isAdmin: boolean;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
}

export function ReportsPage({ t, lang, termConfig, currentUser, isAdmin, selectedYear, setSelectedYear }: Props) {
  const [rType, setRType] = useState("monthly");
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const { students, error: e1 } = useDbStudents(true);
  // The cut's months → a single bounded aggregate call (≤ #students rows).
  const cutMonths = useMemo(() => {
    if (rType === "monthly") return [selMonth];
    if (rType === "term1") return termConfig.term1;
    if (rType === "term2") return termConfig.term2;
    if (rType === "term3") return termConfig.term3;
    if (rType === "term4") return termConfig.term4;
    return null; // yearly
  }, [rType, selMonth, termConfig]);
  const { totals, error: e2 } = useStudentTotals(selectedYear, cutMonths);
  const kMap = useMemo(() => totalsMap(totals), [totals]);
  const { years } = useKpiYears();
  const availableYears = useMemo(() => { const ys = [...years]; if (!ys.includes(selectedYear)) ys.push(selectedYear); return ys.sort((a, b) => b - a); }, [years, selectedYear]);
  const isStudent = currentUser.role === "student", isParent = currentUser.role === "parent";
  const vis = useMemo(() => {
    if (isAdmin) return students;
    const ct = currentUser.classTeacher;
    const guide = currentUser.guideStudents || [];
    if (ct) return students.filter(s => s.class === ct.class && s.section === ct.section);
    if (isStudent) return students.filter(s => s.id === currentUser.id);
    if (isParent) return students.filter(s => s.id === currentUser.studentId);
    if (guide.length > 0) return students.filter(s => guide.includes(s.id));
    return students;
  }, [students, isAdmin, isStudent, isParent, currentUser]);
  const ranked = useMemo(() => [...vis].map(s => ({ ...s, kpi: kMap.get(s.id) || 0 })).sort((a, b) => b.kpi - a.kpi), [vis, kMap]);
  const medalBg = (i: number) => (i === 0 ? "#fef3c7" : i === 1 ? "#f1f5f9" : i === 2 ? "#fff7ed" : "transparent");
  return (
    <Page>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.reports}</h2>
        <YearSelector lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} />
      </div>
      <ErrorNote lang={lang} error={e1 || e2} />
      <Tabs items={[{ key: "monthly", label: lang === "bn" ? "মাসিক" : "Monthly" }, { key: "term1", label: t.term1 }, { key: "term2", label: t.term2 }, { key: "term3", label: t.term3 }, { key: "term4", label: t.term4 }, { key: "yearly", label: lang === "bn" ? "বার্ষিক" : "Yearly" }]} active={rType} onChange={setRType} />
      {rType === "monthly" && (
        <div className="space-y-1.5">
          <Label>{t.month}</Label>
          <Select value={String(selMonth)} onValueChange={(v) => setSelMonth(parseInt(v))}>
            <SelectTrigger className="w-45"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{T[lang][m]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {!isStudent && !isParent && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ranked.slice(0, 3).map((s, i) => (
            <Card key={s.id} className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                <div className="mt-1 text-sm font-bold text-foreground">{lang === "bn" ? s.name : s.nameEn}</div>
                <div className="text-xs text-muted-foreground">{t.class} {s.class}{s.section}</div>
                <div className="mt-1 text-2xl font-black text-foreground">{s.kpi}</div>
                <div className="text-xs text-muted-foreground">{lang === "bn" ? "পয়েন্ট" : "pts"}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Card className="overflow-hidden">
        <CardHeader><CardTitle className="text-base">{lang === "bn" ? "র‍্যাংকিং" : "Rankings"}</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.rank}</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.class}</TableHead>
                <TableHead>{t.roll}</TableHead>
                <TableHead>{t.totalPoints}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((s, i) => {
                const isMe = isStudent && s.id === currentUser.id;
                return (
                  <TableRow key={s.id} className={isMe ? "bg-muted" : undefined}>
                    <TableCell>
                      <span className="inline-grid h-7 w-7 place-items-center rounded-md text-xs font-bold" style={{ background: medalBg(i), color: i < 3 ? "var(--foreground)" : "var(--muted-foreground)" }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                    </TableCell>
                    <TableCell className={i < 3 ? "font-bold" : ""}>{lang === "bn" ? s.name : s.nameEn}{isMe && <span className="ml-1.5 text-xs text-foreground">(আমি)</span>}</TableCell>
                    <TableCell>{s.class}{s.section}</TableCell>
                    <TableCell>{s.roll}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded bg-linear-to-r from-primary to-muted-foreground" style={{ width: `${Math.min(100, (s.kpi / (ranked[0]?.kpi || 1)) * 100)}%`, minWidth: 4 }} />
                        <span className="text-sm font-bold text-foreground">{s.kpi}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Page>
  );
}

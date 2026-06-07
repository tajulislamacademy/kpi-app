import { useState } from "react";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { cn } from "../lib";
import { ConfirmDialog, Tabs, MonthsPicker, ErrorNote , Page } from "../components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDbQuestions, createQuestion, updateQuestion, deleteQuestion } from "../api/questions";
import type { Dict, Lang, Question, QuestionInput, QuestionCategory, Frequency } from "../types";

interface Props { t: Dict; lang: Lang; showNotif: (msg: string) => void; }
interface QForm { textBn: string; textEn: string; role?: string; points: number | string; activeMonths: number[]; frequency: string; }

const roleBadge = (r?: string | null) =>
  r === "classTeacher" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    : r === "subjectTeacher" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";

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
  const freqLabel = (f?: string) => { const map: Record<string, string> = { daily: t.daily, weekly: t.weekly, monthly: t.monthly, quarterly: t.quarterly, annual: t.annual }; return map[f || "monthly"] || t.monthly; };
  const qTable = (list: Question[]) => (
    <Table>
      <TableHeader><TableRow>
        <TableHead className="w-8">#</TableHead>
        <TableHead>{lang === "bn" ? "প্রশ্ন" : "Question"}</TableHead>
        <TableHead>{t.pointsPerEntry}</TableHead>
        <TableHead>{t.frequency}</TableHead>
        <TableHead>{t.activeMonths}</TableHead>
        <TableHead>{lang === "bn" ? "অ্যাকশন" : "Action"}</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {list.map((q, i) => (
          <TableRow key={q.id}>
            <TableCell>{i + 1}</TableCell>
            <TableCell><div className="max-w-50 text-sm font-medium">{lang === "bn" ? q.textBn : q.textEn}</div></TableCell>
            <TableCell className="font-bold">{q.points}</TableCell>
            <TableCell><Badge variant="secondary">{freqLabel(q.frequency || "monthly")}</Badge></TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-0.5">
                {MONTHS.map((m, mi) => (
                  <span key={m} className={cn("rounded px-1.5 text-xs font-semibold", q.activeMonths.includes(mi) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{T[lang][m].slice(0, 3)}</span>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" aria-label={lang === "bn" ? "দেখুন" : "View"} className="h-8 w-8" onClick={() => setViewQ(q)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="outline" aria-label={t.edit} className="h-8 w-8" onClick={() => openEdit(q)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="outline" aria-label={t.deleteAdmin} className="h-8 w-8 text-destructive" onClick={() => setConfirmDel({ id: q.id, name: lang === "bn" ? q.textBn : q.textEn })}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.questions}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? "মোট " + curQs.length + "টি" : "Total " + curQs.length}{loading ? " · …" : ""}</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" />{t.addQuestion}</Button>
      </div>
      <ErrorNote lang={lang} error={error} />
      <Tabs items={[{ key: "student", label: `${t.stdQuestions} (${stdQ.length})` }, { key: "teacher", label: `${t.tchrQuestions} (${tchrQ.length})` }, { key: "parent", label: `${t.parQuestions} (${parQ.length})` }]} active={qTab} onChange={(k) => { setQTab(k as QuestionCategory); setShowForm(false); setEditId(null); }} />

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editId ? (lang === "bn" ? "প্রশ্ন সম্পাদনা" : "Edit Question") : (lang === "bn" ? "নতুন প্রশ্ন" : "New Question")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{lang === "bn" ? "প্রশ্ন (বাংলা)" : "Question (BN)"}</Label><Input value={form.textBn} onChange={e => setForm({ ...form, textBn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{lang === "bn" ? "প্রশ্ন (ইংরেজি)" : "Question (EN)"}</Label><Input value={form.textEn} onChange={e => setForm({ ...form, textEn: e.target.value })} /></div>
              {isStd && <div className="space-y-1.5"><Label>{t.role}</Label><Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="classTeacher">{t.classTeacher}</SelectItem><SelectItem value="subjectTeacher">{t.subjectTeacher}</SelectItem><SelectItem value="guideTeacher">{t.guideTeacher}</SelectItem></SelectContent></Select></div>}
              <div className="space-y-1.5"><Label>{t.pointsPerEntry}</Label><Input type="number" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.frequency}</Label><Select value={form.frequency || "monthly"} onValueChange={v => setForm({ ...form, frequency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">{t.daily}</SelectItem><SelectItem value="weekly">{t.weekly}</SelectItem><SelectItem value="monthly">{t.monthly}</SelectItem><SelectItem value="quarterly">{t.quarterly}</SelectItem><SelectItem value="annual">{t.annual}</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label>{t.activeMonths}</Label><MonthsPicker lang={lang} value={form.activeMonths} onToggle={toggleM} /></div>
            <div className="flex gap-2"><Button onClick={handleSave} disabled={saving}>{saving ? (lang === "bn" ? "সংরক্ষণ…" : "Saving…") : t.save}</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>{t.cancel}</Button></div>
          </CardContent>
        </Card>
      )}

      {loading && allQ.length === 0 ? (
        <Card className="overflow-hidden py-0"><div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div></Card>
      ) : isStd ? ["classTeacher", "subjectTeacher", "guideTeacher"].map(role => (
        <Card key={role} className="overflow-hidden">
          <CardHeader><CardTitle><Badge className={cn("border-transparent text-sm font-bold", roleBadge(role))}>{rLabel(role)}</Badge></CardTitle></CardHeader>
          <CardContent className="px-0 pt-0">{qTable(curQs.filter(q => q.role === role))}</CardContent>
        </Card>
      )) : <Card className="overflow-hidden py-0"><CardContent className="p-0">{qTable(curQs)}</CardContent></Card>}

      <Dialog open={!!viewQ} onOpenChange={(o) => { if (!o) setViewQ(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>🔍 {lang === "bn" ? "প্রশ্ন বিবরণ" : "Question Details"}</DialogTitle></DialogHeader>
          {viewQ && <>
            <div className="rounded-lg bg-muted p-4">
              <div className="text-base font-bold text-foreground">{viewQ.textBn}</div>
              <div className="mb-3 text-sm italic text-muted-foreground">{viewQ.textEn}</div>
              <div className="flex flex-wrap gap-2">
                {isStd && <Badge className={cn("border-transparent font-bold", roleBadge(viewQ.role))}>{rLabel(viewQ.role)}</Badge>}
                <Badge variant="secondary">{t.pointsPerEntry}: {viewQ.points}</Badge>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">{t.activeMonths}:</div>
              <div className="flex flex-wrap gap-1">{MONTHS.map((m, mi) => (<span key={m} className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", viewQ.activeMonths.includes(mi) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{T[lang][m]}</span>))}</div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setViewQ(null)}>{t.cancel}</Button><Button onClick={() => { const q = viewQ; setViewQ(null); openEdit(q); }}><Pencil className="h-4 w-4" />{t.edit}</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>

      {confirmDel && <ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); doDelete(id); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

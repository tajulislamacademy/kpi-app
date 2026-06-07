import { useState } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { CLASSES, SECTIONS, SUBJECTS } from "../constants";
import { errMsg, nextSystemId } from "../lib";
import { ConfirmDialog, ErrorNote, PasswordInput, MultiCombobox , Page } from "../components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDbTeachers, createTeacher, updateTeacher, deleteTeacher } from "../api/teachers";
import { useDbStudents } from "../api/students";
import type { Dict, Lang, Teacher, ClassTeacher, SubjectAssignment } from "../types";

interface Props { t: Dict; lang: Lang; showNotif: (msg: string) => void; }
interface TForm { name: string; nameEn: string; password: string; classTeacher: ClassTeacher | null; subjectAssignments: SubjectAssignment[]; guideStudents: string[]; _authId?: string | null; _systemId?: string; }

export function TeachersPage({ t, lang, showNotif }: Props) {
  const { teachers, loading, error, reload } = useDbTeachers(true);
  const { students: dbStudents } = useDbStudents(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const blank: TForm = { name: "", nameEn: "", password: "123456", classTeacher: null, subjectAssignments: [], guideStudents: [] };
  const [form, setForm] = useState<TForm>(blank);
  const [newAssign, setNewAssign] = useState<SubjectAssignment>({ class: "8", section: "A", subject: SUBJECTS[0] });
  const [hasClass, setHasClass] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const addAssign = () => { if (form.subjectAssignments.find(a => a.class === newAssign.class && a.section === newAssign.section && a.subject === newAssign.subject)) return; setForm({ ...form, subjectAssignments: [...form.subjectAssignments, { ...newAssign }] }); };
  const removeAssign = (i: number) => setForm({ ...form, subjectAssignments: form.subjectAssignments.filter((_, idx) => idx !== i) });
  const openAdd = () => { setEditId(null); setForm(blank); setHasClass(false); setShowForm(true); };
  const openEdit = (tc: Teacher) => { setEditId(tc.id); setForm({ name: tc.name || "", nameEn: tc.nameEn || "", password: "", classTeacher: tc.classTeacher || null, subjectAssignments: tc.subjectAssignments || [], guideStudents: tc.guideStudents || [], _authId: tc.authId, _systemId: tc.systemId }); setHasClass(!!tc.classTeacher); setShowForm(true); };
  const handleSave = async () => {
    if (!form.name) { showNotif(lang === "bn" ? "নাম আবশ্যক" : "Name required"); return; }
    if (form.password && form.password.length < 6) { showNotif(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" : "Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      const classTeacher: ClassTeacher | null = hasClass ? (form.classTeacher || { class: "8", section: "A" }) : null;
      if (editId) {
        await updateTeacher(editId, { name: form.name, nameEn: form.nameEn, classTeacher, subjectAssignments: form.subjectAssignments, guideStudents: form.guideStudents, password: form.password || null, authId: form._authId, systemId: form._systemId });
        showNotif(lang === "bn" ? "আপডেট হয়েছে!" : "Updated!");
      } else {
        const systemId = nextSystemId("TCH", teachers);
        await createTeacher({ systemId, name: form.name, nameEn: form.nameEn, password: form.password, classTeacher, subjectAssignments: form.subjectAssignments, guideStudents: form.guideStudents });
        showNotif(lang === "bn" ? `শিক্ষক যোগ! ID: ${systemId}` : `Teacher added! ID: ${systemId}`);
      }
      await reload();
      setShowForm(false); setEditId(null); setHasClass(false); setForm(blank);
    } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
    finally { setSaving(false); }
  };
  const doDelete = async (id: string) => {
    try { await deleteTeacher(id); await reload(); showNotif(lang === "bn" ? "মুছা হয়েছে!" : "Deleted!"); }
    catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
  };
  const pwPlaceholder = editId ? (form._authId ? (lang === "bn" ? "খালি = অপরিবর্তিত" : "blank = unchanged") : (lang === "bn" ? "login দিতে পাসওয়ার্ড দিন" : "set to give a login")) : (lang === "bn" ? "খালি = login ছাড়া" : "blank = no login");
  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.teachers}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? `মোট ${teachers.length} জন` : `Total ${teachers.length}`}{loading ? " · …" : ""}</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" />{t.addTeacher}</Button>
      </div>
      <ErrorNote lang={lang} error={error} />

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editId ? (lang === "bn" ? "শিক্ষক সম্পাদনা" : "Edit Teacher") : (lang === "bn" ? "নতুন শিক্ষক" : "New Teacher")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{t.name} (বাংলা)</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.name} (English)</Label><Input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{editId ? (lang === "bn" ? "পাসওয়ার্ড" : "Password") : (t.defaultPass + " (login)")}</Label><PasswordInput value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={pwPlaceholder} /></div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Checkbox checked={hasClass} onCheckedChange={(c) => setHasClass(c === true)} />{t.classTeacher}?
              </label>
              {hasClass && (
                <div className="mt-3 flex gap-2">
                  <Select value={form.classTeacher?.class || "8"} onValueChange={v => setForm({ ...form, classTeacher: { class: v, section: form.classTeacher?.section || "A" } })}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                  <Select value={form.classTeacher?.section || "A"} onValueChange={v => setForm({ ...form, classTeacher: { class: form.classTeacher?.class || "8", section: v } })}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="mb-3 text-sm font-bold text-foreground">{t.subjectAssignments}</div>
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <Select value={newAssign.class} onValueChange={v => setNewAssign({ ...newAssign, class: v })}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                <Select value={newAssign.section} onValueChange={v => setNewAssign({ ...newAssign, section: v })}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                <Select value={newAssign.subject} onValueChange={v => setNewAssign({ ...newAssign, subject: v })}><SelectTrigger className="min-w-36 flex-1"><SelectValue /></SelectTrigger><SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                <Button size="icon" aria-label={lang === "bn" ? "যোগ করুন" : "Add"} onClick={addAssign}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.subjectAssignments.map((a, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {t.class}{a.class}{a.section}—{a.subject.split("/")[1] || a.subject}
                    <button onClick={() => removeAssign(i)} className="ml-0.5 rounded-full hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="mb-3 text-sm font-bold text-foreground">{t.guideStudents}</div>
              <MultiCombobox
                options={dbStudents.map(s => ({ value: s.id, label: `${lang === "bn" ? s.name : s.nameEn} (${t.class}${s.class}${s.section})` }))}
                values={form.guideStudents}
                onChange={gs => setForm({ ...form, guideStudents: gs })}
                placeholder={lang === "bn" ? "শিক্ষার্থী নির্বাচন" : "Select students"}
                searchPlaceholder={lang === "bn" ? "নাম খুঁজুন…" : "Search name…"}
              />
              {form.guideStudents.length > 0 && <div className="mt-1.5 text-xs text-muted-foreground">{form.guideStudents.length} {lang === "bn" ? "জন নির্বাচিত" : "selected"}</div>}
            </div>

            <div className="flex gap-2"><Button onClick={handleSave} disabled={saving}>{saving ? (lang === "bn" ? "সংরক্ষণ…" : "Saving…") : t.save}</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>{t.cancel}</Button></div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {loading && teachers.length === 0 ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t.autoId}</TableHead>
              <TableHead>{t.name}</TableHead>
              <TableHead>{t.classTeacher}</TableHead>
              <TableHead>{t.subjectAssignments}</TableHead>
              <TableHead>{t.guideStudents}</TableHead>
              <TableHead>{lang === "bn" ? "অ্যাকশন" : "Action"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {teachers.map((tc) => (
                <TableRow key={tc.id}>
                  <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tc.systemId}</code></TableCell>
                  <TableCell className="font-semibold">{lang === "bn" ? tc.name : tc.nameEn}</TableCell>
                  <TableCell>{tc.classTeacher ? `${t.class} ${tc.classTeacher.class}${tc.classTeacher.section}` : "—"}</TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{(tc.subjectAssignments || []).map((a, j) => (<Badge key={j} variant="secondary" className="text-xs">{t.class}{a.class}{a.section}/{a.subject.split("/")[1] || a.subject}</Badge>))}</div></TableCell>
                  <TableCell>{(tc.guideStudents || []).length}{lang === "bn" ? "জন" : "sts"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openEdit(tc)}><Pencil className="h-3.5 w-3.5" />{t.edit}</Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive" onClick={() => setConfirmDel({ id: tc.id, name: (lang === "bn" ? tc.name : tc.nameEn) || "" })}><Trash2 className="h-3.5 w-3.5" />{t.deleteAdmin}</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {confirmDel && <ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); doDelete(id); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

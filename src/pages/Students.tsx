import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CLASSES } from "../constants";
import { errMsg, nextSystemId } from "../lib";
import { ConfirmDialog, ErrorNote, PasswordInput , Page } from "../components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDbStudents, createStudent, updateStudent, deleteStudent } from "../api/students";
import { useDbTeachers } from "../api/teachers";
import { useDbParents } from "../api/parents";
import type { Dict, Lang, Student } from "../types";

interface Props { t: Dict; lang: Lang; showNotif: (msg: string) => void; }
interface SForm { name: string; nameEn: string; class: string; section: string; roll: number | string; password: string; _authId?: string | null; _systemId?: string; }

export function StudentsPage({ t, lang, showNotif }: Props) {
  const { students, loading, error, reload } = useDbStudents(true);
  const { teachers } = useDbTeachers(true);
  const { parents } = useDbParents(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const blank: SForm = { name: "", nameEn: "", class: "8", section: "", roll: "", password: "123456" };
  const [form, setForm] = useState<SForm>(blank);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const openAdd = () => { setEditId(null); setForm(blank); setShowForm(true); };
  const openEdit = (s: Student) => { setEditId(s.id); setForm({ name: s.name || "", nameEn: s.nameEn || "", class: s.class || "8", section: s.section || "", roll: s.roll || "", password: "", _authId: s.authId, _systemId: s.systemId }); setShowForm(true); };
  const handleSave = async () => {
    if (!form.name) { showNotif(lang === "bn" ? "নাম আবশ্যক" : "Name required"); return; }
    if (form.password && form.password.length < 6) { showNotif(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" : "Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      const roll = parseInt(String(form.roll)) || null;
      if (editId) {
        await updateStudent(editId, { name: form.name, nameEn: form.nameEn, cls: form.class, section: form.section, roll, password: form.password || null, authId: form._authId, systemId: form._systemId });
        showNotif(lang === "bn" ? "আপডেট হয়েছে!" : "Updated!");
      } else {
        const systemId = nextSystemId("STD", students);
        await createStudent({ systemId, name: form.name, nameEn: form.nameEn, cls: form.class, section: form.section, roll, password: form.password });
        showNotif(lang === "bn" ? `শিক্ষার্থী যোগ! ID: ${systemId}` : `Student added! ID: ${systemId}`);
      }
      await reload();
      setShowForm(false); setEditId(null); setForm(blank);
    } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
    finally { setSaving(false); }
  };
  const doDelete = async (id: string) => {
    try { await deleteStudent(id); await reload(); showNotif(lang === "bn" ? "মুছা হয়েছে!" : "Deleted!"); }
    catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
  };
  const pwPlaceholder = editId ? (form._authId ? (lang === "bn" ? "খালি = অপরিবর্তিত" : "blank = unchanged") : (lang === "bn" ? "login দিতে পাসওয়ার্ড দিন" : "set to give a login")) : (lang === "bn" ? "খালি = login ছাড়া" : "blank = no login");
  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.students}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? `মোট ${students.length} জন` : `Total ${students.length}`}{loading ? " · …" : ""}</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" />{t.addStudent}</Button>
      </div>
      <ErrorNote lang={lang} error={error} />

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editId ? (lang === "bn" ? "শিক্ষার্থী সম্পাদনা" : "Edit Student") : (lang === "bn" ? "নতুন শিক্ষার্থী" : "New Student")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{t.name} (বাংলা)</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.name} (English)</Label><Input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.class}</Label><Select value={form.class} onValueChange={v => setForm({ ...form, class: v })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>{t.section}</Label><Input value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="A, B..." /></div>
              <div className="space-y-1.5"><Label>{t.roll}</Label><Input type="number" value={form.roll} onChange={e => setForm({ ...form, roll: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{editId ? (lang === "bn" ? "পাসওয়ার্ড" : "Password") : (t.defaultPass + " (login)")}</Label><PasswordInput value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={pwPlaceholder} /></div>
            </div>
            <div className="flex gap-2"><Button onClick={handleSave} disabled={saving}>{saving ? (lang === "bn" ? "সংরক্ষণ…" : "Saving…") : t.save}</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>{t.cancel}</Button></div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {loading && students.length === 0 ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t.autoId}</TableHead>
              <TableHead>{t.name}</TableHead>
              <TableHead>{t.class}</TableHead>
              <TableHead>{t.section}</TableHead>
              <TableHead>{t.roll}</TableHead>
              <TableHead>{lang === "bn" ? "শ্রেণী শিক্ষক" : "Class Teacher"}</TableHead>
              <TableHead>{lang === "bn" ? "অভিভাবক" : "Parents"}</TableHead>
              <TableHead>{lang === "bn" ? "অ্যাকশন" : "Action"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {students.map((s) => {
                const ct = teachers.find(tc => tc.classTeacher?.class === s.class && tc.classTeacher?.section === s.section);
                const sParents = (parents || []).filter(p => p.studentId === s.id && p.status === "approved");
                return (
                  <TableRow key={s.id}>
                    <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{s.systemId}</code></TableCell>
                    <TableCell className="font-semibold">{lang === "bn" ? s.name : s.nameEn}</TableCell>
                    <TableCell>{s.class}</TableCell>
                    <TableCell>{s.section || "—"}</TableCell>
                    <TableCell>{s.roll}</TableCell>
                    <TableCell>{ct ? (lang === "bn" ? ct.name : ct.nameEn) : "—"}</TableCell>
                    <TableCell>
                      {sParents.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                        <div className="flex flex-col gap-0.5">
                          {sParents.map(p => (<div key={p.id} className="text-xs"><span className="font-semibold">{lang === "bn" ? p.name : p.nameEn}</span><span className="ml-1 text-muted-foreground">({lang === "bn" ? (p.relation === "father" ? "বাবা" : p.relation === "mother" ? "মা" : "অভিভাবক") : p.relation})</span></div>))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" />{t.edit}</Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive" onClick={() => setConfirmDel({ id: s.id, name: (lang === "bn" ? s.name : s.nameEn) || "" })}><Trash2 className="h-3.5 w-3.5" />{t.deleteAdmin}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {confirmDel && <ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); doDelete(id); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

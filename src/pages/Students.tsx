import { useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, RotateCcw } from "lucide-react";
import { CLASSES } from "../constants";
import { errMsg, nextSystemId } from "../lib";
import { ConfirmDialog, ErrorNote, PasswordInput, Tabs, Page } from "../components";
import { can } from "../permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDbStudents, createStudent, updateStudent, deleteStudent, softDeleteStudent, restoreStudent } from "../api/students";
import { useDbTeachers } from "../api/teachers";
import { useDbParents } from "../api/parents";
import type { Dict, Lang, SessionUser, Student } from "../types";

interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; }
interface SForm { name: string; nameEn: string; class: string; section: string; roll: number | string; password: string; _authId?: string | null; _systemId?: string; }

export function StudentsPage({ t, lang, currentUser, showNotif }: Props) {
  const { students, loading, error, reload } = useDbStudents(true, true);
  const { teachers } = useDbTeachers(true);
  const { parents } = useDbParents(true);
  const [tab, setTab] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const blank: SForm = { name: "", nameEn: "", class: "8", section: "", roll: "", password: "123456" };
  const [form, setForm] = useState<SForm>(blank);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const c = (cap: string) => can(currentUser, cap);

  const openAdd = () => { setEditId(null); setForm(blank); setShowForm(true); };
  const openEdit = (s: Student) => { setEditId(s.id); setForm({ name: s.name || "", nameEn: s.nameEn || "", class: s.class || "8", section: s.section || "", roll: s.roll || "", password: "", _authId: s.authId, _systemId: s.systemId }); setShowForm(true); };
  const run = async (fn: () => Promise<void>, msg: string) => { try { await fn(); await reload(); showNotif(msg); } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); } };
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
  const pwPlaceholder = editId ? (form._authId ? (lang === "bn" ? "খালি = অপরিবর্তিত" : "blank = unchanged") : (lang === "bn" ? "login দিতে পাসওয়ার্ড দিন" : "set to give a login")) : (lang === "bn" ? "খালি = login ছাড়া" : "blank = no login");

  const active = students.filter(s => !s.deletedAt);
  const trash = students.filter(s => s.deletedAt);
  const isTrash = tab === "trash";
  const view = isTrash ? trash : active;

  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.students}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? `মোট ${active.length} জন` : `Total ${active.length}`}{loading ? " · …" : ""}</p>
        </div>
        {c("students.create") && <Button onClick={openAdd}><Plus className="h-4 w-4" />{t.addStudent}</Button>}
      </div>
      <ErrorNote lang={lang} error={error} />

      {showForm && c(editId ? "students.edit" : "students.create") && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editId ? (lang === "bn" ? "শিক্ষার্থী সম্পাদনা" : "Edit Student") : (lang === "bn" ? "নতুন শিক্ষার্থী" : "New Student")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{t.name} (বাংলা)</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.name} (English)</Label><Input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.class}</Label><Select value={form.class} onValueChange={v => setForm({ ...form, class: v })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map(cl => <SelectItem key={cl} value={cl}>{cl}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>{t.section}</Label><Input value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="A, B..." /></div>
              <div className="space-y-1.5"><Label>{t.roll}</Label><Input type="number" value={form.roll} onChange={e => setForm({ ...form, roll: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{editId ? (lang === "bn" ? "পাসওয়ার্ড" : "Password") : (t.defaultPass + " (login)")}</Label><PasswordInput value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={pwPlaceholder} /></div>
            </div>
            <div className="flex gap-2"><Button onClick={handleSave} disabled={saving}>{saving ? (lang === "bn" ? "সংরক্ষণ…" : "Saving…") : t.save}</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>{t.cancel}</Button></div>
          </CardContent>
        </Card>
      )}

      <Tabs items={[{ key: "active", label: `${lang === "bn" ? "সক্রিয়" : "Active"} (${active.length})` }, { key: "trash", label: `${lang === "bn" ? "ট্র্যাশ" : "Trash"} (${trash.length})` }]} active={tab} onChange={setTab} />

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {loading && students.length === 0 ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : view.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">{isTrash ? (lang === "bn" ? "ট্র্যাশ খালি" : "Trash is empty") : (lang === "bn" ? "কোনো শিক্ষার্থী নেই" : "No students")}</div>
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
                <TableHead className="w-12" />
              </TableRow></TableHeader>
              <TableBody>
                {view.map((s) => {
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={lang === "bn" ? "অ্যাকশন" : "Actions"}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {isTrash ? <>
                              {c("students.restore") && <DropdownMenuItem onClick={() => run(() => restoreStudent(s.id), lang === "bn" ? "ফেরত আনা হয়েছে" : "Restored")}><RotateCcw className="h-4 w-4" />{lang === "bn" ? "ফেরত আনুন" : "Restore"}</DropdownMenuItem>}
                              {c("students.force_delete") && <DropdownMenuItem variant="destructive" onClick={() => setConfirmDel({ id: s.id, name: (lang === "bn" ? s.name : s.nameEn) || "" })}><Trash2 className="h-4 w-4" />{lang === "bn" ? "স্থায়ী মুছুন" : "Delete permanently"}</DropdownMenuItem>}
                            </> : <>
                              {c("students.edit") && <DropdownMenuItem onClick={() => openEdit(s)}><Pencil className="h-4 w-4" />{t.edit}</DropdownMenuItem>}
                              {c("students.soft_delete") && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => run(() => softDeleteStudent(s.id), lang === "bn" ? "ট্র্যাশে পাঠানো হয়েছে" : "Moved to Trash")}><Trash2 className="h-4 w-4" />{lang === "bn" ? "ট্র্যাশে পাঠান" : "Move to Trash"}</DropdownMenuItem></>}
                            </>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {confirmDel && <ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); run(() => deleteStudent(id), lang === "bn" ? "স্থায়ীভাবে মুছা হয়েছে!" : "Permanently deleted!"); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

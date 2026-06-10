import { useState } from "react";
import { Plus, X, MoreHorizontal, Pencil, Trash2, RotateCcw } from "lucide-react";
import { CLASSES, SECTIONS, SUBJECTS } from "../constants";
import { errMsg, nextSystemId, genPassword } from "../lib";
import { ConfirmDialog, ErrorNote, PasswordInput, Tabs, Page, ImportExport, type ImportExportConfig } from "../components";
import { can } from "../permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDbTeachers, createTeacher, updateTeacher, deleteTeacher, softDeleteTeacher, restoreTeacher } from "../api/teachers";
import { useDbStudents } from "../api/students";
import type { Dict, Lang, SessionUser, Teacher, ClassTeacher, SubjectAssignment } from "../types";

interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; }
interface TForm { name: string; nameEn: string; password: string; classTeacher: ClassTeacher | null; subjectAssignments: SubjectAssignment[]; guideStudents: string[]; _authId?: string | null; _systemId?: string; }

export function TeachersPage({ t, lang, currentUser, showNotif }: Props) {
  const { teachers, loading, error, reload } = useDbTeachers(true, true);
  const { students: dbStudents } = useDbStudents(true);
  const [tab, setTab] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const blank: TForm = { name: "", nameEn: "", password: "", classTeacher: null, subjectAssignments: [], guideStudents: [] };
  const [form, setForm] = useState<TForm>(blank);
  const [newAssign, setNewAssign] = useState<SubjectAssignment>({ class: "8", section: "A", subject: SUBJECTS[0] });
  const [hasClass, setHasClass] = useState(false);
  const [gcClass, setGcClass] = useState("8");
  const [gcSection, setGcSection] = useState("A");
  const toggleGuide = (sid: string) => setForm(f => ({ ...f, guideStudents: f.guideStudents.includes(sid) ? f.guideStudents.filter(x => x !== sid) : [...f.guideStudents, sid] }));
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const c = (cap: string) => can(currentUser, cap);
  // Bulk CSV import/export. subjectAssignments/guideStudents are set later in the
  // UI (too nested for a flat CSV); login only when a password cell is filled.
  const ieConfig: ImportExportConfig = {
    filename: "teachers", prefix: "TCH",
    exportHeader: ["systemId", "name", "nameEn", "classTeacherClass", "classTeacherSection"],
    toExportRow: (r) => [r.systemId, r.name, r.nameEn, r.classTeacher?.class || "", r.classTeacher?.section || ""],
    importHeader: ["name", "nameEn", "password", "classTeacherClass", "classTeacherSection"],
    templateExample: [lang === "bn" ? "রফিক স্যার" : "Rafiq Sir", "Rafiq Sir", "", "8", "A"],
    existing: teachers,
    rowKey: (r) => r.name,
    importRowKey: (row) => row.name,
    validate: (row) => !row.name ? (lang === "bn" ? "নাম নেই" : "name missing") : (row.password && row.password.length < 6 ? (lang === "bn" ? "পাসওয়ার্ড < ৬" : "password < 6") : null),
    create: async (row, systemId) => { const cls = (row.classTeacherClass || "").trim(); const sec = (row.classTeacherSection || "").trim(); await createTeacher({ systemId, name: row.name, nameEn: row.nameEn || "", password: row.password || "", classTeacher: cls ? { class: cls, section: sec } : null, subjectAssignments: [], guideStudents: [] }); },
  };
  const run = async (fn: () => Promise<void>, msg: string) => { try { await fn(); await reload(); showNotif(msg); } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); } };
  const addAssign = () => { if (form.subjectAssignments.find(a => a.class === newAssign.class && a.section === newAssign.section && a.subject === newAssign.subject)) return; setForm({ ...form, subjectAssignments: [...form.subjectAssignments, { ...newAssign }] }); };
  const removeAssign = (i: number) => setForm({ ...form, subjectAssignments: form.subjectAssignments.filter((_, idx) => idx !== i) });
  const openAdd = () => { setEditId(null); setForm({ ...blank, password: genPassword() }); setHasClass(false); setShowForm(true); };
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
  const pwPlaceholder = editId ? (form._authId ? (lang === "bn" ? "খালি = অপরিবর্তিত" : "blank = unchanged") : (lang === "bn" ? "login দিতে পাসওয়ার্ড দিন" : "set to give a login")) : (lang === "bn" ? "খালি = login ছাড়া" : "blank = no login");
  const active = teachers.filter(x => !x.deletedAt);
  const trash = teachers.filter(x => x.deletedAt);
  const isTrash = tab === "trash";
  const view = isTrash ? trash : active;
  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.teachers}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? `মোট ${active.length} জন` : `Total ${active.length}`}{loading ? " · …" : ""}</p>
        </div>
        {c("teachers.create") && (
          <div className="flex flex-wrap items-center gap-2">
            <ImportExport t={t} lang={lang} config={ieConfig} onDone={reload} showNotif={showNotif} />
            <Button onClick={openAdd}><Plus className="h-4 w-4" />{t.addTeacher}</Button>
          </div>
        )}
      </div>
      <ErrorNote lang={lang} error={error} />

      {showForm && c(editId ? "teachers.edit" : "teachers.create") && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editId ? (lang === "bn" ? "শিক্ষক সম্পাদনা" : "Edit Teacher") : (lang === "bn" ? "নতুন শিক্ষক" : "New Teacher")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{t.name} (বাংলা)</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.name} (English)</Label><Input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{editId ? (lang === "bn" ? "পাসওয়ার্ড" : "Password") : (t.defaultPass + " (login)")}</Label><PasswordInput value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={pwPlaceholder} /></div>
            </div>

            <div className="rounded-lg bg-muted/40 p-4">
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

            <div className="rounded-lg bg-muted/40 p-4">
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

            <div className="space-y-3 rounded-lg bg-muted/40 p-4">
              <div className="text-sm font-bold text-foreground">{t.guideStudents}</div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5"><Label className="text-xs">{t.class}</Label><Select value={gcClass} onValueChange={setGcClass}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">{t.section}</Label><Select value={gcSection} onValueChange={setGcSection}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              </div>
              {(() => {
                const list = dbStudents.filter(s => s.class === gcClass && s.section === gcSection);
                return list.length === 0
                  ? <p className="text-xs text-muted-foreground">{lang === "bn" ? "এই শ্রেণী/সেকশনে কোনো শিক্ষার্থী নেই" : "No students in this class/section"}</p>
                  : <div className="flex max-h-44 flex-col gap-2 overflow-y-auto rounded-md bg-background/60 p-2">
                      {list.map(s => {
                        const owner = teachers.find(tc => tc.id !== editId && (tc.guideStudents || []).includes(s.id));
                        const checked = form.guideStudents.includes(s.id);
                        const blocked = !!owner && !checked;
                        return (
                          <label key={s.id} className={`flex items-center gap-2 text-sm ${blocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                            <Checkbox checked={checked} disabled={blocked} onCheckedChange={() => { if (!blocked) toggleGuide(s.id); }} />
                            <span>{lang === "bn" ? s.name : s.nameEn}{s.roll ? ` (${t.roll} ${s.roll})` : ""}</span>
                            {owner && <span className="text-xs text-amber-600 dark:text-amber-400">· {lang === "bn" ? "গাইড" : "guide"}: {lang === "bn" ? owner.name : owner.nameEn}</span>}
                          </label>
                        );
                      })}
                    </div>;
              })()}
              {form.guideStudents.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">{lang === "bn" ? `নির্বাচিত (${form.guideStudents.length})` : `Selected (${form.guideStudents.length})`}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dbStudents.filter(s => form.guideStudents.includes(s.id)).map(s => (
                      <Badge key={s.id} variant="secondary" className="gap-1">
                        {lang === "bn" ? s.name : s.nameEn} ({t.class}{s.class}{s.section})
                        <button type="button" onClick={() => toggleGuide(s.id)} className="ml-0.5 rounded-full hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2"><Button onClick={handleSave} disabled={saving}>{saving ? (lang === "bn" ? "সংরক্ষণ…" : "Saving…") : t.save}</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>{t.cancel}</Button></div>
          </CardContent>
        </Card>
      )}

      <Tabs items={[{ key: "active", label: `${lang === "bn" ? "সক্রিয়" : "Active"} (${active.length})` }, { key: "trash", label: `${lang === "bn" ? "ট্র্যাশ" : "Trash"} (${trash.length})` }]} active={tab} onChange={setTab} />

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {loading && teachers.length === 0 ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : view.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">{isTrash ? (lang === "bn" ? "ট্র্যাশ খালি" : "Trash is empty") : (lang === "bn" ? "কোনো শিক্ষক নেই" : "No teachers")}</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t.autoId}</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.classTeacher}</TableHead>
                <TableHead>{t.subjectAssignments}</TableHead>
                <TableHead>{t.guideStudents}</TableHead>
                <TableHead className="w-12" />
              </TableRow></TableHeader>
              <TableBody>
                {view.map((tc) => (
                  <TableRow key={tc.id}>
                    <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tc.systemId}</code></TableCell>
                    <TableCell className="font-semibold">{lang === "bn" ? tc.name : tc.nameEn}</TableCell>
                    <TableCell>{tc.classTeacher ? `${t.class} ${tc.classTeacher.class}${tc.classTeacher.section}` : "—"}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{(tc.subjectAssignments || []).map((a, j) => (<Badge key={j} variant="secondary" className="text-xs">{t.class}{a.class}{a.section}/{a.subject.split("/")[1] || a.subject}</Badge>))}</div></TableCell>
                    <TableCell>{(tc.guideStudents || []).length}{lang === "bn" ? "জন" : "sts"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={lang === "bn" ? "অ্যাকশন" : "Actions"}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {isTrash ? <>
                            {c("teachers.restore") && <DropdownMenuItem onClick={() => run(() => restoreTeacher(tc.id), lang === "bn" ? "ফেরত আনা হয়েছে" : "Restored")}><RotateCcw className="h-4 w-4" />{lang === "bn" ? "ফেরত আনুন" : "Restore"}</DropdownMenuItem>}
                            {c("teachers.force_delete") && <DropdownMenuItem variant="destructive" onClick={() => setConfirmDel({ id: tc.id, name: (lang === "bn" ? tc.name : tc.nameEn) || "" })}><Trash2 className="h-4 w-4" />{lang === "bn" ? "স্থায়ী মুছুন" : "Delete permanently"}</DropdownMenuItem>}
                          </> : <>
                            {c("teachers.edit") && <DropdownMenuItem onClick={() => openEdit(tc)}><Pencil className="h-4 w-4" />{t.edit}</DropdownMenuItem>}
                            {c("teachers.soft_delete") && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => run(() => softDeleteTeacher(tc.id), lang === "bn" ? "ট্র্যাশে পাঠানো হয়েছে" : "Moved to Trash")}><Trash2 className="h-4 w-4" />{lang === "bn" ? "ট্র্যাশে পাঠান" : "Move to Trash"}</DropdownMenuItem></>}
                          </>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {confirmDel && <ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); run(() => deleteTeacher(id), lang === "bn" ? "স্থায়ীভাবে মুছা হয়েছে!" : "Permanently deleted!"); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

import { useState } from "react";
import { Plus, Pencil, Trash2, MoreHorizontal, X } from "lucide-react";
import { CLASSES } from "../constants";
import { errMsg } from "../lib";
import { ConfirmDialog, ErrorNote, Page } from "../components";
import { can } from "../permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDbSubjects, createSubject, updateSubject, deleteSubject } from "../api/subjects";
import { useDbSections, createSection, deleteSection, sectionNamesFor } from "../api/sections";
import type { Dict, Lang, SessionUser, Subject } from "../types";

interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; }
interface SForm { nameBn: string; nameEn: string; class: string; sections: string[]; }

export function SubjectsPage({ t, lang, currentUser, showNotif }: Props) {
  const { subjects, loading, error, reload } = useDbSubjects(true);
  const { sections, error: secErr, reload: reloadSec } = useDbSections(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState<{ class: string; name: string } | null>(null);
  const blank: SForm = { nameBn: "", nameEn: "", class: "8", sections: [] };
  const [form, setForm] = useState<SForm>(blank);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fClass, setFClass] = useState("all");
  const [fSec, setFSec] = useState("all");
  const c = (cap: string) => can(currentUser, cap);

  // --- Sections manager state ---
  const [secClass, setSecClass] = useState("8");
  const [newSec, setNewSec] = useState({ name: "", label: "" });
  const classSecs = sections.filter(s => s.class === secClass);

  const run = async (fn: () => Promise<void>, msg: string) => { setSaving(true); try { await fn(); await reload(); await reloadSec(); showNotif(msg); } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); } finally { setSaving(false); } };

  const addSection = () => { if (!newSec.name.trim()) return; run(async () => { await createSection({ class: secClass, name: newSec.name.trim(), label: newSec.label.trim() }); setNewSec({ name: "", label: "" }); }, lang === "bn" ? "শাখা যোগ হয়েছে" : "Section added"); };

  const openAdd = () => { setEditId(null); setEditKey(null); setForm(blank); setShowForm(true); };
  // Edit operates on the whole "subject in this class" group: load every section
  // it currently sits in, so the admin can tick/untick sections (add to B, drop A…).
  const openEdit = (s: Subject) => { setEditId(s.id); setEditKey({ class: s.class, name: s.nameBn }); setForm({ nameBn: s.nameBn, nameEn: s.nameEn, class: s.class, sections: subjects.filter(x => x.class === s.class && x.nameBn === s.nameBn).map(x => x.section) }); setShowForm(true); };
  const toggleSec = (sec: string) => setForm(f => ({ ...f, sections: f.sections.includes(sec) ? f.sections.filter(x => x !== sec) : [...f.sections, sec] }));
  const formSecNames = sectionNamesFor(sections, form.class);

  const handleSave = async () => {
    if (!form.nameBn) { showNotif(lang === "bn" ? "বিষয়ের নাম আবশ্যক" : "Subject name required"); return; }
    if (!form.sections.length) { showNotif(lang === "bn" ? "অন্তত একটি শাখা" : "Pick at least one section"); return; }
    const target = form.sections;
    await run(async () => {
      if (editKey) {
        // Reconcile the subject's section rows to the ticked set (+ rename / move class).
        const existing = subjects.filter(x => x.class === editKey.class && x.nameBn === editKey.name);
        if (form.class !== editKey.class) {
          for (const x of existing) await deleteSubject(x.id);
          for (const sec of target) await createSubject({ nameBn: form.nameBn, nameEn: form.nameEn, class: form.class, section: sec });
        } else {
          for (const x of existing) if (!target.includes(x.section)) await deleteSubject(x.id);
          const bySec = new Map(existing.map(x => [x.section, x]));
          for (const sec of target) {
            const ex = bySec.get(sec);
            if (ex) await updateSubject(ex.id, { nameBn: form.nameBn, nameEn: form.nameEn, class: form.class, section: sec });
            else await createSubject({ nameBn: form.nameBn, nameEn: form.nameEn, class: form.class, section: sec });
          }
        }
      } else {
        const seen = new Set(subjects.map(s => `${s.class}|${s.section}|${s.nameBn}`));
        for (const sec of target) { if (seen.has(`${form.class}|${sec}|${form.nameBn}`)) continue; await createSubject({ nameBn: form.nameBn, nameEn: form.nameEn, class: form.class, section: sec }); }
      }
      setShowForm(false); setEditId(null); setEditKey(null); setForm(blank);
    }, editId ? (lang === "bn" ? "সম্পাদনা সফল!" : "Updated!") : (lang === "bn" ? "বিষয় যোগ হয়েছে!" : "Subject(s) added!"));
  };

  const list = subjects.filter(s => (fClass === "all" || s.class === fClass) && (fSec === "all" || s.section === fSec));
  const filterSecNames = [...new Set((fClass === "all" ? sections : sections.filter(s => s.class === fClass)).map(s => s.name))].sort();
  const canEditSec = c("subjects.create") || c("subjects.edit") || c("subjects.force_delete");

  return (
    <Page>
      <div>
        <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{lang === "bn" ? "শ্রেণি বিন্যাস (শাখা ও বিষয়)" : "Class Setup (Sections & Subjects)"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? `${sections.length} শাখা · ${subjects.length} বিষয়` : `${sections.length} sections · ${subjects.length} subjects`}{loading ? " · …" : ""}</p>
      </div>
      <ErrorNote lang={lang} error={error || secErr} />

      {/* ---- Sections manager ---- */}
      <Card>
        <CardHeader><CardTitle className="text-base">{lang === "bn" ? "শাখা ব্যবস্থাপনা" : "Sections"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5"><Label>{t.class}</Label>
              <Select value={secClass} onValueChange={setSecClass}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map(cl => <SelectItem key={cl} value={cl}>{cl}</SelectItem>)}</SelectContent></Select>
            </div>
            {canEditSec && c("subjects.create") && (<>
              <div className="space-y-1.5"><Label>{lang === "bn" ? "শাখার নাম" : "Section name"}</Label><Input className="w-28" placeholder="A" value={newSec.name} onChange={e => setNewSec({ ...newSec, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{lang === "bn" ? "লেবেল (ঐচ্ছিক)" : "Label (optional)"}</Label><Input className="w-44" placeholder={lang === "bn" ? "যেমন: বিজ্ঞান" : "e.g. Science"} value={newSec.label} onChange={e => setNewSec({ ...newSec, label: e.target.value })} /></div>
              <Button size="sm" disabled={saving} onClick={addSection}><Plus className="h-4 w-4" />{lang === "bn" ? "শাখা যোগ" : "Add"}</Button>
            </>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {classSecs.length === 0 ? <span className="text-sm text-muted-foreground">{lang === "bn" ? "এই শ্রেণিতে কোনো শাখা নেই" : "No sections for this class"}</span>
              : classSecs.map(s => (
                <Badge key={s.id} variant="secondary" className="gap-1.5 py-1 text-sm">
                  {s.name}{s.label ? ` · ${s.label}` : ""}
                  {c("subjects.force_delete") && <button onClick={() => run(() => deleteSection(s.id), lang === "bn" ? "শাখা মুছে ফেলা হয়েছে" : "Section deleted")} className="text-muted-foreground hover:text-destructive" aria-label="delete"><X className="h-3.5 w-3.5" /></button>}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* ---- Subjects ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-foreground">{lang === "bn" ? "বিষয়" : "Subjects"}</h3>
        {c("subjects.create") && <Button onClick={openAdd}><Plus className="h-4 w-4" />{lang === "bn" ? "বিষয় যোগ" : "Add Subject"}</Button>}
      </div>

      <Dialog open={showForm && c(editId ? "subjects.edit" : "subjects.create")} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditId(null); setEditKey(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? (lang === "bn" ? "বিষয় সম্পাদনা" : "Edit Subject") : (lang === "bn" ? "বিষয় যোগ" : "Add Subject")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="sb-bn">{lang === "bn" ? "বিষয় (বাংলা)" : "Subject (BN)"}</Label><Input id="sb-bn" value={form.nameBn} onChange={e => setForm({ ...form, nameBn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="sb-en">{lang === "bn" ? "বিষয় (English)" : "Subject (EN)"}</Label><Input id="sb-en" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} /></div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5"><Label>{t.class}</Label>
                <Select value={form.class} onValueChange={v => setForm({ ...form, class: v, sections: [] })}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map(cl => <SelectItem key={cl} value={cl}>{cl}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.section}{lang === "bn" ? " (একাধিক বাছাই)" : " (multi)"}</Label>
                <div className="flex flex-wrap gap-3">
                  {formSecNames.length === 0 ? <span className="text-xs text-muted-foreground">{lang === "bn" ? "উপরে এই শ্রেণিতে শাখা যোগ করুন" : "Add sections for this class above"}</span>
                    : formSecNames.map(sec => (
                      <label key={sec} className="flex cursor-pointer items-center gap-1.5 text-sm">
                        <Checkbox checked={form.sections.includes(sec)} onCheckedChange={() => toggleSec(sec)} />{sec}
                      </label>
                    ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); setEditKey(null); }}>{t.cancel}</Button><Button onClick={handleSave} disabled={saving}>{t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2"><Label className="text-xs">{t.class}</Label>
          <Select value={fClass} onValueChange={v => { setFClass(v); setFSec("all"); }}><SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{lang === "bn" ? "সব" : "All"}</SelectItem>{CLASSES.map(cl => <SelectItem key={cl} value={cl}>{cl}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="flex items-center gap-2"><Label className="text-xs">{t.section}</Label>
          <Select value={fSec} onValueChange={setFSec}><SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{lang === "bn" ? "সব" : "All"}</SelectItem>{filterSecNames.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t.class}</TableHead>
            <TableHead>{t.section}</TableHead>
            <TableHead>{lang === "bn" ? "বিষয় (বাংলা)" : "Subject (BN)"}</TableHead>
            <TableHead>{lang === "bn" ? "বিষয় (English)" : "Subject (EN)"}</TableHead>
            <TableHead>{lang === "bn" ? "অ্যাকশন" : "Action"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading && subjects.length === 0 ? (
              <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{lang === "bn" ? "কোনো বিষয় নেই" : "No subjects"}</TableCell></TableRow>
            ) : list.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold">{s.class}</TableCell>
                <TableCell>{s.section}</TableCell>
                <TableCell><div className="max-w-xs whitespace-normal wrap-break-word">{s.nameBn}</div></TableCell>
                <TableCell className="text-muted-foreground">{s.nameEn || "—"}</TableCell>
                <TableCell>
                  {(c("subjects.edit") || c("subjects.force_delete")) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={lang === "bn" ? "অ্যাকশন" : "Actions"}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {c("subjects.edit") && <DropdownMenuItem onClick={() => openEdit(s)}><Pencil className="h-4 w-4" />{t.edit}</DropdownMenuItem>}
                        {c("subjects.force_delete") && <DropdownMenuItem variant="destructive" onClick={() => setConfirmDel({ id: s.id, name: `${s.nameBn} (${s.class}${s.section})` })}><Trash2 className="h-4 w-4" />{lang === "bn" ? "মুছুন" : "Delete"}</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {confirmDel && <ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); run(() => deleteSubject(id), lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted"); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

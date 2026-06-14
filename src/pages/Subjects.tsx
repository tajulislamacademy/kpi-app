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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDbSubjects, createSubject, updateSubject, deleteSubject } from "../api/subjects";
import { useDbSections, createSection, deleteSection, sectionNamesFor } from "../api/sections";
import type { Dict, Lang, SessionUser, Subject } from "../types";

interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; }
interface SForm { nameBn: string; nameEn: string; sections: string[]; }

export function SubjectsPage({ t, lang, currentUser, showNotif }: Props) {
  const { subjects, loading, error, reload } = useDbSubjects(true);
  const { sections, error: secErr, reload: reloadSec } = useDbSections(true);
  const c = (cap: string) => can(currentUser, cap);
  const [saving, setSaving] = useState(false);

  // ONE class drives the whole page (sections + subjects shown below).
  const [activeClass, setActiveClass] = useState("8");
  const classSecs = sections.filter(s => s.class === activeClass);
  const classSubs = subjects.filter(s => s.class === activeClass).sort((a, b) => a.section.localeCompare(b.section) || a.nameBn.localeCompare(b.nameBn));
  const secNames = sectionNamesFor(sections, activeClass);

  const run = async (fn: () => Promise<void>, msg: string) => { setSaving(true); try { await fn(); await reload(); await reloadSec(); showNotif(msg); } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); } finally { setSaving(false); } };

  // --- Sections ---
  const [newSec, setNewSec] = useState({ name: "", label: "" });
  const addSection = () => { if (!newSec.name.trim()) return; run(async () => { await createSection({ class: activeClass, name: newSec.name.trim(), label: newSec.label.trim() }); setNewSec({ name: "", label: "" }); }, lang === "bn" ? "শাখা যোগ হয়েছে" : "Section added"); };

  // --- Subjects (form in a dialog; edit reconciles the section set) ---
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string | null>(null); // original name of the edited group
  const blank: SForm = { nameBn: "", nameEn: "", sections: [] };
  const [form, setForm] = useState<SForm>(blank);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);

  const openAdd = () => { setEditId(null); setEditName(null); setForm(blank); setShowForm(true); };
  const openEdit = (s: Subject) => { setEditId(s.id); setEditName(s.nameBn); setForm({ nameBn: s.nameBn, nameEn: s.nameEn, sections: subjects.filter(x => x.class === activeClass && x.nameBn === s.nameBn).map(x => x.section) }); setShowForm(true); };
  const toggleSec = (sec: string) => setForm(f => ({ ...f, sections: f.sections.includes(sec) ? f.sections.filter(x => x !== sec) : [...f.sections, sec] }));
  const closeForm = () => { setShowForm(false); setEditId(null); setEditName(null); };

  const handleSave = async () => {
    if (!form.nameBn) { showNotif(lang === "bn" ? "বিষয়ের নাম আবশ্যক" : "Subject name required"); return; }
    if (!form.sections.length) { showNotif(lang === "bn" ? "অন্তত একটি শাখা" : "Pick at least one section"); return; }
    const target = form.sections;
    await run(async () => {
      if (editName) {
        const existing = subjects.filter(x => x.class === activeClass && x.nameBn === editName);
        for (const x of existing) if (!target.includes(x.section)) await deleteSubject(x.id);
        const bySec = new Map(existing.map(x => [x.section, x]));
        for (const sec of target) { const ex = bySec.get(sec); if (ex) await updateSubject(ex.id, { nameBn: form.nameBn, nameEn: form.nameEn, class: activeClass, section: sec }); else await createSubject({ nameBn: form.nameBn, nameEn: form.nameEn, class: activeClass, section: sec }); }
      } else {
        const seen = new Set(subjects.map(s => `${s.class}|${s.section}|${s.nameBn}`));
        for (const sec of target) { if (seen.has(`${activeClass}|${sec}|${form.nameBn}`)) continue; await createSubject({ nameBn: form.nameBn, nameEn: form.nameEn, class: activeClass, section: sec }); }
      }
      closeForm(); setForm(blank);
    }, editName ? (lang === "bn" ? "সম্পাদনা সফল!" : "Updated!") : (lang === "bn" ? "বিষয় যোগ হয়েছে!" : "Subject(s) added!"));
  };

  return (
    <Page>
      <div>
        <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{lang === "bn" ? "শ্রেণি বিন্যাস" : "Class Setup"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? "শ্রেণি বেছে নিন — তার শাখা ও বিষয় ব্যবস্থাপনা করুন" : "Pick a class — manage its sections & subjects"}{loading ? " · …" : ""}</p>
      </div>
      <ErrorNote lang={lang} error={error || secErr} />

      {/* ---- One class selector drives everything ---- */}
      <div className="flex items-center gap-2">
        <Label className="font-semibold">{lang === "bn" ? "শ্রেণী" : "Class"}</Label>
        <Select value={activeClass} onValueChange={setActiveClass}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map(cl => <SelectItem key={cl} value={cl}>{lang === "bn" ? "শ্রেণী " : "Class "}{cl}</SelectItem>)}</SelectContent></Select>
      </div>

      {/* ---- Sections of this class ---- */}
      <Card>
        <CardHeader><CardTitle className="text-base">{lang === "bn" ? `শাখা — শ্রেণী ${activeClass}` : `Sections — Class ${activeClass}`}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {classSecs.length === 0 ? <span className="text-sm text-muted-foreground">{lang === "bn" ? "কোনো শাখা নেই — নিচে যোগ করুন" : "No sections — add below"}</span>
              : classSecs.map(s => (
                <Badge key={s.id} variant="secondary" className="gap-1.5 py-1 text-sm">{s.name}{s.label ? ` · ${s.label}` : ""}
                  {c("subjects.force_delete") && <button onClick={() => run(() => deleteSection(s.id), lang === "bn" ? "শাখা মুছে ফেলা হয়েছে" : "Section deleted")} className="text-muted-foreground hover:text-destructive" aria-label="delete"><X className="h-3.5 w-3.5" /></button>}
                </Badge>
              ))}
          </div>
          {c("subjects.create") && (
            <div className="flex flex-wrap items-end gap-2">
              <Input className="w-24" placeholder={lang === "bn" ? "শাখা (A)" : "Section (A)"} value={newSec.name} onChange={e => setNewSec({ ...newSec, name: e.target.value })} onKeyDown={e => e.key === "Enter" && addSection()} />
              <Input className="w-44" placeholder={lang === "bn" ? "লেবেল (ঐচ্ছিক, যেমন বিজ্ঞান)" : "Label (optional)"} value={newSec.label} onChange={e => setNewSec({ ...newSec, label: e.target.value })} onKeyDown={e => e.key === "Enter" && addSection()} />
              <Button size="sm" variant="outline" disabled={saving} onClick={addSection}><Plus className="h-4 w-4" />{lang === "bn" ? "শাখা" : "Section"}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Subjects of this class ---- */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{lang === "bn" ? `বিষয় — শ্রেণী ${activeClass}` : `Subjects — Class ${activeClass}`} <span className="font-normal text-muted-foreground">({classSubs.length})</span></CardTitle>
          {c("subjects.create") && <Button size="sm" disabled={secNames.length === 0} onClick={openAdd}><Plus className="h-4 w-4" />{lang === "bn" ? "বিষয় যোগ" : "Add Subject"}</Button>}
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-20">{t.section}</TableHead>
              <TableHead>{lang === "bn" ? "বিষয় (বাংলা)" : "Subject (BN)"}</TableHead>
              <TableHead>{lang === "bn" ? "বিষয় (English)" : "Subject (EN)"}</TableHead>
              <TableHead className="w-16">{lang === "bn" ? "অ্যাকশন" : "Action"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {classSubs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{secNames.length === 0 ? (lang === "bn" ? "আগে শাখা যোগ করুন" : "Add sections first") : (lang === "bn" ? "কোনো বিষয় নেই" : "No subjects")}</TableCell></TableRow>
              ) : classSubs.map(s => (
                <TableRow key={s.id}>
                  <TableCell><Badge variant="outline">{s.section}</Badge></TableCell>
                  <TableCell><div className="max-w-xs whitespace-normal wrap-break-word font-medium">{s.nameBn}</div></TableCell>
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
        </CardContent>
      </Card>

      <Dialog open={showForm && c(editId ? "subjects.edit" : "subjects.create")} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? (lang === "bn" ? "বিষয় সম্পাদনা" : "Edit Subject") : (lang === "bn" ? "বিষয় যোগ" : "Add Subject")} — {lang === "bn" ? "শ্রেণী " : "Class "}{activeClass}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="sb-bn">{lang === "bn" ? "বিষয় (বাংলা)" : "Subject (BN)"}</Label><Input id="sb-bn" value={form.nameBn} onChange={e => setForm({ ...form, nameBn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="sb-en">{lang === "bn" ? "বিষয় (English)" : "Subject (EN)"}</Label><Input id="sb-en" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.section} <span className="font-normal text-muted-foreground">{lang === "bn" ? "(যেসব শাখায় থাকবে টিক দিন)" : "(tick sections it belongs to)"}</span></Label>
              <div className="flex flex-wrap gap-3">
                {secNames.map(sec => (
                  <label key={sec} className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5">
                    <Checkbox checked={form.sections.includes(sec)} onCheckedChange={() => toggleSec(sec)} />{sec}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeForm}>{t.cancel}</Button><Button onClick={handleSave} disabled={saving}>{t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDel && <ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); run(() => deleteSubject(id), lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted"); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

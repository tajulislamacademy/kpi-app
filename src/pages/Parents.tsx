import { useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, Check, X, Inbox, RotateCcw } from "lucide-react";
import { errMsg, nextSystemId, genPassword, cn } from "../lib";
import { parentStatusBadge, parentStatusLabel, relationLabel } from "../labels";
import { can } from "../permissions";
import { Tabs, ErrorNote, ConfirmDialog, PasswordInput, Combobox, EmptyState, Page } from "../components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDbParents, createParent, updateParent, setParentStatus, deleteParent, softDeleteParent, restoreParent } from "../api/parents";
import { useDbStudents } from "../api/students";
import type { Dict, Lang, SessionUser, Parent, ParentStatus } from "../types";

interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; }
interface AddForm { studentId: string; name: string; nameEn: string; relation: string; password: string; }
interface EditForm { id: string; studentId: string; name: string; nameEn: string; relation: string; status: ParentStatus; password: string; authId?: string | null; systemId?: string; }

export function ParentsPage({ t, lang, currentUser, showNotif }: Props) {
  const { parents, loading, error, reload } = useDbParents(true, true);
  const { students: dbStudents } = useDbStudents(true);
  const [tab, setTab] = useState("all");
  const c = (cap: string) => can(currentUser, cap);
  const [showAdd, setShowAdd] = useState(false);
  const blankAdd: AddForm = { studentId: "", name: "", nameEn: "", relation: "father", password: "" };
  const [addForm, setAddForm] = useState<AddForm>(blankAdd);
  const [addErr, setAddErr] = useState("");
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [confirmDel, setConfirmDel] = useState<Parent | null>(null);
  const [saving, setSaving] = useState(false);

  const relationOptions = (<><SelectItem value="father">{t.father}</SelectItem><SelectItem value="mother">{t.mother}</SelectItem><SelectItem value="guardian">{t.guardian}</SelectItem></>);
  const studentOptions = dbStudents.map(s => ({ value: s.id, label: `${lang === "bn" ? s.name : s.nameEn} · ${s.systemId}` }));
  const studentName = (uuid: string | null | undefined) => { const s = dbStudents.find(x => x.id === uuid); return s ? `${lang === "bn" ? s.name : s.nameEn} (${s.systemId})` : "—"; };

  const run = async (fn: () => Promise<void>, msg: string) => {
    try { await fn(); await reload(); showNotif(msg); }
    catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
  };

  const handleAdd = async () => {
    setAddErr("");
    if (!addForm.studentId) { setAddErr(t.invalidStudentId); return; }
    if (!addForm.name) { setAddErr(lang === "bn" ? "নাম আবশ্যক" : "Name required"); return; }
    if (addForm.password && addForm.password.length < 6) { setAddErr(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" : "Password min 6"); return; }
    const ex = parents.filter(p => p.studentId === addForm.studentId);
    if (ex.length >= 2) { setAddErr(t.maxParents); return; }
    if (ex.find(p => p.relation === addForm.relation)) { setAddErr(lang === "bn" ? "এই সম্পর্ক ইতিমধ্যে আছে" : "This relation already exists"); return; }
    setSaving(true);
    try {
      const systemId = nextSystemId("PAR", parents);
      await createParent({ systemId, name: addForm.name, nameEn: addForm.nameEn, password: addForm.password, studentId: addForm.studentId, relation: addForm.relation, status: "approved" });
      await reload(); setShowAdd(false); setAddForm(blankAdd);
      showNotif(lang === "bn" ? `অভিভাবক যোগ! ID: ${systemId}` : `Parent added! ID: ${systemId}`);
    } catch (e) { setAddErr((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
    finally { setSaving(false); }
  };

  const openEdit = (p: Parent) => setEdit({ id: p.id, studentId: p.studentId || "", name: p.name || "", nameEn: p.nameEn || "", relation: p.relation, status: p.status, password: "", authId: p.authId, systemId: p.systemId });
  const handleSaveEdit = async () => {
    if (!edit) return;
    if (edit.password && edit.password.length < 6) { showNotif(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" : "Password min 6"); return; }
    setSaving(true);
    await run(() => updateParent(edit.id, { name: edit.name, nameEn: edit.nameEn, relation: edit.relation, status: edit.status, studentId: edit.studentId, password: edit.password || null, authId: edit.authId, systemId: edit.systemId }), lang === "bn" ? "আপডেট হয়েছে!" : "Updated!");
    setSaving(false); setEdit(null);
  };

  const activeP = parents.filter(p => !p.deletedAt);
  const trash = parents.filter(p => p.deletedAt);
  const isTrash = tab === "trash";
  const counts = { all: activeP.length, pending: activeP.filter(p => p.status === "pending").length, approved: activeP.filter(p => p.status === "approved").length, rejected: activeP.filter(p => p.status === "rejected").length };
  const filtered = isTrash ? trash : activeP.filter(p => tab === "all" || p.status === tab);
  const pwHint = (hasLogin: boolean) => hasLogin ? (lang === "bn" ? "খালি = অপরিবর্তিত" : "blank = unchanged") : (lang === "bn" ? "login দিতে পাসওয়ার্ড দিন" : "set to give a login");

  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{lang === "bn" ? "অভিভাবক" : "Parents"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? `মোট ${counts.all} জন` : `Total ${counts.all}`}{loading ? " · …" : ""}</p>
        </div>
        {c("parents.create") && <Button onClick={() => { if (!showAdd) setAddForm({ ...blankAdd, password: genPassword() }); setShowAdd(v => !v); }}><Plus className="h-4 w-4" />{lang === "bn" ? "অভিভাবক যোগ" : "Add Parent"}</Button>}
      </div>
      <ErrorNote lang={lang} error={error} />

      {showAdd && c("parents.create") && (
        <Card>
          <CardHeader><CardTitle className="text-base">{lang === "bn" ? "নতুন অভিভাবক" : "New Parent"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{lang === "bn" ? "শিক্ষার্থী" : "Student"}</Label><Combobox options={studentOptions} value={addForm.studentId} onChange={v => setAddForm({ ...addForm, studentId: v })} placeholder={lang === "bn" ? "শিক্ষার্থী নির্বাচন" : "Select student"} searchPlaceholder={lang === "bn" ? "নাম/ID খুঁজুন…" : "Search name/ID…"} /></div>
              <div className="space-y-1.5"><Label>{t.relation}</Label><Select value={addForm.relation} onValueChange={v => setAddForm({ ...addForm, relation: v })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{relationOptions}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="np-bn">{t.parentName} (বাংলা)</Label><Input id="np-bn" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="np-en">{t.parentName} (English)</Label><Input id="np-en" value={addForm.nameEn} onChange={e => setAddForm({ ...addForm, nameEn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="np-pw">{t.defaultPass} (login)</Label><PasswordInput id="np-pw" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} placeholder={lang === "bn" ? "খালি = login ছাড়া" : "blank = no login"} /></div>
            </div>
            {addErr && <p className="text-sm text-destructive">{addErr}</p>}
            <div className="flex gap-2"><Button onClick={handleAdd} disabled={saving}>{t.save}</Button><Button variant="outline" onClick={() => setShowAdd(false)}>{t.cancel}</Button></div>
          </CardContent>
        </Card>
      )}

      <Tabs
        items={[
          { key: "all", label: `${lang === "bn" ? "সব" : "All"} (${counts.all})` },
          { key: "pending", label: `${t.pending} (${counts.pending})` },
          { key: "approved", label: `${t.approved} (${counts.approved})` },
          { key: "rejected", label: `${t.rejected} (${counts.rejected})` },
          { key: "trash", label: `${lang === "bn" ? "ট্র্যাশ" : "Trash"} (${trash.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {loading && parents.length === 0 ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 w-full animate-pulse rounded-md bg-accent" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Inbox} title={isTrash ? (lang === "bn" ? "ট্র্যাশ খালি" : "Trash is empty") : (lang === "bn" ? "কোনো অভিভাবক নেই" : "No parents")} />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t.autoId}</TableHead>
                <TableHead>{t.parentName}</TableHead>
                <TableHead>{lang === "bn" ? "শিক্ষার্থী" : "Student"}</TableHead>
                <TableHead>{lang === "bn" ? "সম্পর্ক" : "Relation"}</TableHead>
                <TableHead>{lang === "bn" ? "অবস্থা" : "Status"}</TableHead>
                <TableHead className="w-12" />
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.systemId}</code></TableCell>
                    <TableCell className="font-semibold">{lang === "bn" ? p.name : p.nameEn}{!p.authId && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({lang === "bn" ? "login নেই" : "no login"})</span>}</TableCell>
                    <TableCell>{studentName(p.studentId)}</TableCell>
                    <TableCell>{relationLabel(t, p.relation)}</TableCell>
                    <TableCell><Badge className={cn("border-transparent text-xs font-semibold", parentStatusBadge(p.status))}>{parentStatusLabel(t, p.status)}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={lang === "bn" ? "অ্যাকশন" : "Actions"}><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {isTrash ? <>
                            {c("parents.restore") && <DropdownMenuItem onClick={() => run(() => restoreParent(p.id), lang === "bn" ? "ফেরত আনা হয়েছে" : "Restored")}><RotateCcw className="h-4 w-4" />{lang === "bn" ? "ফেরত আনুন" : "Restore"}</DropdownMenuItem>}
                            {c("parents.force_delete") && <DropdownMenuItem variant="destructive" onClick={() => setConfirmDel(p)}><Trash2 className="h-4 w-4" />{lang === "bn" ? "স্থায়ী মুছুন" : "Delete permanently"}</DropdownMenuItem>}
                          </> : <>
                            {p.status === "pending" && c("parents.edit") && <>
                              <DropdownMenuItem onClick={() => run(() => setParentStatus(p.id, "approved"), lang === "bn" ? "অনুমোদিত!" : "Approved!")}><Check className="h-4 w-4" />{t.approve}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => run(() => setParentStatus(p.id, "rejected"), lang === "bn" ? "বাতিল!" : "Rejected!")}><X className="h-4 w-4" />{t.reject}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>}
                            {c("parents.edit") && <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="h-4 w-4" />{t.edit}</DropdownMenuItem>}
                            {c("parents.soft_delete") && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => run(() => softDeleteParent(p.id), lang === "bn" ? "ট্র্যাশে পাঠানো হয়েছে" : "Moved to Trash")}><Trash2 className="h-4 w-4" />{lang === "bn" ? "ট্র্যাশে পাঠান" : "Move to Trash"}</DropdownMenuItem></>}
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

      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{lang === "bn" ? "অভিভাবক সম্পাদনা" : "Edit Parent"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{lang === "bn" ? "শিক্ষার্থী" : "Student"}</Label><Combobox options={studentOptions} value={edit.studentId} onChange={v => setEdit({ ...edit, studentId: v })} placeholder={lang === "bn" ? "শিক্ষার্থী নির্বাচন" : "Select student"} searchPlaceholder={lang === "bn" ? "নাম/ID খুঁজুন…" : "Search…"} /></div>
              <div className="space-y-1.5"><Label>{t.relation}</Label><Select value={edit.relation} onValueChange={v => setEdit({ ...edit, relation: v })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{relationOptions}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>{t.parentName} (বাংলা)</Label><Input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.parentName} (English)</Label><Input value={edit.nameEn} onChange={e => setEdit({ ...edit, nameEn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{lang === "bn" ? "অবস্থা" : "Status"}</Label><Select value={edit.status} onValueChange={v => setEdit({ ...edit, status: v as ParentStatus })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="approved">{t.approved}</SelectItem><SelectItem value="pending">{t.pending}</SelectItem><SelectItem value="rejected">{t.rejected}</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>{lang === "bn" ? "পাসওয়ার্ড" : "Password"}</Label><PasswordInput value={edit.password} onChange={e => setEdit({ ...edit, password: e.target.value })} placeholder={pwHint(!!edit.authId)} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>{t.cancel}</Button><Button onClick={handleSaveEdit} disabled={saving}>{t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDel && <ConfirmDialog lang={lang} name={(lang === "bn" ? confirmDel.name : confirmDel.nameEn) || ""} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); run(() => deleteParent(id), lang === "bn" ? "স্থায়ীভাবে মুছা হয়েছে!" : "Permanently deleted!"); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

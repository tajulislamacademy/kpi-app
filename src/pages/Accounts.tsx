import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { genId, errMsg, cn } from "../lib";
import { StatCard, Tabs, ErrorNote, ConfirmDialog, PasswordInput } from "../components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDbParents, createParent, updateParent, setParentStatus, deleteParent } from "../api/parents";
import { useDbStudents } from "../api/students";
import type { Dict, Lang, Parent, ParentStatus } from "../types";

interface Props { t: Dict; lang: Lang; showNotif: (msg: string) => void; }
interface AddForm { studentId: string; name: string; nameEn: string; relation: string; password: string; }
interface EditForm { name: string; nameEn: string; password: string; relation: string; status: ParentStatus; _authId?: string | null; _systemId?: string; }

const statusBadge = (s: string) =>
  s === "approved" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    : s === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";

export function AccountsPage({ t, lang, showNotif }: Props) {
  const { parents, reload, error: e1 } = useDbParents(true);
  const { students: dbStudents, error: e2 } = useDbStudents(true);
  const [tab, setTab] = useState("pending");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddForm>({ studentId: "", name: "", nameEn: "", relation: "father", password: "123456" });
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [editParent, setEditParent] = useState<Parent | null>(null);
  const [parentForm, setParentForm] = useState<EditForm>({ name: "", nameEn: "", password: "", relation: "father", status: "approved" });
  const [confirmParentDel, setConfirmParentDel] = useState<{ id: string; name: string } | null>(null);
  const nextSystemId = () => { const yr = new Date().getFullYear(); const max = parents.reduce((m, p) => { const n = parseInt(String(p.systemId || "").split("-")[1]?.slice(4) ?? "") || 0; return Math.max(m, n); }, 0); return genId("PAR", yr, max + 1); };
  const openEditParent = (p: Parent) => { setEditParent(p); setParentForm({ name: p.name || "", nameEn: p.nameEn || "", password: "", relation: p.relation, status: p.status, _authId: p.authId, _systemId: p.systemId }); };
  const handleSaveParent = async () => {
    if (!editParent) return;
    if (parentForm.password && parentForm.password.length < 6) { showNotif(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" : "Password min 6"); return; }
    setSaving(true);
    try {
      await updateParent(editParent.id, { name: parentForm.name, nameEn: parentForm.nameEn, relation: parentForm.relation, status: parentForm.status, password: parentForm.password || null, authId: parentForm._authId, systemId: parentForm._systemId });
      await reload(); setEditParent(null); showNotif(lang === "bn" ? "আপডেট হয়েছে!" : "Updated!");
    } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
    finally { setSaving(false); }
  };
  const handleAddParent = async () => {
    setFormErr("");
    const st = dbStudents.find(s => s.systemId === form.studentId);
    if (!st) { setFormErr(t.invalidStudentId); return; }
    if (!form.name) { setFormErr(lang === "bn" ? "নাম আবশ্যক" : "Name required"); return; }
    if (form.password && form.password.length < 6) { setFormErr(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" : "Password min 6"); return; }
    const ex = parents.filter(p => p.studentId === st.id);
    if (ex.length >= 2) { setFormErr(t.maxParents); return; }
    if (ex.find(p => p.relation === form.relation)) { setFormErr(lang === "bn" ? "ইতিমধ্যে আছে" : "Already exists"); return; }
    setSaving(true);
    try {
      const systemId = nextSystemId();
      await createParent({ systemId, name: form.name, nameEn: form.nameEn, password: form.password, studentId: st.id, relation: form.relation, status: "approved" });
      await reload(); setShowForm(false);
      setForm({ studentId: "", name: "", nameEn: "", relation: "father", password: "123456" });
      showNotif(lang === "bn" ? `অভিভাবক যোগ! ID: ${systemId}` : `Parent added! ID: ${systemId}`);
    } catch (e) { setFormErr((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
    finally { setSaving(false); }
  };
  const approve = async (id: string) => { try { await setParentStatus(id, "approved"); await reload(); showNotif(lang === "bn" ? "অনুমোদন হয়েছে!" : "Approved!"); } catch (e) { showNotif(errMsg(e)); } };
  const reject = async (id: string) => { try { await setParentStatus(id, "rejected"); await reload(); showNotif(lang === "bn" ? "বাতিল হয়েছে!" : "Rejected!"); } catch (e) { showNotif(errMsg(e)); } };
  const doDelete = async (id: string) => { try { await deleteParent(id); await reload(); showNotif(lang === "bn" ? "মুছা হয়েছে!" : "Deleted!"); } catch (e) { showNotif(errMsg(e)); } };
  const pending = parents.filter(p => p.status === "pending"), approved = parents.filter(p => p.status === "approved"), rejected = parents.filter(p => p.status === "rejected");
  const current = tab === "pending" ? pending : tab === "approved" ? approved : rejected;
  const relLabel = (r: string) => r === "father" ? t.father : r === "mother" ? t.mother : t.guardian;
  const statusLabel = (s: string) => s === "approved" ? t.approved : s === "rejected" ? t.rejected : t.pending;
  const relationOptions = (<><SelectItem value="father">{t.father}</SelectItem><SelectItem value="mother">{t.mother}</SelectItem><SelectItem value="guardian">{t.guardian}</SelectItem></>);
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.accountManagement}</h2>
        <Button onClick={() => setShowForm(v => !v)}><Plus className="h-4 w-4" />{lang === "bn" ? "অভিভাবক যোগ" : "Add Parent"}</Button>
      </div>
      <ErrorNote lang={lang} error={e1 || e2} />

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{lang === "bn" ? "নতুন অভিভাবক" : "New Parent"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.studentId}</Label>
                <Input value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} placeholder="STD-20260001" />
                {form.studentId && (() => { const st = dbStudents.find(s => s.systemId === form.studentId); return st ? <div className="text-xs text-green-600 dark:text-green-400">✅ {lang === "bn" ? st.name : st.nameEn}</div> : <div className="text-xs text-destructive">❌</div>; })()}
              </div>
              <div className="space-y-1.5">
                <Label>{t.relation}</Label>
                <Select value={form.relation} onValueChange={v => setForm({ ...form, relation: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{relationOptions}</SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label>{t.parentName} (বাংলা)</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.parentName} (English)</Label><Input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.defaultPass} (login)</Label><PasswordInput value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={lang === "bn" ? "খালি = login ছাড়া" : "blank = no login"} /></div>
            </div>
            {formErr && <p className="text-sm text-destructive">{formErr}</p>}
            <div className="flex gap-2"><Button onClick={handleAddParent} disabled={saving}>{t.save}</Button><Button variant="outline" onClick={() => setShowForm(false)}>{t.cancel}</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="⏳" value={pending.length} label={t.pending} />
        <StatCard icon="✅" value={approved.length} label={t.approved} />
        <StatCard icon="❌" value={rejected.length} label={t.rejected} />
        <StatCard icon="👥" value={parents.length} label={lang === "bn" ? "মোট অভিভাবক" : "Total Parents"} />
      </div>

      <Tabs items={[{ key: "pending", label: `${t.pending}(${pending.length})` }, { key: "approved", label: t.approved }, { key: "rejected", label: t.rejected }]} active={tab} onChange={setTab} />

      <Card>
        <CardContent className="pt-6">
          {current.length === 0 ? <div className="py-8 text-center text-muted-foreground">{lang === "bn" ? "কোনো অ্যাকাউন্ট নেই" : "No accounts"}</div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{lang === "bn" ? "অভিভাবক" : "Parent"}</TableHead>
                <TableHead>{lang === "bn" ? "সম্পর্ক" : "Relation"}</TableHead>
                <TableHead>{lang === "bn" ? "শিক্ষার্থী" : "Student"}</TableHead>
                <TableHead>{t.autoId}</TableHead>
                <TableHead>{lang === "bn" ? "অবস্থা" : "Status"}</TableHead>
                <TableHead>{lang === "bn" ? "অ্যাকশন" : "Action"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {current.map((p) => { const st = dbStudents.find(s => s.id === p.studentId); return (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{lang === "bn" ? p.name : p.nameEn}</TableCell>
                    <TableCell>{relLabel(p.relation)}</TableCell>
                    <TableCell><div className="text-sm">{lang === "bn" ? st?.name : st?.nameEn}</div><div className="text-xs text-muted-foreground">{st?.systemId}</div></TableCell>
                    <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.systemId}</code></TableCell>
                    <TableCell><Badge className={cn("border-transparent font-semibold", statusBadge(p.status))}>{statusLabel(p.status)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {tab === "pending" && <>
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-green-700 dark:text-green-400" onClick={() => approve(p.id)}><Check className="h-3.5 w-3.5" />{t.approve}</Button>
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive" onClick={() => reject(p.id)}><X className="h-3.5 w-3.5" />{t.reject}</Button>
                        </>}
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openEditParent(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => setConfirmParentDel({ id: p.id, name: (lang === "bn" ? p.name : p.nameEn) || "" })}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editParent} onOpenChange={(o) => { if (!o) setEditParent(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{lang === "bn" ? "অভিভাবক সম্পাদনা" : "Edit Parent"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>{t.parentName} (বাংলা)</Label><Input value={parentForm.name} onChange={e => setParentForm({ ...parentForm, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t.parentName} (English)</Label><Input value={parentForm.nameEn} onChange={e => setParentForm({ ...parentForm, nameEn: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t.defaultPass}</Label><PasswordInput value={parentForm.password} onChange={e => setParentForm({ ...parentForm, password: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t.relation}</Label><Select value={parentForm.relation} onValueChange={v => setParentForm({ ...parentForm, relation: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{relationOptions}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>{lang === "bn" ? "অবস্থা" : "Status"}</Label><Select value={parentForm.status} onValueChange={v => setParentForm({ ...parentForm, status: v as ParentStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="approved">{t.approved}</SelectItem><SelectItem value="pending">{t.pending}</SelectItem><SelectItem value="rejected">{t.rejected}</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditParent(null)}>{t.cancel}</Button><Button onClick={handleSaveParent} disabled={saving}>{t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmParentDel && <ConfirmDialog lang={lang} name={confirmParentDel.name} onConfirm={() => { const id = confirmParentDel.id; setConfirmParentDel(null); doDelete(id); }} onCancel={() => setConfirmParentDel(null)} />}
    </div>
  );
}

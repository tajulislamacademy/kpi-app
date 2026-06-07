import { useState } from "react";
import { Plus, MoreHorizontal, Shield, ShieldOff, KeyRound, LogIn, LogOut, Check, X, Pencil, Trash2, Clock, UsersRound, Inbox, Search } from "lucide-react";
import { errMsg, nextSystemId } from "../lib";
import { cn } from "../lib";
import { StatCard, Tabs, ErrorNote, ConfirmDialog, PasswordInput, EmptyState, Page } from "../components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDbAccounts, setAdmin, grantLogin, revokeLogin, resetPassword, deleteAccount, type Account } from "../api/accounts";
import { createParent, updateParent, setParentStatus } from "../api/parents";
import { useDbStudents } from "../api/students";
import type { Dict, Lang, SessionUser, ParentStatus } from "../types";

interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; }
interface AddForm { studentId: string; name: string; nameEn: string; relation: string; password: string; }
interface PEdit { id: string; name: string; nameEn: string; relation: string; status: ParentStatus; }

const roleBadgeClass = (role: string) =>
  role === "admin" ? "bg-primary/15 text-primary"
    : role === "teacher" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
      : role === "student" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
        : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
const statusClass = (s: string) =>
  s === "approved" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    : s === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";

export function AccountsPage({ t, lang, currentUser, showNotif }: Props) {
  const { accounts, loading, error, reload } = useDbAccounts(true);
  const { students: dbStudents } = useDbStudents(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({ studentId: "", name: "", nameEn: "", relation: "father", password: "123456" });
  const [addErr, setAddErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwTarget, setPwTarget] = useState<Account | null>(null);
  const [grantTarget, setGrantTarget] = useState<Account | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [editP, setEditP] = useState<PEdit | null>(null);
  const [confirmDel, setConfirmDel] = useState<Account | null>(null);

  const roleLabel = (r: string) => r === "admin" ? t.admin : r === "teacher" ? t.teacher : r === "student" ? t.student : t.parent;
  const statusLabel = (s: string) => s === "approved" ? t.approved : s === "rejected" ? t.rejected : t.pending;
  const relationOptions = (<><SelectItem value="father">{t.father}</SelectItem><SelectItem value="mother">{t.mother}</SelectItem><SelectItem value="guardian">{t.guardian}</SelectItem></>);

  const run = async (fn: () => Promise<void>, msg: string) => {
    try { await fn(); await reload(); showNotif(msg); }
    catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
  };

  const handleAddParent = async () => {
    setAddErr("");
    const st = dbStudents.find(s => s.systemId === addForm.studentId);
    if (!st) { setAddErr(t.invalidStudentId); return; }
    if (!addForm.name) { setAddErr(lang === "bn" ? "নাম আবশ্যক" : "Name required"); return; }
    if (addForm.password && addForm.password.length < 6) { setAddErr(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" : "Password min 6"); return; }
    setSaving(true);
    try {
      const systemId = nextSystemId("PAR", accounts);
      await createParent({ systemId, name: addForm.name, nameEn: addForm.nameEn, password: addForm.password, studentId: st.id, relation: addForm.relation, status: "approved" });
      await reload(); setShowAdd(false);
      setAddForm({ studentId: "", name: "", nameEn: "", relation: "father", password: "123456" });
      showNotif(lang === "bn" ? `অভিভাবক যোগ! ID: ${systemId}` : `Parent added! ID: ${systemId}`);
    } catch (e) { setAddErr((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
    finally { setSaving(false); }
  };
  const handleResetPw = async () => {
    if (!pwTarget) return;
    if (pwValue.length < 6) { showNotif(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" : "Password min 6"); return; }
    setSaving(true);
    await run(() => resetPassword(pwTarget.id, pwValue), lang === "bn" ? "পাসওয়ার্ড পরিবর্তন হয়েছে!" : "Password reset!");
    setSaving(false); setPwTarget(null); setPwValue("");
  };
  const handleGrant = async () => {
    if (!grantTarget) return;
    if (pwValue.length < 6) { showNotif(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" : "Password min 6"); return; }
    setSaving(true);
    await run(() => grantLogin(grantTarget.id, grantTarget.systemId, pwValue), lang === "bn" ? "লগইন তৈরি হয়েছে!" : "Login granted!");
    setSaving(false); setGrantTarget(null); setPwValue("");
  };
  const handleSaveEdit = async () => {
    if (!editP) return;
    setSaving(true);
    await run(() => updateParent(editP.id, { name: editP.name, nameEn: editP.nameEn, relation: editP.relation, status: editP.status, password: null, authId: undefined, systemId: undefined }), lang === "bn" ? "আপডেট হয়েছে!" : "Updated!");
    setSaving(false); setEditP(null);
  };

  const counts = {
    all: accounts.length,
    admin: accounts.filter(a => a.isAdmin).length,
    teacher: accounts.filter(a => a.role === "teacher").length,
    student: accounts.filter(a => a.role === "student").length,
    parent: accounts.filter(a => a.role === "parent").length,
  };
  const pending = accounts.filter(a => a.role === "parent" && a.parentStatus === "pending").length;
  const withLogin = accounts.filter(a => a.hasLogin).length;
  const q = search.trim().toLowerCase();
  const filtered = accounts
    .filter(a => tab === "all" || (tab === "admin" ? a.isAdmin : a.role === tab))
    .filter(a => !q || `${a.name} ${a.nameEn} ${a.systemId}`.toLowerCase().includes(q));

  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.accountManagement}</h2>
        <Button onClick={() => setShowAdd(v => !v)}><Plus className="h-4 w-4" />{lang === "bn" ? "অভিভাবক যোগ" : "Add Parent"}</Button>
      </div>
      <ErrorNote lang={lang} error={error} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<UsersRound />} value={accounts.length} label={lang === "bn" ? "মোট অ্যাকাউন্ট" : "Total"} />
        <StatCard icon={<Shield />} value={counts.admin} label={t.admin} />
        <StatCard icon={<KeyRound />} value={withLogin} label={lang === "bn" ? "লগইন আছে" : "With login"} />
        <StatCard icon={<Clock />} value={pending} label={lang === "bn" ? "অপেক্ষমাণ অভিভাবক" : "Pending parents"} />
      </div>

      {showAdd && (
        <Card>
          <CardHeader><CardTitle className="text-base">{lang === "bn" ? "নতুন অভিভাবক" : "New Parent"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ap-sid">{t.studentId}</Label>
                <Input id="ap-sid" value={addForm.studentId} onChange={e => setAddForm({ ...addForm, studentId: e.target.value })} placeholder="STD-20260001" />
                {addForm.studentId && (() => { const st = dbStudents.find(s => s.systemId === addForm.studentId); return st ? <div className="text-xs text-green-600 dark:text-green-400">✓ {lang === "bn" ? st.name : st.nameEn}</div> : <div className="text-xs text-destructive">✗</div>; })()}
              </div>
              <div className="space-y-1.5"><Label>{t.relation}</Label><Select value={addForm.relation} onValueChange={v => setAddForm({ ...addForm, relation: v })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{relationOptions}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="ap-bn">{t.parentName} (বাংলা)</Label><Input id="ap-bn" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="ap-en">{t.parentName} (English)</Label><Input id="ap-en" value={addForm.nameEn} onChange={e => setAddForm({ ...addForm, nameEn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="ap-pw">{t.defaultPass} (login)</Label><PasswordInput id="ap-pw" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} placeholder={lang === "bn" ? "খালি = login ছাড়া" : "blank = no login"} /></div>
            </div>
            {addErr && <p className="text-sm text-destructive">{addErr}</p>}
            <div className="flex gap-2"><Button onClick={handleAddParent} disabled={saving}>{t.save}</Button><Button variant="outline" onClick={() => setShowAdd(false)}>{t.cancel}</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          items={[
            { key: "all", label: `${lang === "bn" ? "সব" : "All"} (${counts.all})` },
            { key: "admin", label: `${t.admin} (${counts.admin})` },
            { key: "teacher", label: `${t.teacher} (${counts.teacher})` },
            { key: "student", label: `${t.student} (${counts.student})` },
            { key: "parent", label: `${t.parent} (${counts.parent})` },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder={lang === "bn" ? "নাম / ID খুঁজুন…" : "Search name / ID…"} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {loading && accounts.length === 0 ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 w-full animate-pulse rounded-md bg-accent" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Inbox} title={lang === "bn" ? "কোনো অ্যাকাউন্ট নেই" : "No accounts"} />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t.autoId}</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead>{lang === "bn" ? "ভূমিকা" : "Role"}</TableHead>
                <TableHead>{lang === "bn" ? "অ্যাক্সেস" : "Access"}</TableHead>
                <TableHead className="w-12" />
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const self = a.id === currentUser.id;
                  const canToggleAdmin = !a.isRoot && a.role !== "admin";
                  const isParent = a.role === "parent";
                  return (
                    <TableRow key={a.id}>
                      <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{a.systemId}</code></TableCell>
                      <TableCell className="font-semibold">{lang === "bn" ? a.name : a.nameEn}{a.isRoot && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({t.rootAdmin})</span>}</TableCell>
                      <TableCell><Badge className={cn("border-transparent font-semibold", roleBadgeClass(a.role))}>{roleLabel(a.role)}</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {a.isAdmin && <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" />{t.admin}</Badge>}
                          {a.hasLogin
                            ? <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400">{lang === "bn" ? "লগইন" : "Login"}</Badge>
                            : <Badge variant="outline" className="text-xs text-muted-foreground">{lang === "bn" ? "লগইন নেই" : "No login"}</Badge>}
                          {isParent && a.parentStatus && <Badge className={cn("border-transparent text-xs font-semibold", statusClass(a.parentStatus))}>{statusLabel(a.parentStatus)}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={lang === "bn" ? "অ্যাকশন" : "Actions"}><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {isParent && a.parentStatus === "pending" && <>
                              <DropdownMenuItem onClick={() => run(() => setParentStatus(a.id, "approved"), lang === "bn" ? "অনুমোদিত!" : "Approved!")}><Check className="h-4 w-4" />{t.approve}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => run(() => setParentStatus(a.id, "rejected"), lang === "bn" ? "বাতিল!" : "Rejected!")}><X className="h-4 w-4" />{t.reject}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>}
                            {canToggleAdmin && <DropdownMenuItem onClick={() => run(() => setAdmin(a.id, !a.isAdmin), a.isAdmin ? (lang === "bn" ? "অ্যাডমিন সরানো হয়েছে" : "Admin removed") : (lang === "bn" ? "অ্যাডমিন করা হয়েছে" : "Made admin"))}>{a.isAdmin ? <><ShieldOff className="h-4 w-4" />{t.removeAdmin}</> : <><Shield className="h-4 w-4" />{t.makeAdmin}</>}</DropdownMenuItem>}
                            {a.hasLogin
                              ? <DropdownMenuItem onClick={() => { setPwTarget(a); setPwValue(""); }}><KeyRound className="h-4 w-4" />{lang === "bn" ? "পাসওয়ার্ড রিসেট" : "Reset password"}</DropdownMenuItem>
                              : <DropdownMenuItem onClick={() => { setGrantTarget(a); setPwValue(""); }}><LogIn className="h-4 w-4" />{lang === "bn" ? "লগইন দিন" : "Grant login"}</DropdownMenuItem>}
                            {a.hasLogin && !a.isRoot && !self && <DropdownMenuItem onClick={() => run(() => revokeLogin(a.id), lang === "bn" ? "লগইন বন্ধ" : "Login revoked")}><LogOut className="h-4 w-4" />{lang === "bn" ? "লগইন বন্ধ করুন" : "Revoke login"}</DropdownMenuItem>}
                            {isParent && <DropdownMenuItem onClick={() => setEditP({ id: a.id, name: a.name || "", nameEn: a.nameEn || "", relation: a.parentRelation || "father", status: (a.parentStatus as ParentStatus) || "approved" })}><Pencil className="h-4 w-4" />{t.edit}</DropdownMenuItem>}
                            {!a.isRoot && !self && <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDel(a)}><Trash2 className="h-4 w-4" />{t.deleteAdmin}</DropdownMenuItem>
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

      {/* Reset password */}
      <Dialog open={!!pwTarget} onOpenChange={(o) => { if (!o) { setPwTarget(null); setPwValue(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{lang === "bn" ? "পাসওয়ার্ড রিসেট" : "Reset password"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{pwTarget && (lang === "bn" ? pwTarget.name : pwTarget.nameEn)} · {pwTarget?.systemId}</p>
          <div className="space-y-1.5"><Label htmlFor="rp-pw">{t.newPassword}</Label><PasswordInput id="rp-pw" value={pwValue} onChange={e => setPwValue(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setPwTarget(null)}>{t.cancel}</Button><Button onClick={handleResetPw} disabled={saving}>{t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant login */}
      <Dialog open={!!grantTarget} onOpenChange={(o) => { if (!o) { setGrantTarget(null); setPwValue(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{lang === "bn" ? "লগইন দিন" : "Grant login"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{grantTarget && (lang === "bn" ? grantTarget.name : grantTarget.nameEn)} · {grantTarget?.systemId}</p>
          <div className="space-y-1.5"><Label htmlFor="gl-pw">{lang === "bn" ? "পাসওয়ার্ড" : "Password"}</Label><PasswordInput id="gl-pw" value={pwValue} onChange={e => setPwValue(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setGrantTarget(null)}>{t.cancel}</Button><Button onClick={handleGrant} disabled={saving}>{t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parent edit */}
      <Dialog open={!!editP} onOpenChange={(o) => { if (!o) setEditP(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{lang === "bn" ? "অভিভাবক সম্পাদনা" : "Edit Parent"}</DialogTitle></DialogHeader>
          {editP && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{t.parentName} (বাংলা)</Label><Input value={editP.name} onChange={e => setEditP({ ...editP, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.parentName} (English)</Label><Input value={editP.nameEn} onChange={e => setEditP({ ...editP, nameEn: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t.relation}</Label><Select value={editP.relation} onValueChange={v => setEditP({ ...editP, relation: v })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{relationOptions}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>{lang === "bn" ? "অবস্থা" : "Status"}</Label><Select value={editP.status} onValueChange={v => setEditP({ ...editP, status: v as ParentStatus })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="approved">{t.approved}</SelectItem><SelectItem value="pending">{t.pending}</SelectItem><SelectItem value="rejected">{t.rejected}</SelectItem></SelectContent></Select></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditP(null)}>{t.cancel}</Button><Button onClick={handleSaveEdit} disabled={saving}>{t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDel && <ConfirmDialog lang={lang} name={(lang === "bn" ? confirmDel.name : confirmDel.nameEn) || ""} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); run(() => deleteAccount(id), lang === "bn" ? "মুছা হয়েছে!" : "Deleted!"); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

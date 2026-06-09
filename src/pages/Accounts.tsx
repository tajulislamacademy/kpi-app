import { useState } from "react";
import { MoreHorizontal, Shield, ShieldOff, SlidersHorizontal, KeyRound, LogIn, LogOut, Trash2, Clock, UsersRound, Inbox, Search } from "lucide-react";
import { errMsg, cn } from "../lib";
import { can, RESOURCES, ACTIONS, AREAS } from "../permissions";
import { accountRoleBadge, accountRoleLabel } from "../labels";
import { StatCard, Tabs, ErrorNote, ConfirmDialog, PasswordInput, EmptyState, Page } from "../components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDbAccounts, setAdmin, setAdminPermissions, grantLogin, revokeLogin, resetPassword, deleteAccount, type Account } from "../api/accounts";
import type { Dict, Lang, SessionUser } from "../types";

const RES_LABEL: Record<string, [string, string]> = { students: ["শিক্ষার্থী", "Students"], teachers: ["শিক্ষক", "Teachers"], parents: ["অভিভাবক", "Parents"], questions: ["প্রশ্ন", "Questions"] };
const ACT_LABEL: Record<string, [string, string]> = { view: ["দেখা", "View"], create: ["তৈরি", "Create"], edit: ["সম্পাদনা", "Edit"], soft_delete: ["ট্র্যাশ", "Trash"], force_delete: ["স্থায়ী মুছা", "Delete"], restore: ["ফেরত", "Restore"] };
const AREA_LABEL: Record<string, [string, string]> = { point_entry: ["পয়েন্ট এন্ট্রি", "Point entry"], teacher_kpi: ["শিক্ষক KPI", "Teacher KPI"], parent_kpi: ["অভিভাবক KPI", "Parent KPI"], "reports.view": ["রিপোর্ট", "Reports"], "settings.edit": ["সেটিংস", "Settings"], "accounts.manage": ["অ্যাকাউন্ট ম্যানেজ", "Manage accounts"], "admins.manage": ["অ্যাডমিন ব্যবস্থাপনা", "Manage admins"] };
const PRESETS: Record<string, string[]> = {
  data_entry: ["point_entry", "teacher_kpi", "parent_kpi", "reports.view", "students.view", "teachers.view", "parents.view", "questions.view"],
  academic: ["students", "teachers", "questions"].flatMap(r => ["view", "create", "edit", "soft_delete"].map(a => `${r}.${a}`)).concat(["settings.edit", "reports.view"]),
  account: ["accounts.manage", "reports.view"],
  parent: ["parents.view", "parents.create", "parents.edit", "parents.soft_delete", "reports.view"],
};
// admins.manage stays super-admin-only → not offered as an assignable area.
const ASSIGNABLE_AREAS = AREAS.filter(a => a !== "admins.manage");

interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; }

export function AccountsPage({ t, lang, currentUser, showNotif }: Props) {
  const { accounts, loading, error, reload } = useDbAccounts(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [pwTarget, setPwTarget] = useState<Account | null>(null);
  const [grantTarget, setGrantTarget] = useState<Account | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [confirmDel, setConfirmDel] = useState<Account | null>(null);
  const [permTarget, setPermTarget] = useState<Account | null>(null);
  const [permSel, setPermSel] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const manageAdmins = can(currentUser, "admins.manage");

  const openPerm = (a: Account) => { setPermTarget(a); setPermSel(a.permissions || []); };
  const togglePerm = (cap: string) => setPermSel(p => p.includes(cap) ? p.filter(x => x !== cap) : [...p, cap]);
  const savePerm = async () => { if (!permTarget) return; setSaving(true); await run(() => setAdminPermissions(permTarget.id, permSel), lang === "bn" ? "পারমিশন সংরক্ষণ!" : "Permissions saved!"); setSaving(false); setPermTarget(null); };

  const run = async (fn: () => Promise<void>, msg: string) => {
    try { await fn(); await reload(); showNotif(msg); }
    catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
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

  const counts = {
    all: accounts.length,
    admin: accounts.filter(a => a.isAdmin).length,
    teacher: accounts.filter(a => a.role === "teacher").length,
    student: accounts.filter(a => a.role === "student").length,
    parent: accounts.filter(a => a.role === "parent").length,
  };
  const withLogin = accounts.filter(a => a.hasLogin).length;
  const q = search.trim().toLowerCase();
  const filtered = accounts
    .filter(a => tab === "all" || (tab === "admin" ? a.isAdmin : a.role === tab))
    .filter(a => !q || `${a.name} ${a.nameEn} ${a.systemId}`.toLowerCase().includes(q));

  return (
    <Page>
      <div>
        <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.accountManagement}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? "সব অ্যাকাউন্টের অ্যাক্সেস ও অনুমতি" : "Access & permissions for all accounts"}</p>
      </div>
      <ErrorNote lang={lang} error={error} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<UsersRound />} value={accounts.length} label={lang === "bn" ? "মোট অ্যাকাউন্ট" : "Total"} />
        <StatCard icon={<Shield />} value={counts.admin} label={t.admin} />
        <StatCard icon={<KeyRound />} value={withLogin} label={lang === "bn" ? "লগইন আছে" : "With login"} />
        <StatCard icon={<Clock />} value={accounts.filter(a => a.role === "parent" && a.parentStatus === "pending").length} label={lang === "bn" ? "অপেক্ষমাণ অভিভাবক" : "Pending parents"} />
      </div>

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
                  return (
                    <TableRow key={a.id}>
                      <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{a.systemId}</code></TableCell>
                      <TableCell className="font-semibold">{lang === "bn" ? a.name : a.nameEn}{a.isRoot && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({t.rootAdmin})</span>}</TableCell>
                      <TableCell><Badge className={cn("border-transparent font-semibold", accountRoleBadge(a.role))}>{accountRoleLabel(t, a.role)}</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {a.isAdmin && <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" />{t.admin}</Badge>}
                          {a.hasLogin
                            ? <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400">{lang === "bn" ? "লগইন" : "Login"}</Badge>
                            : <Badge variant="outline" className="text-xs text-muted-foreground">{lang === "bn" ? "লগইন নেই" : "No login"}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={lang === "bn" ? "অ্যাকশন" : "Actions"}><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            {canToggleAdmin && manageAdmins && (a.isAdmin ? <>
                              <DropdownMenuItem onClick={() => openPerm(a)}><SlidersHorizontal className="h-4 w-4" />{lang === "bn" ? "পারমিশন" : "Permissions"}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => run(() => setAdmin(a.id, false), lang === "bn" ? "অ্যাডমিন সরানো হয়েছে" : "Admin removed")}><ShieldOff className="h-4 w-4" />{t.removeAdmin}</DropdownMenuItem>
                            </> : <DropdownMenuItem onClick={() => openPerm(a)}><Shield className="h-4 w-4" />{t.makeAdmin}</DropdownMenuItem>)}
                            {a.hasLogin
                              ? <DropdownMenuItem onClick={() => { setPwTarget(a); setPwValue(""); }}><KeyRound className="h-4 w-4" />{lang === "bn" ? "পাসওয়ার্ড রিসেট" : "Reset password"}</DropdownMenuItem>
                              : <DropdownMenuItem onClick={() => { setGrantTarget(a); setPwValue(""); }}><LogIn className="h-4 w-4" />{lang === "bn" ? "লগইন দিন" : "Grant login"}</DropdownMenuItem>}
                            {a.hasLogin && !a.isRoot && !self && <DropdownMenuItem onClick={() => run(() => revokeLogin(a.id), lang === "bn" ? "লগইন বন্ধ" : "Login revoked")}><LogOut className="h-4 w-4" />{lang === "bn" ? "লগইন বন্ধ করুন" : "Revoke login"}</DropdownMenuItem>}
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

      <Dialog open={!!pwTarget} onOpenChange={(o) => { if (!o) { setPwTarget(null); setPwValue(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{lang === "bn" ? "পাসওয়ার্ড রিসেট" : "Reset password"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{pwTarget && (lang === "bn" ? pwTarget.name : pwTarget.nameEn)} · {pwTarget?.systemId}</p>
          <div className="space-y-1.5"><Label htmlFor="rp-pw">{t.newPassword}</Label><PasswordInput id="rp-pw" value={pwValue} onChange={e => setPwValue(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setPwTarget(null)}>{t.cancel}</Button><Button onClick={handleResetPw} disabled={saving}>{t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!grantTarget} onOpenChange={(o) => { if (!o) { setGrantTarget(null); setPwValue(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{lang === "bn" ? "লগইন দিন" : "Grant login"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{grantTarget && (lang === "bn" ? grantTarget.name : grantTarget.nameEn)} · {grantTarget?.systemId}</p>
          <div className="space-y-1.5"><Label htmlFor="gl-pw">{lang === "bn" ? "পাসওয়ার্ড" : "Password"}</Label><PasswordInput id="gl-pw" value={pwValue} onChange={e => setPwValue(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setGrantTarget(null)}>{t.cancel}</Button><Button onClick={handleGrant} disabled={saving}>{t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permTarget} onOpenChange={(o) => { if (!o) setPermTarget(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{lang === "bn" ? "পারমিশন" : "Permissions"} — {permTarget && (lang === "bn" ? permTarget.name : permTarget.nameEn)}</DialogTitle></DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{lang === "bn" ? "প্রিসেট:" : "Preset:"}</span>
            <Button size="sm" variant="outline" onClick={() => setPermSel(PRESETS.data_entry)}>{lang === "bn" ? "ডেটা-এন্ট্রি" : "Data-entry"}</Button>
            <Button size="sm" variant="outline" onClick={() => setPermSel(PRESETS.academic)}>{lang === "bn" ? "একাডেমিক" : "Academic"}</Button>
            <Button size="sm" variant="outline" onClick={() => setPermSel(PRESETS.parent)}>{lang === "bn" ? "অভিভাবক" : "Parent"}</Button>
            <Button size="sm" variant="outline" onClick={() => setPermSel(PRESETS.account)}>{lang === "bn" ? "অ্যাকাউন্ট" : "Account"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setPermSel([])}>{lang === "bn" ? "ক্লিয়ার" : "Clear"}</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="p-2 text-left" />{ACTIONS.map(act => <th key={act} className="p-2 text-center text-xs font-medium text-muted-foreground">{ACT_LABEL[act][lang === "bn" ? 0 : 1]}</th>)}</tr></thead>
              <tbody>
                {RESOURCES.map(res => (
                  <tr key={res} className="border-t border-border/50">
                    <td className="p-2 font-medium">{RES_LABEL[res][lang === "bn" ? 0 : 1]}</td>
                    {ACTIONS.map(act => { const cap = `${res}.${act}`; return <td key={act} className="p-2 text-center"><Checkbox className="mx-auto" checked={permSel.includes(cap)} onCheckedChange={() => togglePerm(cap)} aria-label={cap} /></td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">{lang === "bn" ? "অন্যান্য" : "Areas"}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {ASSIGNABLE_AREAS.map(area => <label key={area} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={permSel.includes(area)} onCheckedChange={() => togglePerm(area)} />{AREA_LABEL[area][lang === "bn" ? 0 : 1]}</label>)}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPermTarget(null)}>{t.cancel}</Button><Button onClick={savePerm} disabled={saving}>{t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDel && <ConfirmDialog lang={lang} name={(lang === "bn" ? confirmDel.name : confirmDel.nameEn) || ""} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); run(() => deleteAccount(id), lang === "bn" ? "মুছা হয়েছে!" : "Deleted!"); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

import { useState } from "react";
import { MoreHorizontal, Shield, ShieldOff, KeyRound, LogIn, LogOut, Trash2, Clock, UsersRound, Inbox, Search } from "lucide-react";
import { errMsg, cn } from "../lib";
import { StatCard, Tabs, ErrorNote, ConfirmDialog, PasswordInput, EmptyState, Page } from "../components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDbAccounts, setAdmin, grantLogin, revokeLogin, resetPassword, deleteAccount, type Account } from "../api/accounts";
import type { Dict, Lang, SessionUser } from "../types";

interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; }

const roleBadgeClass = (role: string) =>
  role === "admin" ? "bg-primary/15 text-primary"
    : role === "teacher" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
      : role === "student" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
        : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";

export function AccountsPage({ t, lang, currentUser, showNotif }: Props) {
  const { accounts, loading, error, reload } = useDbAccounts(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [pwTarget, setPwTarget] = useState<Account | null>(null);
  const [grantTarget, setGrantTarget] = useState<Account | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [confirmDel, setConfirmDel] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);

  const roleLabel = (r: string) => r === "admin" ? t.admin : r === "teacher" ? t.teacher : r === "student" ? t.student : t.parent;

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
                      <TableCell><Badge className={cn("border-transparent font-semibold", roleBadgeClass(a.role))}>{roleLabel(a.role)}</Badge></TableCell>
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
                            {canToggleAdmin && <DropdownMenuItem onClick={() => run(() => setAdmin(a.id, !a.isAdmin), a.isAdmin ? (lang === "bn" ? "অ্যাডমিন সরানো হয়েছে" : "Admin removed") : (lang === "bn" ? "অ্যাডমিন করা হয়েছে" : "Made admin"))}>{a.isAdmin ? <><ShieldOff className="h-4 w-4" />{t.removeAdmin}</> : <><Shield className="h-4 w-4" />{t.makeAdmin}</>}</DropdownMenuItem>}
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

      {confirmDel && <ConfirmDialog lang={lang} name={(lang === "bn" ? confirmDel.name : confirmDel.nameEn) || ""} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); run(() => deleteAccount(id), lang === "bn" ? "মুছা হয়েছে!" : "Deleted!"); }} onCancel={() => setConfirmDel(null)} />}
    </Page>
  );
}

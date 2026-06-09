import { useState } from "react";
import { supabase } from "../supabase";
import { systemIdToEmail } from "../api/identity";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordInput, Page, PageHeader } from "../components";
import { cn } from "../lib";
import { accountRoleBadge, accountRoleLabel } from "../labels";
import type { Dict, Lang, SessionUser } from "../types";

interface Props { t: Dict; lang: Lang; currentUser: SessionUser; showNotif: (msg: string) => void; }

export function ProfilePage({ t, lang, currentUser, showNotif }: Props) {
  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setError("");
    if (form.newPass !== form.confirm) { setError(t.passwordMismatch); return; }
    if (form.newPass.length < 6) { setError(lang === "bn" ? "কমপক্ষে ৬ অক্ষর" : "Min 6 chars"); return; }
    setBusy(true);
    try {
      // Verify the current password by re-auth, then update via Supabase Auth.
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: systemIdToEmail(currentUser.systemId || ""), password: form.current });
      if (authErr) { setError(t.wrongPassword); return; }
      const { error: upErr } = await supabase.auth.updateUser({ password: form.newPass });
      if (upErr) { setError(upErr.message); return; }
      showNotif(t.passwordChanged);
      setForm({ current: "", newPass: "", confirm: "" });
    } finally { setBusy(false); }
  };
  return (
    <Page width="form">
      <PageHeader title={t.myProfile} />
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">{(currentUser.name || "A")[0]}</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-foreground">{currentUser.name}</span>
                <Badge className={cn("border-transparent text-xs font-semibold", accountRoleBadge(currentUser.role || "admin"))}>{accountRoleLabel(t, currentUser.role || "admin")}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">{currentUser.systemId || "admin"}</div>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-base font-bold text-foreground">{t.changePassword}</h3>
            <div className="max-w-sm space-y-4">
              <div className="space-y-1.5"><Label htmlFor="pf-cur">{t.currentPassword}</Label><PasswordInput id="pf-cur" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="pf-new">{t.newPassword}</Label><PasswordInput id="pf-new" value={form.newPass} onChange={(e) => setForm({ ...form, newPass: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="pf-cf">{t.confirmPassword}</Label><PasswordInput id="pf-cf" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handle} disabled={busy}>{busy ? (lang === "bn" ? "পরিবর্তন হচ্ছে…" : "Changing…") : t.changePassword}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}

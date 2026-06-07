import { useState } from "react";
import { S } from "../theme";
import { supabase } from "../supabase";
import { systemIdToEmail } from "../api/identity";
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
  return (<div style={S.page}><h2 style={S.pt}>{t.myProfile}</h2><div style={S.card}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: 16, background: "var(--muted)", borderRadius: 10 }}>
      <div style={{ ...S.ava, width: 56, height: 56, fontSize: 24 }}>{(currentUser.name || "A")[0]}</div>
      <div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)" }}>{currentUser.name}</div><div style={{ fontSize: 13, color: "var(--foreground)" }}>{currentUser.systemId || "admin"}</div></div>
    </div>
    <h3 style={S.ct}>{t.changePassword}</h3>
    <div style={{ maxWidth: 360 }}>
      <div style={S.fg}><label style={S.lbl}>{t.currentPassword}</label><input style={S.inp} type="password" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} /></div>
      <div style={S.fg}><label style={S.lbl}>{t.newPassword}</label><input style={S.inp} type="password" value={form.newPass} onChange={e => setForm({ ...form, newPass: e.target.value })} /></div>
      <div style={S.fg}><label style={S.lbl}>{t.confirmPassword}</label><input style={S.inp} type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} /></div>
      {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      <button onClick={handle} disabled={busy} style={{ ...S.saveBtn, ...(busy ? { opacity: 0.6, cursor: "wait" } : {}) }}>{busy ? (lang === "bn" ? "পরিবর্তন হচ্ছে…" : "Changing…") : t.changePassword}</button>
    </div>
  </div></div>);
}

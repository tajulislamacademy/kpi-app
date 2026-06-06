import { useState } from "react";
import { S } from "../theme";
import { supabase } from "../supabase";
import { systemIdToEmail } from "../api/identity";
import type { Dict, Lang, SessionUser } from "../types";

// Builds the in-app user from a profiles row, loading role-specific extras the
// app relies on: a teacher's class/subject/guide assignments (in the teachers
// table, not profiles) and a student's class/section/roll, a parent's child.
async function loadSessionUser(prof: any, lang: Lang): Promise<SessionUser> {
  const base: SessionUser = { id: prof.id, systemId: prof.system_id, name: lang === "bn" ? prof.name : prof.name_en, nameEn: prof.name_en, role: prof.role, isRoot: prof.is_root, backend: true };
  if (prof.role === "teacher") {
    const { data: tc } = await supabase.from("teachers").select("class_teacher,subject_assignments,guide_students").eq("id", prof.id).maybeSingle();
    if (tc) return { ...base, classTeacher: tc.class_teacher, subjectAssignments: tc.subject_assignments || [], guideStudents: tc.guide_students || [] };
  }
  if (prof.role === "student") {
    const { data: st } = await supabase.from("students").select("class,section,roll").eq("id", prof.id).maybeSingle();
    if (st) return { ...base, class: st.class, section: st.section, roll: st.roll };
  }
  if (prof.role === "parent") {
    const { data: pr } = await supabase.from("parents").select("student_id,relation,status").eq("id", prof.id).maybeSingle();
    if (pr) return { ...base, studentId: pr.student_id, relation: pr.relation, status: pr.status };
  }
  return base;
}

interface Props { t: Dict; lang: Lang; setLang: (l: Lang) => void; onLogin: (u: SessionUser) => void; }

export function AuthPage({ t, lang, setLang, onLogin }: Props) {
  const [form, setForm] = useState({ id: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const doLogin = async () => {
    setError("");
    setBusy(true);
    try {
      const email = systemIdToEmail(form.id);
      if (email && form.password) {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password: form.password });
        if (!authErr && data?.user) {
          const { data: prof } = await supabase.from("profiles").select("*").eq("auth_id", data.user.id).maybeSingle();
          if (prof) {
            const u = await loadSessionUser(prof, lang);
            if (u.role === "parent" && u.status !== "approved") {
              await supabase.auth.signOut();
              setError(u.status === "rejected" ? (lang === "bn" ? "অ্যাকাউন্ট বাতিল" : "Account rejected") : (lang === "bn" ? "অ্যাডমিনের অনুমোদন বাকি" : "Awaiting admin approval"));
              return;
            }
            onLogin(u);
            return;
          }
          // authenticated but no matching profile row — undo
          await supabase.auth.signOut();
        }
      }
      setError(lang === "bn" ? "ভুল ID বা পাসওয়ার্ড" : "Invalid ID or password");
    } finally { setBusy(false); }
  };
  return (
    <div style={S.loginBg}><div style={S.loginCard}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" }}>
        <button onClick={() => setLang("bn")} style={{ ...S.langBtn, ...(lang === "bn" ? S.langOn : {}), padding: "6px 16px" }}>বাংলা</button>
        <button onClick={() => setLang("en")} style={{ ...S.langBtn, ...(lang === "en" ? S.langOn : {}), padding: "6px 16px" }}>English</button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={S.loginLogo}>KPI</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "8px 0 4px" }}>{t.appTitle}</h1>
        <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{lang === "bn" ? "শিক্ষার্থী মূল্যায়ন ব্যবস্থাপনা" : "Student Evaluation Management"}</p>
      </div>
      <div style={S.fg}><label style={S.lbl}>{t.username}</label>
        <input style={S.inp} value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} /></div>
      <div style={S.fg}><label style={S.lbl}>{t.password}</label>
        <input style={S.inp} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={e => e.key === "Enter" && !busy && doLogin()} /></div>
      {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8, textAlign: "center" }}>{error}</div>}
      <button onClick={doLogin} disabled={busy} style={{ ...S.loginBtn, ...(busy ? { opacity: 0.6, cursor: "wait" } : {}) }}>{busy ? (lang === "bn" ? "প্রবেশ করা হচ্ছে…" : "Signing in…") : t.loginBtn}</button>
    </div></div>
  );
}

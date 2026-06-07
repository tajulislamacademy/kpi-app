import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../supabase";
import { systemIdToEmail } from "../api/identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  const [showPw, setShowPw] = useState(false);
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
          await supabase.auth.signOut();
        }
      }
      setError(lang === "bn" ? "ভুল ID বা পাসওয়ার্ড" : "Invalid ID or password");
    } finally { setBusy(false); }
  };
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-indigo-700 p-4">
      <button
        onClick={() => setLang(lang === "bn" ? "en" : "bn")}
        className="absolute right-4 top-4 rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
      >
        {lang === "bn" ? "English" : "বাংলা"}
      </button>
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-lg font-black tracking-widest text-primary-foreground">KPI</div>
            <h1 className="mt-2 text-xl font-extrabold text-foreground">{t.appTitle}</h1>
            <p className="text-xs text-muted-foreground">{lang === "bn" ? "শিক্ষার্থী মূল্যায়ন ব্যবস্থাপনা" : "Student Evaluation Management"}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kpi-uid">{t.username}</Label>
            <Input id="kpi-uid" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kpi-pw">{t.password}</Label>
            <div className="relative">
              <Input id="kpi-pw" type={showPw ? "text" : "password"} className="pr-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onKeyDown={(e) => e.key === "Enter" && !busy && doLogin()} />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <Button onClick={doLogin} disabled={busy} className="w-full">
            {busy ? (lang === "bn" ? "প্রবেশ করা হচ্ছে…" : "Signing in…") : t.loginBtn}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

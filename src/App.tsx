import { useState, useEffect, lazy, Suspense } from "react";
import { toast } from "sonner";
import { supabase } from "./supabase";
import { useDbParents } from "./api/parents";
import { useDbTermConfig, updateTermConfig } from "./api/config";
import { useLocalStorage } from "./composables";
import { T } from "./i18n";
import { LayoutDashboard, ClipboardPen, Users, GraduationCap, ListChecks, UserCog, Contact, BarChart3, ScrollText, Award, UsersRound, Settings, TrendingUp, KeyRound } from "lucide-react";
import { ErrorBoundary, Layout } from "./components";
import { can } from "./permissions";
import { AuthPage } from "./pages/Auth";
import { loadSessionUser } from "./api/session";
import { AdminTeacherDashboard, StudentDashboard, ParentDashboard } from "./pages/Dashboards"; // eager: landing page
// Lazy-load the rest so a student/parent doesn't download the admin CRUD pages,
// point-entry grid, etc. up front (each becomes its own chunk, loaded on nav).
const TeacherKPIPage = lazy(() => import("./pages/KPI").then(m => ({ default: m.TeacherKPIPage })));
const ParentKPIPage = lazy(() => import("./pages/KPI").then(m => ({ default: m.ParentKPIPage })));
const MyTeacherKPIPage = lazy(() => import("./pages/KPI").then(m => ({ default: m.MyTeacherKPIPage })));
const MyParentKPIPage = lazy(() => import("./pages/KPI").then(m => ({ default: m.MyParentKPIPage })));
const ReportsPage = lazy(() => import("./pages/Reports").then(m => ({ default: m.ReportsPage })));
const KpiDetailsPage = lazy(() => import("./pages/KpiDetails").then(m => ({ default: m.KpiDetailsPage })));
const SettingsPage = lazy(() => import("./pages/Settings").then(m => ({ default: m.SettingsPage })));
const PointEntryPage = lazy(() => import("./pages/PointEntry").then(m => ({ default: m.PointEntryPage })));
const QuestionsPage = lazy(() => import("./pages/Questions").then(m => ({ default: m.QuestionsPage })));
const StudentsPage = lazy(() => import("./pages/Students").then(m => ({ default: m.StudentsPage })));
const TeachersPage = lazy(() => import("./pages/Teachers").then(m => ({ default: m.TeachersPage })));
const ParentsPage = lazy(() => import("./pages/Parents").then(m => ({ default: m.ParentsPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then(m => ({ default: m.ProfilePage })));
const AccountsPage = lazy(() => import("./pages/Accounts").then(m => ({ default: m.AccountsPage })));
import type { Lang, SessionUser, TermConfig } from "./types";

export default function App() {
  const [lang, setLang] = useState<Lang>("bn");
  const t = T[lang];
  const [currentUser, setCurrentUser] = useLocalStorage<SessionUser | null>("kpi_currentUser", null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const { termConfig, reload: reloadTermConfig } = useDbTermConfig(true);
  const saveTermConfig = async (cfg: TermConfig) => { await updateTermConfig(cfg); await reloadTermConfig(); };
  const showNotif = (msg: string) => { if (/ত্রুটি|error|ব্যর্থ|❌|ভুল/i.test(msg)) toast.error(msg); else toast.success(msg); };
  const curYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(curYear);
  const handleLogout = async () => { try { await supabase.auth.signOut(); } catch { /* no active backend session */ } setCurrentUser(null); };
  const { parents: dbParents } = useDbParents(true);
  // Re-validate the cached (localStorage) session against the DB on mount: a
  // revoked admin, soft-deleted account, or flipped parent status must not keep
  // stale caps in the UI. Also clear on auth sign-out / token loss.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return; // no backend session: keep offline/local state as-is
      const { data: prof } = await supabase.from("profiles").select("*").eq("auth_id", sess.session.user.id).maybeSingle();
      if (!active) return;
      if (!prof) { setCurrentUser(null); return; }
      const u = await loadSessionUser(prof, lang);
      if (!active) return;
      if (u.isDeleted || (u.role === "parent" && u.status !== "approved")) {
        await supabase.auth.signOut();
        setCurrentUser(null);
        return;
      }
      setCurrentUser(u);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setCurrentUser(null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!currentUser) return <AuthPage t={t} lang={lang} setLang={setLang} onLogin={(u: SessionUser) => { setCurrentUser(u); setActiveTab("dashboard"); }} />;
  const isAdmin = currentUser.role === "admin" || !!currentUser.isAdmin, isTeacher = currentUser.role === "teacher";
  const c = (cap: string) => can(currentUser, cap);
  const pendingParents = dbParents.filter(p => p.status === "pending");
  const navItems = [
    { key: "dashboard", icon: LayoutDashboard, label: t.dashboard },
    ...((isTeacher || c("point_entry")) ? [{ key: "pointEntry", icon: ClipboardPen, label: t.pointEntry }] : []),
    ...(c("teachers.view") ? [{ key: "teachers", icon: Users, label: t.teachers }] : []),
    ...(c("students.view") ? [{ key: "students", icon: GraduationCap, label: t.students }] : []),
    ...(c("parents.view") ? [{ key: "parents", icon: Contact, label: `${lang === "bn" ? "অভিভাবক" : "Parents"}${pendingParents.length > 0 ? ` (${pendingParents.length})` : ""}` }] : []),
    ...(c("questions.view") ? [{ key: "questions", icon: ListChecks, label: t.questions }] : []),
    ...(c("accounts.manage") ? [{ key: "accounts", icon: UserCog, label: t.accounts }] : []),
    { key: "reports", icon: BarChart3, label: t.reports },
    { key: "kpiDetails", icon: ScrollText, label: lang === "bn" ? "বিস্তারিত" : "Details" },
    ...(c("teacher_kpi") ? [{ key: "teacherKpi", icon: Award, label: t.teacherKPI }] : []),
    ...(c("parent_kpi") ? [{ key: "parentKpi", icon: UsersRound, label: t.parentKPI }] : []),
    ...(c("settings.edit") ? [{ key: "settings", icon: Settings, label: t.settings }] : []),
    ...(isTeacher ? [{ key: "myTchrKpi", icon: TrendingUp, label: t.myTchrKPI }] : []),
    ...(currentUser.role === "parent" ? [{ key: "myParKpi", icon: TrendingUp, label: t.myKPI }] : []),
    { key: "profile", icon: KeyRound, label: t.myProfile },
  ];
  return (
    <Layout t={t} lang={lang} setLang={setLang} currentUser={currentUser} isAdmin={isAdmin} isTeacher={isTeacher} navItems={navItems} activeTab={activeTab} onNav={setActiveTab} onLogout={handleLogout}>
      <ErrorBoundary key={activeTab} lang={lang}>
      <Suspense fallback={<div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">{lang === "bn" ? "লোড হচ্ছে…" : "Loading…"}</div>}>
      {activeTab === "dashboard" && (isAdmin || isTeacher
        ? <AdminTeacherDashboard t={t} lang={lang} currentUser={currentUser} isAdmin={isAdmin} selectedYear={selectedYear} setSelectedYear={setSelectedYear} pendingParents={pendingParents} />
        : currentUser.role === "student"
          ? <StudentDashboard t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig} />
          : <ParentDashboard t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig} />
      )}
      {activeTab === "pointEntry" && (isTeacher || c("point_entry")) && <PointEntryPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} isAdmin={isAdmin} />}
      {activeTab === "teachers" && c("teachers.view") && <TeachersPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} />}
      {activeTab === "students" && c("students.view") && <StudentsPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} />}
      {activeTab === "parents" && c("parents.view") && <ParentsPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} />}
      {activeTab === "questions" && c("questions.view") && <QuestionsPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} />}
      {activeTab === "accounts" && c("accounts.manage") && <AccountsPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} />}
      {activeTab === "reports" && <ReportsPage t={t} lang={lang} termConfig={termConfig} currentUser={currentUser} isAdmin={isAdmin} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
      {activeTab === "kpiDetails" && <KpiDetailsPage t={t} lang={lang} currentUser={currentUser} isAdmin={isAdmin} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
      {activeTab === "settings" && c("settings.edit") && <SettingsPage t={t} lang={lang} termConfig={termConfig} onSaveTermConfig={saveTermConfig} showNotif={showNotif} />}
      {activeTab === "profile" && <ProfilePage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} />}
      {activeTab === "teacherKpi" && c("teacher_kpi") && <TeacherKPIPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
      {activeTab === "parentKpi" && c("parent_kpi") && <ParentKPIPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
      {activeTab === "myTchrKpi" && isTeacher && <MyTeacherKPIPage t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig} />}
      {activeTab === "myParKpi" && currentUser.role === "parent" && <MyParentKPIPage t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig} />}
      </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

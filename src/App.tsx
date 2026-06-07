import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "./supabase";
import { useDbParents } from "./api/parents";
import { useDbTermConfig, updateTermConfig } from "./api/config";
import { useLocalStorage } from "./composables";
import { T } from "./i18n";
import { LayoutDashboard, ClipboardPen, Users, GraduationCap, ListChecks, UserCog, BarChart3, Award, UsersRound, Settings, TrendingUp, KeyRound } from "lucide-react";
import { ErrorBoundary, Layout } from "./components";
import { AuthPage } from "./pages/Auth";
import { AdminTeacherDashboard, StudentDashboard, ParentDashboard } from "./pages/Dashboards";
import { TeacherKPIPage, ParentKPIPage, MyTeacherKPIPage, MyParentKPIPage } from "./pages/KPI";
import { ReportsPage } from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";
import { PointEntryPage } from "./pages/PointEntry";
import { QuestionsPage } from "./pages/Questions";
import { StudentsPage } from "./pages/Students";
import { TeachersPage } from "./pages/Teachers";
import { ProfilePage } from "./pages/Profile";
import { AccountsPage } from "./pages/Accounts";
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
  if (!currentUser) return <AuthPage t={t} lang={lang} setLang={setLang} onLogin={(u: SessionUser) => { setCurrentUser(u); setActiveTab("dashboard"); }} />;
  const isAdmin = currentUser.role === "admin" || !!currentUser.isAdmin, isTeacher = currentUser.role === "teacher";
  const pendingParents = dbParents.filter(p => p.status === "pending");
  const navItems = [
    { key: "dashboard", icon: LayoutDashboard, label: t.dashboard },
    ...(isAdmin || isTeacher ? [{ key: "pointEntry", icon: ClipboardPen, label: t.pointEntry }] : []),
    ...(isAdmin ? [
      { key: "teachers", icon: Users, label: t.teachers },
      { key: "students", icon: GraduationCap, label: t.students },
      { key: "questions", icon: ListChecks, label: t.questions },
      { key: "accounts", icon: UserCog, label: `${t.accounts}${pendingParents.length > 0 ? ` (${pendingParents.length})` : ""}` },
    ] : []),
    { key: "reports", icon: BarChart3, label: t.reports },
    ...(isAdmin ? [{ key: "teacherKpi", icon: Award, label: t.teacherKPI }, { key: "parentKpi", icon: UsersRound, label: t.parentKPI }, { key: "settings", icon: Settings, label: t.settings }] : []),
    ...(isTeacher ? [{ key: "myTchrKpi", icon: TrendingUp, label: t.myTchrKPI }] : []),
    ...(currentUser.role === "parent" ? [{ key: "myParKpi", icon: TrendingUp, label: t.myKPI }] : []),
    { key: "profile", icon: KeyRound, label: t.myProfile },
  ];
  return (
    <Layout t={t} lang={lang} setLang={setLang} currentUser={currentUser} isAdmin={isAdmin} isTeacher={isTeacher} navItems={navItems} activeTab={activeTab} onNav={setActiveTab} onLogout={handleLogout}>
      <ErrorBoundary key={activeTab} lang={lang}>
      {activeTab === "dashboard" && (isAdmin || isTeacher
        ? <AdminTeacherDashboard t={t} lang={lang} currentUser={currentUser} isAdmin={isAdmin} selectedYear={selectedYear} setSelectedYear={setSelectedYear} pendingParents={pendingParents} />
        : currentUser.role === "student"
          ? <StudentDashboard t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig} />
          : <ParentDashboard t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig} />
      )}
      {activeTab === "pointEntry" && (isAdmin || isTeacher) && <PointEntryPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} isAdmin={isAdmin} />}
      {activeTab === "teachers" && isAdmin && <TeachersPage t={t} lang={lang} showNotif={showNotif} />}
      {activeTab === "students" && isAdmin && <StudentsPage t={t} lang={lang} showNotif={showNotif} />}
      {activeTab === "questions" && isAdmin && <QuestionsPage t={t} lang={lang} showNotif={showNotif} />}
      {activeTab === "accounts" && isAdmin && <AccountsPage t={t} lang={lang} showNotif={showNotif} />}
      {activeTab === "reports" && <ReportsPage t={t} lang={lang} termConfig={termConfig} currentUser={currentUser} isAdmin={isAdmin} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
      {activeTab === "settings" && isAdmin && <SettingsPage t={t} lang={lang} termConfig={termConfig} onSaveTermConfig={saveTermConfig} showNotif={showNotif} />}
      {activeTab === "profile" && <ProfilePage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} />}
      {activeTab === "teacherKpi" && isAdmin && <TeacherKPIPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
      {activeTab === "parentKpi" && isAdmin && <ParentKPIPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
      {activeTab === "myTchrKpi" && isTeacher && <MyTeacherKPIPage t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig} />}
      {activeTab === "myParKpi" && currentUser.role === "parent" && <MyParentKPIPage t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig} />}
      </ErrorBoundary>
    </Layout>
  );
}

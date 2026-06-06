import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useDbStudents, createStudent, updateStudent, deleteStudent } from "./api/students";
import { useDbTeachers, createTeacher, updateTeacher, deleteTeacher } from "./api/teachers";
import { useDbQuestions, createQuestion, updateQuestion, deleteQuestion } from "./api/questions";
import { useDbStudentEntries, insertEntries, updateEntryScore, studentKpiHelpers, useDbEntriesByTarget, targetKpiHelpers } from "./api/entries";
import { useDbParents, createParent, updateParent, setParentStatus, deleteParent } from "./api/parents";
import { useDbTermConfig, updateTermConfig } from "./api/config";
import { seedDemoData } from "./api/seed";
import { systemIdToEmail } from "./api/identity";
import { MONTHS, CLASSES, SECTIONS, SUBJECTS } from "./constants";
import { genId, getWeekNumber, freqDone } from "./lib";
import { useLocalStorage, useIsMobile } from "./hooks";
import { T } from "./i18n";
import { S } from "./theme";
import { YearSelector, StatCard, RankCard, BarChart, ConfirmDialog } from "./components";
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

// Builds the in-app user from a profiles row, loading role-specific extras the
// app relies on: a teacher's class/subject/guide assignments (in the teachers
// table, not profiles) and a student's class/section/roll.
async function loadSessionUser(prof, lang){
  const base={id:prof.id,systemId:prof.system_id,name:lang==="bn"?prof.name:prof.name_en,nameEn:prof.name_en,role:prof.role,isRoot:prof.is_root,backend:true};
  if(prof.role==="teacher"){
    const {data:tc}=await supabase.from("teachers").select("class_teacher,subject_assignments,guide_students").eq("id",prof.id).maybeSingle();
    if(tc)return{...base,classTeacher:tc.class_teacher,subjectAssignments:tc.subject_assignments||[],guideStudents:tc.guide_students||[]};
  }
  if(prof.role==="student"){
    const {data:st}=await supabase.from("students").select("class,section,roll").eq("id",prof.id).maybeSingle();
    if(st)return{...base,class:st.class,section:st.section,roll:st.roll};
  }
  if(prof.role==="parent"){
    const {data:pr}=await supabase.from("parents").select("student_id,relation,status").eq("id",prof.id).maybeSingle();
    if(pr)return{...base,studentId:pr.student_id,relation:pr.relation,status:pr.status};
  }
  return base;
}




// Demo seed data removed — all data lives in Supabase now (seed via the DEV
// "Seed demo data" button in Settings, or supabase/seed.sql).
export default function App() {
  const [lang,setLang]=useState("bn");
  const t=T[lang];
  const [currentUser,setCurrentUser]=useLocalStorage("kpi_currentUser",null);
  const [activeTab,setActiveTab]=useState("dashboard");
  const {termConfig,reload:reloadTermConfig}=useDbTermConfig(true);
  const saveTermConfig=async(cfg)=>{await updateTermConfig(cfg);await reloadTermConfig();};
  const [notif,setNotif]=useState("");
  const showNotif=(msg)=>{setNotif(msg);setTimeout(()=>setNotif(""),3500);};
  const curYear=new Date().getFullYear();
  const [selectedYear,setSelectedYear]=useState(curYear);
  const isMobile=useIsMobile();
  const [navOpen,setNavOpen]=useState(false);
  const goTab=k=>{setActiveTab(k);setNavOpen(false);};
  const handleLogout=async()=>{try{await supabase.auth.signOut();}catch{/* no active backend session */}setCurrentUser(null);};
  const {parents:dbParents}=useDbParents(true);
  if(!currentUser)return <AuthPage t={t} lang={lang} setLang={setLang} onLogin={(u)=>{setCurrentUser(u);setActiveTab("dashboard");}}/>;
  const isAdmin=currentUser.role==="admin",isTeacher=currentUser.role==="teacher";
  const pendingParents=dbParents.filter(p=>p.status==="pending");
  const navItems=[
    {key:"dashboard",icon:"⬛",label:t.dashboard},
    ...(isAdmin||isTeacher?[{key:"pointEntry",icon:"✏️",label:t.pointEntry}]:[]),
    ...(isAdmin?[
      {key:"teachers",icon:"👨‍🏫",label:t.teachers},
      {key:"students",icon:"🎓",label:t.students},
      {key:"questions",icon:"📋",label:t.questions},
      {key:"accounts",icon:"👤",label:`${t.accounts}${pendingParents.length>0?` (${pendingParents.length})`:""}`},
    ]:[]),
    {key:"reports",icon:"📊",label:t.reports},
    ...(isAdmin?[{key:"teacherKpi",icon:"📊",label:t.teacherKPI},{key:"parentKpi",icon:"👥",label:t.parentKPI},{key:"settings",icon:"⚙️",label:t.settings}]:[]),
    ...(isTeacher?[{key:"myTchrKpi",icon:"📈",label:t.myTchrKPI}]:[]),
    ...(currentUser.role==="parent"?[{key:"myParKpi",icon:"📈",label:t.myKPI}]:[]),
    {key:"profile",icon:"🔑",label:t.myProfile},
  ];
  return (
    <div style={S.app}>
      {notif&&<div style={{...S.notif,background:"#10b981",...(isMobile?{top:64,right:12,left:12,width:"auto"}:{})}}>{notif}</div>}
      {isMobile&&<header style={{position:"fixed",top:0,left:0,right:0,height:56,background:"#0f172a",display:"flex",alignItems:"center",gap:8,padding:"0 12px",zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
        <button onClick={()=>setNavOpen(true)} style={{background:"none",border:"none",color:"#fff",fontSize:24,cursor:"pointer",padding:"2px 6px",lineHeight:1,flexShrink:0}}>☰</button>
        <div style={S.logoBox}>KPI</div>
        <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.appTitle}</span>
        <div style={{display:"flex",gap:4,flexShrink:0}}>
          <button onClick={()=>setLang("bn")} style={{...S.langBtn,...(lang==="bn"?S.langOn:{}),padding:"3px 7px",fontSize:11}}>বাং</button>
          <button onClick={()=>setLang("en")} style={{...S.langBtn,...(lang==="en"?S.langOn:{}),padding:"3px 7px",fontSize:11}}>EN</button>
        </div>
      </header>}
      {isMobile&&navOpen&&<div onClick={()=>setNavOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200}}/>}
      <aside style={isMobile?{...S.sidebar,position:"fixed",top:0,bottom:0,left:navOpen?0:-260,width:250,zIndex:300,transition:"left .25s ease",height:"100%",overflowY:"auto"}:S.sidebar}>
        <div style={S.sidebarTop}><div style={S.logoBox}>KPI</div><div style={S.logoText}>{t.appTitle}</div></div>
        <div style={S.langRow}>
          <button onClick={()=>setLang("bn")} style={{...S.langBtn,...(lang==="bn"?S.langOn:{})}}>বাং</button>
          <button onClick={()=>setLang("en")} style={{...S.langBtn,...(lang==="en"?S.langOn:{})}}>EN</button>
        </div>
        <nav style={S.nav}>{navItems.map(item=>(<button key={item.key} onClick={()=>goTab(item.key)} style={{...S.navBtn,...(activeTab===item.key?S.navBtnOn:{})}}><span>{item.icon}</span><span>{item.label}</span></button>))}</nav>
        <div style={S.sidebarFoot}>
          <div style={S.userRow}>
            <div style={S.ava}>{(currentUser.name||"A")[0]}</div>
            <div><div style={S.uName}>{currentUser.name}</div>
              <div style={S.uRole}>{isAdmin?t.admin:isTeacher?t.teacher:currentUser.role==="student"?t.student:t.parent}</div>
              {currentUser.systemId&&<div style={{fontSize:10,color:"#94a3b8"}}>{currentUser.systemId}</div>}
            </div>
          </div>
          <button onClick={handleLogout} style={S.logoutBtn}>{t.logout}</button>
        </div>
      </aside>
      <main style={{...S.main,...(isMobile?{marginTop:56}:{})}}>
        {activeTab==="dashboard"&&(isAdmin||isTeacher
          ?<AdminTeacherDashboard t={t} lang={lang} currentUser={currentUser} isAdmin={isAdmin} selectedYear={selectedYear} setSelectedYear={setSelectedYear} pendingParents={pendingParents}/>
          :currentUser.role==="student"
            ?<StudentDashboard t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig}/>
            :<ParentDashboard t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig}/>
        )}
        {activeTab==="pointEntry"&&(isAdmin||isTeacher)&&<PointEntryPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} isAdmin={isAdmin}/>}
        {activeTab==="teachers"&&isAdmin&&<TeachersPage t={t} lang={lang} showNotif={showNotif}/>}
        {activeTab==="students"&&isAdmin&&<StudentsPage t={t} lang={lang} showNotif={showNotif}/>}
        {activeTab==="questions"&&isAdmin&&<QuestionsPage t={t} lang={lang} showNotif={showNotif}/>}
        {activeTab==="accounts"&&isAdmin&&<AccountsPage t={t} lang={lang} showNotif={showNotif}/>}
        {activeTab==="reports"&&<ReportsPage t={t} lang={lang} termConfig={termConfig} currentUser={currentUser} isAdmin={isAdmin} selectedYear={selectedYear} setSelectedYear={setSelectedYear}/>}
        {activeTab==="settings"&&isAdmin&&<SettingsPage t={t} lang={lang} termConfig={termConfig} onSaveTermConfig={saveTermConfig} showNotif={showNotif}/>}
        {activeTab==="profile"&&<ProfilePage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif}/>}
        {activeTab==="teacherKpi"&&isAdmin&&<TeacherKPIPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} selectedYear={selectedYear} setSelectedYear={setSelectedYear}/>}
        {activeTab==="parentKpi"&&isAdmin&&<ParentKPIPage t={t} lang={lang} currentUser={currentUser} showNotif={showNotif} selectedYear={selectedYear} setSelectedYear={setSelectedYear}/>}
        {activeTab==="myTchrKpi"&&isTeacher&&<MyTeacherKPIPage t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig}/>}
        {activeTab==="myParKpi"&&currentUser.role==="parent"&&<MyParentKPIPage t={t} lang={lang} currentUser={currentUser} selectedYear={selectedYear} setSelectedYear={setSelectedYear} termConfig={termConfig}/>}
      </main>
      <style>{`*{box-sizing:border-box}body{overflow-x:hidden}@media(max-width:767px){table{font-size:12px!important}th,td{padding:6px 8px!important}}`}</style>
    </div>
  );
}
function AuthPage({t,lang,setLang,onLogin}){
  const [form,setForm]=useState({id:"",password:""});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const doLogin=async()=>{
    setError("");
    setBusy(true);
    try{
      // 1) Supabase Auth — real backend accounts (admin migrated so far)
      const email=systemIdToEmail(form.id);
      if(email&&form.password){
        const {data,error:authErr}=await supabase.auth.signInWithPassword({email,password:form.password});
        if(!authErr&&data?.user){
          const {data:prof}=await supabase.from("profiles").select("*").eq("auth_id",data.user.id).maybeSingle();
          if(prof){
            const u=await loadSessionUser(prof,lang);
            if(u.role==="parent"&&u.status!=="approved"){
              await supabase.auth.signOut();
              setError(u.status==="rejected"?(lang==="bn"?"অ্যাকাউন্ট বাতিল":"Account rejected"):(lang==="bn"?"অ্যাডমিনের অনুমোদন বাকি":"Awaiting admin approval"));
              return;
            }
            onLogin(u);
            return;
          }
          // authenticated but no matching profile row — undo
          await supabase.auth.signOut();
        }
      }
      setError(lang==="bn"?"ভুল ID বা পাসওয়ার্ড":"Invalid ID or password");
    }finally{setBusy(false);}
  };
  return(
    <div style={S.loginBg}><div style={S.loginCard}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={S.loginLogo}>KPI</div>
        <h1 style={{fontSize:20,fontWeight:800,color:"#0f172a",margin:"8px 0 4px"}}>{t.appTitle}</h1>
        <p style={{fontSize:12,color:"#64748b",margin:0}}>{lang==="bn"?"শিক্ষার্থী মূল্যায়ন ব্যবস্থাপনা":"Student Evaluation Management"}</p>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20,justifyContent:"center"}}>
        <button onClick={()=>setLang("bn")} style={{...S.langBtn,...(lang==="bn"?S.langOn:{}),padding:"6px 16px"}}>বাংলা</button>
        <button onClick={()=>setLang("en")} style={{...S.langBtn,...(lang==="en"?S.langOn:{}),padding:"6px 16px"}}>English</button>
      </div>
      <div style={S.fg}><label style={S.lbl}>{t.username}</label>
        <input style={S.inp} value={form.id} onChange={e=>setForm({...form,id:e.target.value})} placeholder="admin | TCH-20260001 | STD-20260001"/></div>
      <div style={S.fg}><label style={S.lbl}>{t.password}</label>
        <input style={S.inp} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&!busy&&doLogin()}/></div>
      {error&&<div style={{color:"#ef4444",fontSize:13,marginBottom:8,textAlign:"center"}}>{error}</div>}
      <button onClick={doLogin} disabled={busy} style={{...S.loginBtn,...(busy?{opacity:0.6,cursor:"wait"}:{})}}>{busy?(lang==="bn"?"প্রবেশ করা হচ্ছে…":"Signing in…"):t.loginBtn}</button>
    </div></div>
  );
}


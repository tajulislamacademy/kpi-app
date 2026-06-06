import { useState } from "react";
import { supabase } from "./supabase";
import { useDbParents } from "./api/parents";
import { useDbTermConfig, updateTermConfig } from "./api/config";
import { useLocalStorage, useIsMobile } from "./hooks";
import { T } from "./i18n";
import { S } from "./theme";
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

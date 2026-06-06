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
function AccountsPage({t,lang,showNotif}){
  // Parent accounts on Supabase. (Admin-management/promote was a localStorage
  // relic showing plaintext passwords — removed; a proper admin slice comes later.)
  const {parents,reload}=useDbParents(true);
  const {students:dbStudents}=useDbStudents(true);
  const [tab,setTab]=useState("pending");
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({studentId:"",name:"",nameEn:"",relation:"father",password:"123456"});
  const [formErr,setFormErr]=useState("");
  const [saving,setSaving]=useState(false);
  const [editParent,setEditParent]=useState(null);
  const [parentForm,setParentForm]=useState({name:"",nameEn:"",password:"",relation:"father",status:"approved"});
  const [confirmParentDel,setConfirmParentDel]=useState(null);
  const nextSystemId=()=>{const yr=new Date().getFullYear();const max=parents.reduce((m,p)=>{const n=parseInt(String(p.systemId||"").split("-")[1]?.slice(4))||0;return Math.max(m,n);},0);return genId("PAR",yr,max+1);};
  const openEditParent=p=>{setEditParent(p);setParentForm({name:p.name,nameEn:p.nameEn||"",password:"",relation:p.relation,status:p.status,_authId:p.authId,_systemId:p.systemId});};
  const handleSaveParent=async()=>{
    if(parentForm.password&&parentForm.password.length<6){showNotif(lang==="bn"?"পাসওয়ার্ড কমপক্ষে ৬ অক্ষর":"Password min 6");return;}
    setSaving(true);
    try{
      await updateParent(editParent.id,{name:parentForm.name,nameEn:parentForm.nameEn,relation:parentForm.relation,status:parentForm.status,password:parentForm.password||null,authId:parentForm._authId,systemId:parentForm._systemId});
      await reload();setEditParent(null);showNotif(lang==="bn"?"আপডেট হয়েছে!":"Updated!");
    }catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
    finally{setSaving(false);}
  };
  const handleAddParent=async()=>{
    setFormErr("");
    const st=dbStudents.find(s=>s.systemId===form.studentId);
    if(!st){setFormErr(t.invalidStudentId);return;}
    if(!form.name){setFormErr(lang==="bn"?"নাম আবশ্যক":"Name required");return;}
    if(form.password&&form.password.length<6){setFormErr(lang==="bn"?"পাসওয়ার্ড কমপক্ষে ৬ অক্ষর":"Password min 6");return;}
    const ex=parents.filter(p=>p.studentId===st.id);
    if(ex.length>=2){setFormErr(t.maxParents);return;}
    if(ex.find(p=>p.relation===form.relation)){setFormErr(lang==="bn"?"ইতিমধ্যে আছে":"Already exists");return;}
    setSaving(true);
    try{
      const systemId=nextSystemId();
      await createParent({systemId,name:form.name,nameEn:form.nameEn,password:form.password,studentId:st.id,relation:form.relation,status:"approved"});
      await reload();setShowForm(false);
      setForm({studentId:"",name:"",nameEn:"",relation:"father",password:"123456"});
      showNotif(lang==="bn"?`অভিভাবক যোগ! ID: ${systemId}`:`Parent added! ID: ${systemId}`);
    }catch(e){setFormErr((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
    finally{setSaving(false);}
  };
  const approve=async(id)=>{try{await setParentStatus(id,"approved");await reload();showNotif(lang==="bn"?"অনুমোদন হয়েছে!":"Approved!");}catch(e){showNotif(e.message||e);}};
  const reject=async(id)=>{try{await setParentStatus(id,"rejected");await reload();showNotif(lang==="bn"?"বাতিল হয়েছে!":"Rejected!");}catch(e){showNotif(e.message||e);}};
  const doDelete=async(id)=>{try{await deleteParent(id);await reload();showNotif(lang==="bn"?"মুছা হয়েছে!":"Deleted!");}catch(e){showNotif(e.message||e);}};
  const pending=parents.filter(p=>p.status==="pending"),approved=parents.filter(p=>p.status==="approved"),rejected=parents.filter(p=>p.status==="rejected");
  const current=tab==="pending"?pending:tab==="approved"?approved:rejected;
  const relLabel=r=>r==="father"?t.father:r==="mother"?t.mother:t.guardian;
  const sColor=s=>s==="approved"?"#f0fdf4":s==="rejected"?"#fee2e2":"#fef3c7";
  const sText=s=>s==="approved"?"#166534":s==="rejected"?"#991b1b":"#92400e";
  return(<div style={S.page}>
    {editParent&&(<div style={S.modalBg}><div style={S.modalBox}><h3 style={S.ct}>{lang==="bn"?"অভিভাবক সম্পাদনা":"Edit Parent"}</h3><div style={S.grid2}><div style={S.fg}><label style={S.lbl}>{t.parentName} (বাংলা)</label><input style={S.inp} value={parentForm.name} onChange={e=>setParentForm({...parentForm,name:e.target.value})}/></div><div style={S.fg}><label style={S.lbl}>{t.parentName} (English)</label><input style={S.inp} value={parentForm.nameEn} onChange={e=>setParentForm({...parentForm,nameEn:e.target.value})}/></div><div style={S.fg}><label style={S.lbl}>{t.defaultPass}</label><input style={S.inp} value={parentForm.password} onChange={e=>setParentForm({...parentForm,password:e.target.value})}/></div><div style={S.fg}><label style={S.lbl}>{t.relation}</label><select style={S.inp} value={parentForm.relation} onChange={e=>setParentForm({...parentForm,relation:e.target.value})}><option value="father">{t.father}</option><option value="mother">{t.mother}</option><option value="guardian">{t.guardian}</option></select></div><div style={S.fg}><label style={S.lbl}>{lang==="bn"?"অবস্থা":"Status"}</label><select style={S.inp} value={parentForm.status} onChange={e=>setParentForm({...parentForm,status:e.target.value})}><option value="approved">{t.approved}</option><option value="pending">{t.pending}</option><option value="rejected">{t.rejected}</option></select></div></div><div style={{display:"flex",gap:8,marginTop:12}}><button onClick={handleSaveParent} style={S.saveBtn}>{t.save}</button><button onClick={()=>setEditParent(null)} style={S.cancelBtn}>{t.cancel}</button></div></div></div>)}
    {confirmParentDel&&<ConfirmDialog lang={lang} name={confirmParentDel.name} onConfirm={()=>{const id=confirmParentDel.id;setConfirmParentDel(null);doDelete(id);}} onCancel={()=>setConfirmParentDel(null)}/>}
    <div style={S.ph}>
      <div><h2 style={S.pt}>{t.accountManagement}</h2></div>
      <button onClick={()=>setShowForm(!showForm)} style={S.addBtn}>+ {lang==="bn"?"অভিভাবক যোগ":"Add Parent"}</button>
    </div>
    {showForm&&(<div style={S.card}>
      <h3 style={S.ct}>{lang==="bn"?"নতুন অভিভাবক":"New Parent"}</h3>
      <div style={S.grid2}>
        <div style={S.fg}><label style={S.lbl}>{t.studentId}</label><input style={S.inp} value={form.studentId} onChange={e=>setForm({...form,studentId:e.target.value})} placeholder="STD-20260001"/>
          {form.studentId&&(()=>{const st=dbStudents.find(s=>s.systemId===form.studentId);return st?<div style={{fontSize:12,color:"#0f172a",marginTop:4}}>✅ {lang==="bn"?st.name:st.nameEn}</div>:<div style={{fontSize:12,color:"#ef4444",marginTop:4}}>❌</div>;})()}
        </div>
        <div style={S.fg}><label style={S.lbl}>{t.relation}</label><select style={S.inp} value={form.relation} onChange={e=>setForm({...form,relation:e.target.value})}><option value="father">{t.father}</option><option value="mother">{t.mother}</option><option value="guardian">{t.guardian}</option></select></div>
        <div style={S.fg}><label style={S.lbl}>{t.parentName} (বাংলা)</label><input style={S.inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.parentName} (English)</label><input style={S.inp} value={form.nameEn} onChange={e=>setForm({...form,nameEn:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.defaultPass} (login)</label><input style={S.inp} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={lang==="bn"?"খালি = login ছাড়া":"blank = no login"}/></div>
      </div>
      {formErr&&<div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>{formErr}</div>}
      <div style={{display:"flex",gap:8}}><button onClick={handleAddParent} disabled={saving} style={{...S.saveBtn,...(saving?{opacity:0.6,cursor:"wait"}:{})}}>{t.save}</button><button onClick={()=>setShowForm(false)} style={S.cancelBtn}>{t.cancel}</button></div>
    </div>)}
    <div style={S.grid4}>
      <StatCard icon="⏳" value={pending.length} label={t.pending} color="#0f172a"/>
      <StatCard icon="✅" value={approved.length} label={t.approved} color="#0f172a"/>
      <StatCard icon="❌" value={rejected.length} label={t.rejected} color="#ef4444"/>
      <StatCard icon="👥" value={parents.length} label={lang==="bn"?"মোট অভিভাবক":"Total Parents"} color="#0f172a"/>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {[{k:"pending",l:`${t.pending}(${pending.length})`},{k:"approved",l:t.approved},{k:"rejected",l:t.rejected}].map(x=>(<button key={x.k} onClick={()=>setTab(x.k)} style={{...S.reportTab,...(tab===x.k?S.reportTabOn:{})}}>{x.l}</button>))}
    </div>
    <div style={S.card}>{current.length===0?<div style={S.empty}>{lang==="bn"?"কোনো অ্যাকাউন্ট নেই":"No accounts"}</div>:(
      <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{lang==="bn"?"অভিভাবক":"Parent"}</th><th style={S.th}>{lang==="bn"?"সম্পর্ক":"Relation"}</th><th style={S.th}>{lang==="bn"?"শিক্ষার্থী":"Student"}</th><th style={S.th}>{t.autoId}</th><th style={S.th}>{lang==="bn"?"অবস্থা":"Status"}</th><th style={S.th}>{lang==="bn"?"অ্যাকশন":"Action"}</th></tr></thead>
      <tbody>{current.map((p,i)=>{const st=dbStudents.find(s=>s.id===p.studentId);return(<tr key={p.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><strong>{lang==="bn"?p.name:p.nameEn}</strong></td><td style={S.td}>{relLabel(p.relation)}</td><td style={S.td}><div style={{fontSize:13}}>{lang==="bn"?st?.name:st?.nameEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>{st?.systemId}</div></td><td style={S.td}><code style={{background:"#f8fafc",padding:"2px 6px",borderRadius:4,fontSize:11,color:"#0f172a"}}>{p.systemId}</code></td><td style={S.td}><span style={{background:sColor(p.status),color:sText(p.status),padding:"3px 8px",borderRadius:20,fontSize:12,fontWeight:700}}>{p.status==="approved"?t.approved:p.status==="rejected"?t.rejected:t.pending}</span></td><td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{tab==="pending"&&<><button onClick={()=>approve(p.id)} style={{padding:"4px 10px",background:"#f0fdf4",color:"#166534",border:"1px solid #86efac",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>✅ {t.approve}</button><button onClick={()=>reject(p.id)} style={{padding:"4px 10px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>❌ {t.reject}</button></>}<button onClick={()=>openEditParent(p)} style={{padding:"4px 10px",background:"#f8fafc",color:"#0f172a",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>✏️</button><button onClick={()=>setConfirmParentDel({id:p.id,name:lang==="bn"?p.name:p.nameEn})} style={{padding:"4px 10px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>🗑️</button></div></td></tr>);})}</tbody></table></div>
    )}</div>
  </div>);}
function ProfilePage({t,lang,currentUser,showNotif}){
  const [form,setForm]=useState({current:"",newPass:"",confirm:""});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const handle=async()=>{
    setError("");
    if(form.newPass!==form.confirm){setError(t.passwordMismatch);return;}
    if(form.newPass.length<6){setError(lang==="bn"?"কমপক্ষে ৬ অক্ষর":"Min 6 chars");return;}
    setBusy(true);
    try{
      // Verify the current password by re-auth, then update via Supabase Auth.
      const {error:authErr}=await supabase.auth.signInWithPassword({email:systemIdToEmail(currentUser.systemId),password:form.current});
      if(authErr){setError(t.wrongPassword);return;}
      const {error:upErr}=await supabase.auth.updateUser({password:form.newPass});
      if(upErr){setError(upErr.message);return;}
      showNotif(t.passwordChanged);
      setForm({current:"",newPass:"",confirm:""});
    }finally{setBusy(false);}
  };
  return(<div style={S.page}><h2 style={S.pt}>{t.myProfile}</h2><div style={S.card}>
    <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,padding:16,background:"#f8fafc",borderRadius:10}}>
      <div style={{...S.ava,width:56,height:56,fontSize:24}}>{(currentUser.name||"A")[0]}</div>
      <div><div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>{currentUser.name}</div><div style={{fontSize:13,color:"#0f172a"}}>{currentUser.systemId||"admin"}</div></div>
    </div>
    <h3 style={S.ct}>{t.changePassword}</h3>
    <div style={{maxWidth:360}}>
      <div style={S.fg}><label style={S.lbl}>{t.currentPassword}</label><input style={S.inp} type="password" value={form.current} onChange={e=>setForm({...form,current:e.target.value})}/></div>
      <div style={S.fg}><label style={S.lbl}>{t.newPassword}</label><input style={S.inp} type="password" value={form.newPass} onChange={e=>setForm({...form,newPass:e.target.value})}/></div>
      <div style={S.fg}><label style={S.lbl}>{t.confirmPassword}</label><input style={S.inp} type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/></div>
      {error&&<div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>{error}</div>}
      <button onClick={handle} disabled={busy} style={{...S.saveBtn,...(busy?{opacity:0.6,cursor:"wait"}:{})}}>{busy?(lang==="bn"?"পরিবর্তন হচ্ছে…":"Changing…"):t.changePassword}</button>
    </div>
  </div></div>);}
function TeachersPage({t,lang,showNotif}){
  // Self-contained Supabase data; guide-student picker reads DB students for uuids.
  const {teachers,loading,error,reload}=useDbTeachers(true);
  const {students:dbStudents}=useDbStudents(true);
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const blank={name:"",nameEn:"",password:"123456",classTeacher:null,subjectAssignments:[],guideStudents:[]};
  const [form,setForm]=useState(blank);
  const [newAssign,setNewAssign]=useState({class:"8",section:"A",subject:SUBJECTS[0]});
  const [hasClass,setHasClass]=useState(false);
  const [confirmDel,setConfirmDel]=useState(null);
  const [saving,setSaving]=useState(false);
  const addAssign=()=>{if(form.subjectAssignments.find(a=>a.class===newAssign.class&&a.section===newAssign.section&&a.subject===newAssign.subject))return;setForm({...form,subjectAssignments:[...form.subjectAssignments,{...newAssign}]});};
  const removeAssign=i=>setForm({...form,subjectAssignments:form.subjectAssignments.filter((_,idx)=>idx!==i)});
  const toggleGuide=sid=>{const gs=form.guideStudents.includes(sid)?form.guideStudents.filter(x=>x!==sid):[...form.guideStudents,sid];setForm({...form,guideStudents:gs});};
  const openAdd=()=>{setEditId(null);setForm(blank);setHasClass(false);setShowForm(true);};
  const openEdit=tc=>{setEditId(tc.id);setForm({name:tc.name,nameEn:tc.nameEn||"",password:"",classTeacher:tc.classTeacher||null,subjectAssignments:tc.subjectAssignments||[],guideStudents:tc.guideStudents||[],_authId:tc.authId,_systemId:tc.systemId});setHasClass(!!tc.classTeacher);setShowForm(true);};
  const nextSystemId=()=>{
    const yr=new Date().getFullYear();
    const max=teachers.reduce((m,tc)=>{const n=parseInt(String(tc.systemId||"").split("-")[1]?.slice(4))||0;return Math.max(m,n);},0);
    return genId("TCH",yr,max+1);
  };
  const handleSave=async()=>{
    if(!form.name){showNotif(lang==="bn"?"নাম আবশ্যক":"Name required");return;}
    if(form.password&&form.password.length<6){showNotif(lang==="bn"?"পাসওয়ার্ড কমপক্ষে ৬ অক্ষর":"Password must be at least 6 characters");return;}
    setSaving(true);
    try{
      const classTeacher=hasClass?(form.classTeacher||{class:"8",section:"A"}):null;
      if(editId){
        await updateTeacher(editId,{name:form.name,nameEn:form.nameEn,classTeacher,subjectAssignments:form.subjectAssignments,guideStudents:form.guideStudents,password:form.password||null,authId:form._authId,systemId:form._systemId});
        showNotif(lang==="bn"?"আপডেট হয়েছে!":"Updated!");
      }else{
        const systemId=nextSystemId();
        await createTeacher({systemId,name:form.name,nameEn:form.nameEn,password:form.password,classTeacher,subjectAssignments:form.subjectAssignments,guideStudents:form.guideStudents});
        showNotif(lang==="bn"?`শিক্ষক যোগ! ID: ${systemId}`:`Teacher added! ID: ${systemId}`);
      }
      await reload();
      setShowForm(false);setEditId(null);setHasClass(false);setForm(blank);
    }catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
    finally{setSaving(false);}
  };
  const doDelete=async(id)=>{
    try{await deleteTeacher(id);await reload();showNotif(lang==="bn"?"মুছা হয়েছে!":"Deleted!");}
    catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
  };
  const aBtn=(bg,cl,bc)=>({padding:"4px 10px",background:bg,color:cl,border:`1px solid ${bc}`,borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600});
  return(<div style={S.page}>
    {confirmDel&&<ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={()=>{const id=confirmDel.id;setConfirmDel(null);doDelete(id);}} onCancel={()=>setConfirmDel(null)}/>}
    <div style={S.ph}><div><h2 style={S.pt}>{t.teachers}</h2><p style={S.ps}>{lang==="bn"?`মোট ${teachers.length} জন`:`Total ${teachers.length}`}{loading?" · …":""}</p></div><button onClick={openAdd} style={S.addBtn}>+ {t.addTeacher}</button></div>
    {error&&<div style={{background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>{(lang==="bn"?"ডেটা লোড ব্যর্থ: ":"Load failed: ")+error}</div>}
    {showForm&&(<div style={S.card}>
      <h3 style={S.ct}>{editId?(lang==="bn"?"শিক্ষক সম্পাদনা":"Edit Teacher"):(lang==="bn"?"নতুন শিক্ষক":"New Teacher")}</h3>
      <div style={S.grid2}>
        <div style={S.fg}><label style={S.lbl}>{t.name} (বাংলা)</label><input style={S.inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.name} (English)</label><input style={S.inp} value={form.nameEn} onChange={e=>setForm({...form,nameEn:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{editId?(lang==="bn"?"পাসওয়ার্ড":"Password"):(t.defaultPass+" (login)")}</label><input style={S.inp} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={editId?(form._authId?(lang==="bn"?"খালি = অপরিবর্তিত":"blank = unchanged"):(lang==="bn"?"login দিতে পাসওয়ার্ড দিন":"set to give a login")):(lang==="bn"?"খালি = login ছাড়া":"blank = no login")}/></div>
      </div>
      <div style={S.sectionBox}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><input type="checkbox" checked={hasClass} onChange={e=>setHasClass(e.target.checked)} id="hc"/><label htmlFor="hc" style={{fontWeight:700,color:"#0f172a",fontSize:14}}>{t.classTeacher}?</label></div>
        {hasClass&&<div style={{display:"flex",gap:8}}><select style={{...S.inp,width:100}} value={form.classTeacher?.class||"8"} onChange={e=>setForm({...form,classTeacher:{...form.classTeacher,class:e.target.value}})}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select><select style={{...S.inp,width:80}} value={form.classTeacher?.section||"A"} onChange={e=>setForm({...form,classTeacher:{...form.classTeacher,section:e.target.value}})}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select></div>}
      </div>
      <div style={S.sectionBox}>
        <div style={{fontWeight:700,color:"#0f172a",fontSize:14,marginBottom:10}}>{t.subjectAssignments}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <select style={{...S.inp,width:80}} value={newAssign.class} onChange={e=>setNewAssign({...newAssign,class:e.target.value})}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select>
          <select style={{...S.inp,width:70}} value={newAssign.section} onChange={e=>setNewAssign({...newAssign,section:e.target.value})}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select>
          <select style={{...S.inp,flex:1,minWidth:140}} value={newAssign.subject} onChange={e=>setNewAssign({...newAssign,subject:e.target.value})}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select>
          <button onClick={addAssign} style={{...S.saveBtn,padding:"8px 14px"}}>+</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{form.subjectAssignments.map((a,i)=>(<span key={i} style={S.assignTag}>{t.class}{a.class}{a.section}—{a.subject.split("/")[1]||a.subject}<button onClick={()=>removeAssign(i)} style={S.tagX}>×</button></span>))}</div>
      </div>
      <div style={S.sectionBox}>
        <div style={{fontWeight:700,color:"#0f172a",fontSize:14,marginBottom:10}}>{t.guideStudents}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{dbStudents.map(s=>(<label key={s.id} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={form.guideStudents.includes(s.id)} onChange={()=>toggleGuide(s.id)}/>{lang==="bn"?s.name:s.nameEn}({t.class}{s.class}{s.section})</label>))}</div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:12}}><button onClick={handleSave} disabled={saving} style={{...S.saveBtn,...(saving?{opacity:0.6,cursor:"wait"}:{})}}>{saving?(lang==="bn"?"সংরক্ষণ…":"Saving…"):t.save}</button><button onClick={()=>{setShowForm(false);setEditId(null);}} style={S.cancelBtn}>{t.cancel}</button></div>
    </div>)}
    <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{t.autoId}</th><th style={S.th}>{t.name}</th><th style={S.th}>{t.classTeacher}</th><th style={S.th}>{t.subjectAssignments}</th><th style={S.th}>{t.guideStudents}</th><th style={S.th}>{lang==="bn"?"অ্যাকশন":"Action"}</th></tr></thead>
    <tbody>{teachers.map((tc,i)=>(<tr key={tc.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><code style={{background:"#f8fafc",padding:"2px 6px",borderRadius:4,fontSize:11,color:"#0f172a"}}>{tc.systemId}</code></td><td style={S.td}><strong>{lang==="bn"?tc.name:tc.nameEn}</strong></td><td style={S.td}>{tc.classTeacher?`${t.class} ${tc.classTeacher.class}${tc.classTeacher.section}`:"—"}</td><td style={S.td}><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(tc.subjectAssignments||[]).map((a,j)=>(<span key={j} style={{...S.assignTag,fontSize:11}}>{t.class}{a.class}{a.section}/{a.subject.split("/")[1]||a.subject}</span>))}</div></td><td style={S.td}>{(tc.guideStudents||[]).length}{lang==="bn"?"জন":"sts"}</td><td style={S.td}><div style={{display:"flex",gap:6}}><button onClick={()=>openEdit(tc)} style={aBtn("#f8fafc","#0f172a","#e2e8f0")}>✏️ {t.edit}</button><button onClick={()=>setConfirmDel({id:tc.id,name:lang==="bn"?tc.name:tc.nameEn})} style={aBtn("#fee2e2","#991b1b","#fca5a5")}>🗑️ {t.deleteAdmin}</button></div></td></tr>))}</tbody></table></div>
  </div>);}

function StudentsPage({t,lang,showNotif}){
  // Self-contained Supabase data (admin session required by RLS).
  const {students,loading,error,reload}=useDbStudents(true);
  const {teachers}=useDbTeachers(true);
  const {parents}=useDbParents(true);
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const blank={name:"",nameEn:"",class:"8",section:"",roll:"",password:"123456"};
  const [form,setForm]=useState(blank);
  const [confirmDel,setConfirmDel]=useState(null);
  const [saving,setSaving]=useState(false);
  const openAdd=()=>{setEditId(null);setForm(blank);setShowForm(true);};
  const openEdit=s=>{setEditId(s.id);setForm({name:s.name,nameEn:s.nameEn||"",class:s.class,section:s.section||"",roll:s.roll||"",password:"",_authId:s.authId,_systemId:s.systemId});setShowForm(true);};
  // Next STD id from the MAX existing suffix (not array length) — survives deletes.
  const nextSystemId=()=>{
    const yr=new Date().getFullYear();
    const max=students.reduce((m,s)=>{const n=parseInt(String(s.systemId||"").split("-")[1]?.slice(4))||0;return Math.max(m,n);},0);
    return genId("STD",yr,max+1);
  };
  const handleSave=async()=>{
    if(!form.name){showNotif(lang==="bn"?"নাম আবশ্যক":"Name required");return;}
    if(form.password&&form.password.length<6){showNotif(lang==="bn"?"পাসওয়ার্ড কমপক্ষে ৬ অক্ষর":"Password must be at least 6 characters");return;}
    setSaving(true);
    try{
      const roll=parseInt(form.roll)||null;
      if(editId){
        await updateStudent(editId,{name:form.name,nameEn:form.nameEn,cls:form.class,section:form.section,roll,password:form.password||null,authId:form._authId,systemId:form._systemId});
        showNotif(lang==="bn"?"আপডেট হয়েছে!":"Updated!");
      }else{
        const systemId=nextSystemId();
        await createStudent({systemId,name:form.name,nameEn:form.nameEn,cls:form.class,section:form.section,roll,password:form.password});
        showNotif(lang==="bn"?`শিক্ষার্থী যোগ! ID: ${systemId}`:`Student added! ID: ${systemId}`);
      }
      await reload();
      setShowForm(false);setEditId(null);setForm(blank);
    }catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
    finally{setSaving(false);}
  };
  const doDelete=async(id)=>{
    try{await deleteStudent(id);await reload();showNotif(lang==="bn"?"মুছা হয়েছে!":"Deleted!");}
    catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
  };
  const aBtn=(bg,cl,bc)=>({padding:"4px 10px",background:bg,color:cl,border:`1px solid ${bc}`,borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600});
  return(<div style={S.page}>
    {confirmDel&&<ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={()=>{const id=confirmDel.id;setConfirmDel(null);doDelete(id);}} onCancel={()=>setConfirmDel(null)}/>}
    <div style={S.ph}><div><h2 style={S.pt}>{t.students}</h2><p style={S.ps}>{lang==="bn"?`মোট ${students.length} জন`:`Total ${students.length}`}{loading?" · …":""}</p></div><button onClick={openAdd} style={S.addBtn}>+ {t.addStudent}</button></div>
    {error&&<div style={{background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>{(lang==="bn"?"ডেটা লোড ব্যর্থ: ":"Load failed: ")+error}</div>}
    {showForm&&(<div style={S.card}>
      <h3 style={S.ct}>{editId?(lang==="bn"?"শিক্ষার্থী সম্পাদনা":"Edit Student"):(lang==="bn"?"নতুন শিক্ষার্থী":"New Student")}</h3>
      <div style={S.grid2}>
        <div style={S.fg}><label style={S.lbl}>{t.name} (বাংলা)</label><input style={S.inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.name} (English)</label><input style={S.inp} value={form.nameEn} onChange={e=>setForm({...form,nameEn:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.class}</label><select style={S.inp} value={form.class} onChange={e=>setForm({...form,class:e.target.value})}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div style={S.fg}><label style={S.lbl}>{t.section}</label><input style={S.inp} value={form.section} onChange={e=>setForm({...form,section:e.target.value})} placeholder="A, B..."/></div>
        <div style={S.fg}><label style={S.lbl}>{t.roll}</label><input style={S.inp} type="number" value={form.roll} onChange={e=>setForm({...form,roll:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{editId?(lang==="bn"?"পাসওয়ার্ড":"Password"):(t.defaultPass+" (login)")}</label><input style={S.inp} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={editId?(form._authId?(lang==="bn"?"খালি = অপরিবর্তিত":"blank = unchanged"):(lang==="bn"?"login দিতে পাসওয়ার্ড দিন":"set to give a login")):(lang==="bn"?"খালি = login ছাড়া":"blank = no login")}/></div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:12}}><button onClick={handleSave} disabled={saving} style={{...S.saveBtn,...(saving?{opacity:0.6,cursor:"wait"}:{})}}>{saving?(lang==="bn"?"সংরক্ষণ…":"Saving…"):t.save}</button><button onClick={()=>{setShowForm(false);setEditId(null);}} style={S.cancelBtn}>{t.cancel}</button></div>
    </div>)}
    <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{t.autoId}</th><th style={S.th}>{t.name}</th><th style={S.th}>{t.class}</th><th style={S.th}>{t.section}</th><th style={S.th}>{t.roll}</th><th style={S.th}>{lang==="bn"?"শ্রেণী শিক্ষক":"Class Teacher"}</th><th style={S.th}>{lang==="bn"?"অভিভাবক":"Parents"}</th><th style={S.th}>{lang==="bn"?"অ্যাকশন":"Action"}</th></tr></thead>
    <tbody>{students.map((s,i)=>{const ct=teachers.find(tc=>tc.classTeacher?.class===s.class&&tc.classTeacher?.section===s.section);const sParents=(parents||[]).filter(p=>p.studentId===s.systemId&&p.status==="approved");return(<tr key={s.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><code style={{background:"#f8fafc",padding:"2px 6px",borderRadius:4,fontSize:11,color:"#0f172a"}}>{s.systemId}</code></td><td style={S.td}><strong>{lang==="bn"?s.name:s.nameEn}</strong></td><td style={S.td}>{s.class}</td><td style={S.td}>{s.section||"—"}</td><td style={S.td}>{s.roll}</td><td style={S.td}>{ct?(lang==="bn"?ct.name:ct.nameEn):"—"}</td><td style={S.td}>{sParents.length===0?<span style={{color:"#94a3b8",fontSize:12}}>—</span>:<div style={{display:"flex",flexDirection:"column",gap:2}}>{sParents.map(p=>(<div key={p.id} style={{fontSize:12}}><span style={{fontWeight:600}}>{lang==="bn"?p.name:p.nameEn}</span><span style={{color:"#64748b",marginLeft:4,fontSize:11}}>({lang==="bn"?p.relation==="father"?"বাবা":p.relation==="mother"?"মা":"অভিভাবক":p.relation})</span></div>))}</div>}</td><td style={S.td}><div style={{display:"flex",gap:6}}><button onClick={()=>openEdit(s)} style={aBtn("#f8fafc","#0f172a","#e2e8f0")}>✏️ {t.edit}</button><button onClick={()=>setConfirmDel({id:s.id,name:lang==="bn"?s.name:s.nameEn})} style={aBtn("#fee2e2","#991b1b","#fca5a5")}>🗑️ {t.deleteAdmin}</button></div></td></tr>);})}</tbody></table></div>
  </div>);}



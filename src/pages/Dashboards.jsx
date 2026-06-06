import { S } from "../theme";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { StatCard, RankCard, BarChart, YearSelector, TermBreakdown } from "../components";
import { useDbStudents } from "../api/students";
import { useDbTeachers } from "../api/teachers";
import { useDbStudentEntries, studentKpiHelpers } from "../api/entries";

export function AdminTeacherDashboard({t,lang,currentUser,isAdmin,selectedYear,setSelectedYear,pendingParents}){
  const cm=new Date().getMonth();
  const {students}=useDbStudents(true);
  const {teachers}=useDbTeachers(true);
  const {entries}=useDbStudentEntries(true);
  const {monthKPI:getStudentMonthKPI,yearKPI:getStudentYearKPI}=studentKpiHelpers(entries);
  const yearsSet=[...new Set(entries.map(e=>e.year))];
  if(!yearsSet.includes(selectedYear))yearsSet.push(selectedYear);
  const availableYears=yearsSet.sort((a,b)=>b-a);
  const ranked=[...students].map(s=>({...s,kpi:getStudentYearKPI(s.id,selectedYear)})).sort((a,b)=>b.kpi-a.kpi);
  const mRanked=[...students].map(s=>({...s,kpi:getStudentMonthKPI(s.id,cm,selectedYear)})).sort((a,b)=>b.kpi-a.kpi);
  const totalE=entries.filter(e=>e.month===cm&&e.year===selectedYear).length;
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <div><h2 style={S.pt}>{t.dashboard}</h2><p style={S.ps}>{lang==="bn"?`স্বাগতম, ${currentUser.name}`:`${t.welcome}, ${currentUser.name}`}</p></div>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>
    </div>
    {isAdmin&&<div style={S.grid4}>
      <StatCard icon="🎓" value={students.length} label={t.totalStudents} color="#0f172a"/>
      <StatCard icon="👨‍🏫" value={teachers.length} label={t.totalTeachers} color="#2563eb"/>
      <StatCard icon="✏️" value={totalE} label={t.monthlyKPI} color="#0f172a"/>
      <StatCard icon={pendingParents.length>0?"⏳":"🏆"} value={pendingParents.length>0?pendingParents.length:(lang==="bn"?ranked[0]?.name:ranked[0]?.nameEn||"-")} label={pendingParents.length>0?(lang==="bn"?"অনুমোদন বাকি":"Pending"):(lang==="bn"?"শীর্ষ শিক্ষার্থী":"Top Student")} color="#0f172a"/>
    </div>}
    <div style={S.two}>
      <RankCard title={`🏆 ${t.topStudents} — ${lang==="bn"?"বার্ষিক":"Yearly"} ${selectedYear}`} list={ranked.slice(0,5)} lang={lang} t={t}/>
      <RankCard title={`📅 ${T[lang][MONTHS[cm]]} — ${lang==="bn"?"মাসিক":"Monthly"}`} list={mRanked.slice(0,5)} lang={lang} t={t}/>
    </div>
  </div>);}

export function StudentDashboard({t,lang,currentUser,selectedYear,setSelectedYear,termConfig}){
  const sid=currentUser.id,cm=new Date().getMonth();
  const {students}=useDbStudents(true);
  const {entries}=useDbStudentEntries(true);
  const {monthKPI:getStudentMonthKPI,termKPI:getStudentTermKPI,yearKPI:getStudentYearKPI}=studentKpiHelpers(entries);
  const yearsSet=[...new Set(entries.map(e=>e.year))];
  if(!yearsSet.includes(selectedYear))yearsSet.push(selectedYear);
  const availableYears=yearsSet.sort((a,b)=>b-a);
  const allRanked=[...students].map(s=>({...s,kpi:getStudentYearKPI(s.id,selectedYear)})).sort((a,b)=>b.kpi-a.kpi);
  const myRank=allRanked.findIndex(s=>s.id===sid)+1;
  const monthData=MONTHS.map((m,i)=>({label:T[lang][m].slice(0,3),val:getStudentMonthKPI(sid,i,selectedYear)}));
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <div><h2 style={S.pt}>{t.myKPI}</h2><p style={S.ps}>{lang==="bn"?`স্বাগতম, ${currentUser.name}`:`${t.welcome}, ${currentUser.name}`}</p><p style={{fontSize:12,color:"#94a3b8",margin:"2px 0 0"}}>{currentUser.systemId}</p></div>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>
    </div>
    <div style={S.grid4}>
      <StatCard icon="🏆" value={`#${myRank}`} label={t.myRank} color="#0f172a"/>
      <StatCard icon="📅" value={getStudentMonthKPI(sid,cm,selectedYear)} label={`${T[lang][MONTHS[cm]]} ${t.myMonthly}`} color="#0f172a"/>
      <StatCard icon="📊" value={getStudentYearKPI(sid,selectedYear)} label={`${selectedYear} ${t.myYearly}`} color="#0f172a"/>
      <StatCard icon="🎓" value={`${currentUser.class}${currentUser.section||""}`} label={t.class} color="#2563eb"/>
    </div>
    <div style={S.card}><h3 style={S.ct}>📈 {t.progressChart} — {selectedYear}</h3><BarChart data={monthData} cm={cm}/></div>
    <TermBreakdown t={t} lang={lang} termConfig={termConfig} selectedYear={selectedYear} getTermKPI={getStudentTermKPI} id={sid}/>
  </div>);}

export function ParentDashboard({t,lang,currentUser,selectedYear,setSelectedYear,termConfig}){
  const {students}=useDbStudents(true);
  const {entries}=useDbStudentEntries(true);
  const {monthKPI:getStudentMonthKPI,termKPI:getStudentTermKPI,yearKPI:getStudentYearKPI}=studentKpiHelpers(entries);
  const yearsSet=[...new Set(entries.map(e=>e.year))];
  if(!yearsSet.includes(selectedYear))yearsSet.push(selectedYear);
  const availableYears=yearsSet.sort((a,b)=>b-a);
  const child=students.find(s=>s.id===currentUser.studentId);
  if(!child)return<div style={S.page}><div style={S.empty}>{lang==="bn"?"শিক্ষার্থী পাওয়া যায়নি":"Student not found"}</div></div>;
  const sid=child.id,cm=new Date().getMonth();
  const allRanked=[...students].map(s=>({...s,kpi:getStudentYearKPI(s.id,selectedYear)})).sort((a,b)=>b.kpi-a.kpi);
  const myRank=allRanked.findIndex(s=>s.id===sid)+1;
  const monthData=MONTHS.map((m,i)=>({label:T[lang][m].slice(0,3),val:getStudentMonthKPI(sid,i,selectedYear)}));
  const relLabel=currentUser.relation==="father"?t.father:currentUser.relation==="mother"?t.mother:t.guardian;
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <div><h2 style={S.pt}>{t.childKPI}</h2><p style={S.ps}>{relLabel}: {currentUser.name}</p></div>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>
    </div>
    <div style={{...S.card,background:"linear-gradient(135deg,#f8fafc,#f0fdf4)",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{...S.ava,width:50,height:50,fontSize:22}}>{(lang==="bn"?child.name:child.nameEn)[0]}</div>
        <div><div style={{fontSize:17,fontWeight:800,color:"#0f172a"}}>{lang==="bn"?child.name:child.nameEn}</div><div style={{fontSize:13,color:"#0f172a"}}>{child.systemId}</div><div style={{fontSize:12,color:"#64748b"}}>{t.class} {child.class}{child.section} | {t.roll}: {child.roll}</div></div>
      </div>
    </div>
    <div style={S.grid4}>
      <StatCard icon="🏆" value={`#${myRank}`} label={t.myRank} color="#0f172a"/>
      <StatCard icon="📅" value={getStudentMonthKPI(sid,cm,selectedYear)} label={`${T[lang][MONTHS[cm]]} ${t.myMonthly}`} color="#0f172a"/>
      <StatCard icon="📊" value={getStudentYearKPI(sid,selectedYear)} label={`${selectedYear} ${t.myYearly}`} color="#0f172a"/>
      <StatCard icon="👥" value={students.length} label={lang==="bn"?"মোট শিক্ষার্থী":"Total Students"} color="#2563eb"/>
    </div>
    <div style={S.card}><h3 style={S.ct}>📈 {t.progressChart} — {selectedYear}</h3><BarChart data={monthData} cm={cm}/></div>
    <TermBreakdown t={t} lang={lang} termConfig={termConfig} selectedYear={selectedYear} getTermKPI={getStudentTermKPI} id={sid}/>
  </div>);}

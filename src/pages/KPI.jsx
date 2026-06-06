import { useState } from "react";
import { S } from "../theme";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { useIsMobile } from "../hooks";
import { freqDone } from "../lib";
import { StatCard, BarChart, YearSelector, TermBreakdown, EditScoreModal, EntryHistoryTable, ScoreEntryGrid } from "../components";
import { useDbTeachers } from "../api/teachers";
import { useDbParents } from "../api/parents";
import { useDbQuestions } from "../api/questions";
import { useDbEntriesByTarget, insertEntries, updateEntryScore, targetKpiHelpers } from "../api/entries";

export function TeacherKPIPage({t,lang,currentUser,showNotif,selectedYear,setSelectedYear}){
  const isMobile=useIsMobile();
  const {teachers}=useDbTeachers(true);
  const {questions:allQ}=useDbQuestions(true);
  const teacherQuestions=allQ.filter(q=>q.category==="teacher");
  const {entries:teacherEntries,reload}=useDbEntriesByTarget("teacher",true);
  const [selectedDate,setSelectedDate]=useState(new Date().toISOString().split("T")[0]);
  const [allScores,setAllScores]=useState({});
  const [submitting,setSubmitting]=useState(false);
  const cm=new Date(selectedDate).getMonth(),cy=new Date(selectedDate).getFullYear();
  const yearsSet=[...new Set(teacherEntries.map(e=>e.year))];if(!yearsSet.includes(selectedYear))yearsSet.push(selectedYear);const availableYears=yearsSet.sort((a,b)=>b-a);
  const activeQs=teacherQuestions.filter(q=>q.activeMonths.includes(cm));
  const setScore=(tid,qid,val)=>{const max=teacherQuestions.find(q=>q.id===qid)?.points||0;setAllScores(p=>({...p,[tid]:{...(p[tid]||{}),[qid]:Math.min(parseInt(val)||0,max)}}));};
  const getScore=(tid,qid)=>allScores[tid]?.[qid]??"";
  const getTotal=tid=>activeQs.reduce((s,q)=>s+(parseInt(allScores[tid]?.[q.id])||0),0);
  const isFreqDone=(tid,qid)=>freqDone(teacherEntries,tid,qid,teacherQuestions.find(x=>x.id===qid)?.frequency,selectedDate);
  const [editEntry,setEditEntry]=useState(null);
  const [editScore,setEditScore]=useState("");
  const handleEditSave=async()=>{try{await updateEntryScore(editEntry.id,parseInt(editScore)||0,editEntry.score,"admin");await reload();setEditEntry(null);showNotif(lang==="bn"?"সম্পাদনা সফল!":"Edited!");}catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}};
  const handleSubmit=async()=>{
    const rows=[];teachers.forEach(tc=>{activeQs.forEach(q=>{if(isFreqDone(tc.id,q.id))return;rows.push({target_type:"teacher",target_id:tc.id,entered_by:currentUser.id,question_id:q.id,question_text:q.textBn,question_text_en:q.textEn,max_points:q.points,score:parseInt(allScores[tc.id]?.[q.id])||0,month:cm,year:cy,entry_date:selectedDate,edit_log:[]});});});
    if(!rows.length){showNotif(lang==="bn"?"জমা দেওয়ার মতো কিছু নেই":"Nothing to submit");return;}
    setSubmitting(true);
    try{await insertEntries(rows);await reload();setAllScores({});showNotif(lang==="bn"?"পয়েন্ট জমা হয়েছে!":"Points submitted!");}
    catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
    finally{setSubmitting(false);}
  };
  return(<div style={S.page}>
    {editEntry&&<EditScoreModal t={t} lang={lang} entry={editEntry} score={editScore} setScore={setEditScore} onSave={handleEditSave} onCancel={()=>setEditEntry(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <h2 style={{...S.pt,margin:0}}>{t.tchrKpiEntry}</h2>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>
    </div>
    <div style={S.fg}><label style={S.lbl}>{t.selectDate}</label><input style={{...S.inp,maxWidth:200}} type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></div>
    <ScoreEntryGrid t={t} lang={lang} isMobile={isMobile} targets={teachers} questions={activeQs} getScore={getScore} setScore={setScore} getTotal={getTotal} isFreqDone={isFreqDone} onSubmit={handleSubmit} submitting={submitting} whoLabel={t.teachers} emptyMsg={t.noQForMonth}/>
    <EntryHistoryTable t={t} lang={lang} entries={teacherEntries} people={teachers} whoLabel={t.teachers} onEdit={(e)=>{setEditEntry(e);setEditScore(e.score);}}/>
  </div>);}

export function ParentKPIPage({t,lang,currentUser,showNotif,selectedYear,setSelectedYear}){
  const isMobile=useIsMobile();
  const {parents}=useDbParents(true);
  const {questions:allQ}=useDbQuestions(true);
  const parentQuestions=allQ.filter(q=>q.category==="parent");
  const {entries:parentEntries,reload}=useDbEntriesByTarget("parent",true);
  const [selectedDate,setSelectedDate]=useState(new Date().toISOString().split("T")[0]);
  const [allScores,setAllScores]=useState({});
  const [submitting,setSubmitting]=useState(false);
  const approvedParents=parents.filter(p=>p.status==="approved");
  const cm=new Date(selectedDate).getMonth(),cy=new Date(selectedDate).getFullYear();
  const yearsSet=[...new Set(parentEntries.map(e=>e.year))];if(!yearsSet.includes(selectedYear))yearsSet.push(selectedYear);const availableYears=yearsSet.sort((a,b)=>b-a);
  const activeQs=parentQuestions.filter(q=>q.activeMonths.includes(cm));
  const setScore=(pid,qid,val)=>{const max=parentQuestions.find(q=>q.id===qid)?.points||0;setAllScores(p=>({...p,[pid]:{...(p[pid]||{}),[qid]:Math.min(parseInt(val)||0,max)}}));};
  const getScore=(pid,qid)=>allScores[pid]?.[qid]??"";
  const getTotal=pid=>activeQs.reduce((s,q)=>s+(parseInt(allScores[pid]?.[q.id])||0),0);
  const isFreqDone=(pid,qid)=>freqDone(parentEntries,pid,qid,parentQuestions.find(x=>x.id===qid)?.frequency,selectedDate);
  const [editEntry,setEditEntry]=useState(null);
  const [editScore,setEditScore]=useState("");
  const handleEditSave=async()=>{try{await updateEntryScore(editEntry.id,parseInt(editScore)||0,editEntry.score,"admin");await reload();setEditEntry(null);showNotif(lang==="bn"?"সম্পাদনা সফল!":"Edited!");}catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}};
  const handleSubmit=async()=>{
    const rows=[];approvedParents.forEach(p=>{activeQs.forEach(q=>{if(isFreqDone(p.id,q.id))return;rows.push({target_type:"parent",target_id:p.id,entered_by:currentUser.id,question_id:q.id,question_text:q.textBn,question_text_en:q.textEn,max_points:q.points,score:parseInt(allScores[p.id]?.[q.id])||0,month:cm,year:cy,entry_date:selectedDate,edit_log:[]});});});
    if(!rows.length){showNotif(lang==="bn"?"জমা দেওয়ার মতো কিছু নেই":"Nothing to submit");return;}
    setSubmitting(true);
    try{await insertEntries(rows);await reload();setAllScores({});showNotif(lang==="bn"?"পয়েন্ট জমা হয়েছে!":"Points submitted!");}
    catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
    finally{setSubmitting(false);}
  };
  return(<div style={S.page}>
    {editEntry&&<EditScoreModal t={t} lang={lang} entry={editEntry} score={editScore} setScore={setEditScore} onSave={handleEditSave} onCancel={()=>setEditEntry(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <h2 style={{...S.pt,margin:0}}>{t.parKpiEntry}</h2>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>
    </div>
    <div style={S.fg}><label style={S.lbl}>{t.selectDate}</label><input style={{...S.inp,maxWidth:200}} type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></div>
    <ScoreEntryGrid t={t} lang={lang} isMobile={isMobile} targets={approvedParents} questions={activeQs} getScore={getScore} setScore={setScore} getTotal={getTotal} isFreqDone={isFreqDone} onSubmit={handleSubmit} submitting={submitting} whoLabel={t.parent} emptyMsg={t.noQForMonth}/>
    <EntryHistoryTable t={t} lang={lang} entries={parentEntries} people={parents} whoLabel={t.parent} onEdit={(e)=>{setEditEntry(e);setEditScore(e.score);}}/>
  </div>);}

export function MyTeacherKPIPage({t,lang,currentUser,selectedYear,setSelectedYear,termConfig}){
  const tid=currentUser.id,cm=new Date().getMonth();
  const {entries:teacherEntries}=useDbEntriesByTarget("teacher",true);
  const {monthKPI:getTchrMonthKPI,termKPI:getTchrTermKPI,yearKPI:getTchrYearKPI}=targetKpiHelpers(teacherEntries);
  const monthData=MONTHS.map((m,i)=>({label:T[lang][m].slice(0,3),val:getTchrMonthKPI(tid,i,selectedYear)}));
  const tchrYears=[...new Set([...teacherEntries.filter(e=>e.targetId===tid).map(e=>e.year),selectedYear])].sort((a,b)=>b-a);
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <div><h2 style={S.pt}>{t.myTchrKPI}</h2><p style={S.ps}>{lang==="bn"?currentUser.name:(currentUser.nameEn||currentUser.name)}</p></div>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={tchrYears.length>0?tchrYears:[selectedYear]}/>
    </div>
    <div style={S.grid4}>
      <StatCard icon="📅" value={getTchrMonthKPI(tid,cm,selectedYear)} label={T[lang][MONTHS[cm]]+" "+t.myMonthly} color="#0f172a"/>
      <StatCard icon="📊" value={getTchrYearKPI(tid,selectedYear)} label={selectedYear+" "+t.myYearly} color="#0f172a"/>
      <StatCard icon="🏆" value={getTchrTermKPI(tid,termConfig.term1,selectedYear)} label={t.term1} color="#0f172a"/>
      <StatCard icon="🎯" value={getTchrTermKPI(tid,termConfig.term2,selectedYear)} label={t.term2} color="#2563eb"/>
    </div>
    <div style={S.card}><h3 style={S.ct}>📈 {t.progressChart} — {selectedYear}</h3><BarChart data={monthData} cm={cm}/></div>
    <TermBreakdown t={t} lang={lang} termConfig={termConfig} selectedYear={selectedYear} getTermKPI={getTchrTermKPI} id={tid}/>
  </div>);}

export function MyParentKPIPage({t,lang,currentUser,selectedYear,setSelectedYear,termConfig}){
  const pid=currentUser.id,cm=new Date().getMonth();
  const {entries:parentEntries}=useDbEntriesByTarget("parent",true);
  const {monthKPI:getParMonthKPI,termKPI:getParTermKPI,yearKPI:getParYearKPI}=targetKpiHelpers(parentEntries);
  const monthData=MONTHS.map((m,i)=>({label:T[lang][m].slice(0,3),val:getParMonthKPI(pid,i,selectedYear)}));
  const parYears=[...new Set([...parentEntries.filter(e=>e.targetId===pid).map(e=>e.year),selectedYear])].sort((a,b)=>b-a);
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <div><h2 style={S.pt}>{t.myKPI}</h2><p style={S.ps}>{lang==="bn"?currentUser.name:(currentUser.nameEn||currentUser.name)}</p></div>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={parYears.length>0?parYears:[selectedYear]}/>
    </div>
    <div style={S.grid4}>
      <StatCard icon="📅" value={getParMonthKPI(pid,cm,selectedYear)} label={T[lang][MONTHS[cm]]+" "+t.myMonthly} color="#0f172a"/>
      <StatCard icon="📊" value={getParYearKPI(pid,selectedYear)} label={selectedYear+" "+t.myYearly} color="#0f172a"/>
      <StatCard icon="🏆" value={getParTermKPI(pid,termConfig.term1,selectedYear)} label={t.term1} color="#0f172a"/>
      <StatCard icon="🎯" value={getParTermKPI(pid,termConfig.term2,selectedYear)} label={t.term2} color="#2563eb"/>
    </div>
    <div style={S.card}><h3 style={S.ct}>📈 {t.progressChart} — {selectedYear}</h3><BarChart data={monthData} cm={cm}/></div>
    <TermBreakdown t={t} lang={lang} termConfig={termConfig} selectedYear={selectedYear} getTermKPI={getParTermKPI} id={pid}/>
  </div>);}

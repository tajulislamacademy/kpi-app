import { useState } from "react";
import { S } from "../theme";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { useIsMobile } from "../hooks";
import { freqDone } from "../lib";
import { StatCard, BarChart, YearSelector, TermBreakdown, EditScoreModal, EntryHistoryTable } from "../components";
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
    {activeQs.length===0?<div style={S.empty}>{t.noQForMonth}</div>:(isMobile?(<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {teachers.map(tc=>(<div key={tc.id} style={{...S.card,marginBottom:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:8,borderBottom:"2px solid #f8fafc"}}>
          <div><div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{lang==="bn"?tc.name:tc.nameEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>{tc.systemId}</div></div>
          <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{fontSize:24,fontWeight:900,color:"#0f172a",lineHeight:1}}>{getTotal(tc.id)}</div><div style={{fontSize:11,color:"#94a3b8"}}>/{activeQs.reduce((s,q)=>s+q.points,0)} pts</div></div>
        </div>
        {activeQs.map(q=>(<div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
          <div style={{flex:1,marginRight:12}}><div style={{fontSize:13,fontWeight:500,color:"#334155"}}>{lang==="bn"?q.textBn:q.textEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>max {q.points}</div></div>
          {isFreqDone(tc.id,q.id)?<div style={{width:64,height:44,display:"flex",alignItems:"center",justifyContent:"center",background:"#f0fdf4",borderRadius:8,fontSize:12,color:"#166534",fontWeight:700}}>✓</div>:<input type="number" min="0" max={q.points} style={{...S.scoreInp,width:64,height:44,fontSize:18,fontWeight:700}} value={getScore(tc.id,q.id)} onChange={e=>setScore(tc.id,q.id,e.target.value)} placeholder="0"/>}
        </div>))}
      </div>))}
      <button onClick={handleSubmit} disabled={submitting} style={{...S.submitBtn,width:"100%",padding:14,fontSize:16,marginTop:4,borderRadius:10,...(submitting?{opacity:0.6,cursor:"wait"}:{})}}>{submitting?(lang==="bn"?"জমা হচ্ছে…":"Submitting…"):t.submitPoints}</button>
    </div>):(<div style={S.card}><div style={{overflowX:"auto"}}><table style={S.table}><thead><tr><th style={{...S.th,minWidth:140}}>{t.teachers}</th>{activeQs.map(q=>(<th key={q.id} style={{...S.th,minWidth:80,textAlign:"center"}}><div style={{fontSize:11,fontWeight:600}}>{lang==="bn"?q.textBn:q.textEn}</div><div style={{fontSize:10,color:"#0f172a"}}>/{q.points}</div></th>))}<th style={{...S.th,minWidth:70,textAlign:"center"}}>{lang==="bn"?"মোট":"Total"}</th></tr></thead><tbody>{teachers.map((tc,i)=>(<tr key={tc.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><div style={{fontWeight:600,fontSize:13}}>{lang==="bn"?tc.name:tc.nameEn}</div><div style={{fontSize:10,color:"#94a3b8"}}>{tc.systemId}</div></td>{activeQs.map(q=>(<td key={q.id} style={{...S.td,textAlign:"center"}}>{isFreqDone(tc.id,q.id)?<span style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>✓</span>:<input type="number" min="0" max={q.points} style={{...S.scoreInp,width:52}} value={getScore(tc.id,q.id)} onChange={e=>setScore(tc.id,q.id,e.target.value)} placeholder="0"/>}</td>))}<td style={{...S.td,textAlign:"center"}}><strong style={{color:"#0f172a",fontSize:15}}>{getTotal(tc.id)}</strong><div style={{fontSize:10,color:"#94a3b8"}}>/{activeQs.reduce((s,q)=>s+q.points,0)}</div></td></tr>))}</tbody></table></div><div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><button onClick={handleSubmit} disabled={submitting} style={{...S.submitBtn,...(submitting?{opacity:0.6,cursor:"wait"}:{})}}>{submitting?(lang==="bn"?"জমা হচ্ছে…":"Submitting…"):t.submitPoints}</button></div></div>))}
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
    {activeQs.length===0?<div style={S.empty}>{t.noQForMonth}</div>:(isMobile?(<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {approvedParents.map(p=>(<div key={p.id} style={{...S.card,marginBottom:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:8,borderBottom:"2px solid #f8fafc"}}>
          <div><div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{lang==="bn"?p.name:p.nameEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>{p.systemId}</div></div>
          <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{fontSize:24,fontWeight:900,color:"#0f172a",lineHeight:1}}>{getTotal(p.id)}</div><div style={{fontSize:11,color:"#94a3b8"}}>/{activeQs.reduce((s,q)=>s+q.points,0)} pts</div></div>
        </div>
        {activeQs.map(q=>(<div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
          <div style={{flex:1,marginRight:12}}><div style={{fontSize:13,fontWeight:500,color:"#334155"}}>{lang==="bn"?q.textBn:q.textEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>max {q.points}</div></div>
          {isFreqDone(p.id,q.id)?<div style={{width:64,height:44,display:"flex",alignItems:"center",justifyContent:"center",background:"#f0fdf4",borderRadius:8,fontSize:12,color:"#166534",fontWeight:700}}>✓</div>:<input type="number" min="0" max={q.points} style={{...S.scoreInp,width:64,height:44,fontSize:18,fontWeight:700}} value={getScore(p.id,q.id)} onChange={e=>setScore(p.id,q.id,e.target.value)} placeholder="0"/>}
        </div>))}
      </div>))}
      <button onClick={handleSubmit} disabled={submitting} style={{...S.submitBtn,width:"100%",padding:14,fontSize:16,marginTop:4,borderRadius:10,...(submitting?{opacity:0.6,cursor:"wait"}:{})}}>{submitting?(lang==="bn"?"জমা হচ্ছে…":"Submitting…"):t.submitPoints}</button>
    </div>):(<div style={S.card}><div style={{overflowX:"auto"}}><table style={S.table}><thead><tr><th style={{...S.th,minWidth:140}}>{t.parent}</th>{activeQs.map(q=>(<th key={q.id} style={{...S.th,minWidth:80,textAlign:"center"}}><div style={{fontSize:11,fontWeight:600}}>{lang==="bn"?q.textBn:q.textEn}</div><div style={{fontSize:10,color:"#0f172a"}}>/{q.points}</div></th>))}<th style={{...S.th,minWidth:70,textAlign:"center"}}>{lang==="bn"?"মোট":"Total"}</th></tr></thead><tbody>{approvedParents.map((p,i)=>(<tr key={p.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><div style={{fontWeight:600,fontSize:13}}>{lang==="bn"?p.name:p.nameEn}</div><div style={{fontSize:10,color:"#94a3b8"}}>{p.systemId}</div></td>{activeQs.map(q=>(<td key={q.id} style={{...S.td,textAlign:"center"}}>{isFreqDone(p.id,q.id)?<span style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>✓</span>:<input type="number" min="0" max={q.points} style={{...S.scoreInp,width:52}} value={getScore(p.id,q.id)} onChange={e=>setScore(p.id,q.id,e.target.value)} placeholder="0"/>}</td>))}<td style={{...S.td,textAlign:"center"}}><strong style={{color:"#0f172a",fontSize:15}}>{getTotal(p.id)}</strong><div style={{fontSize:10,color:"#94a3b8"}}>/{activeQs.reduce((s,q)=>s+q.points,0)}</div></td></tr>))}</tbody></table></div><div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><button onClick={handleSubmit} disabled={submitting} style={{...S.submitBtn,...(submitting?{opacity:0.6,cursor:"wait"}:{})}}>{submitting?(lang==="bn"?"জমা হচ্ছে…":"Submitting…"):t.submitPoints}</button></div></div>))}
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

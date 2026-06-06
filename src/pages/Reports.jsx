import { useState } from "react";
import { S } from "../theme";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { YearSelector, Tabs } from "../components";
import { useDbStudents } from "../api/students";
import { useDbStudentEntries, studentKpiHelpers } from "../api/entries";

export function ReportsPage({t,lang,termConfig,currentUser,isAdmin,selectedYear,setSelectedYear}){
  const [rType,setRType]=useState("monthly");
  const [selMonth,setSelMonth]=useState(new Date().getMonth());
  const {students}=useDbStudents(true);
  const {entries}=useDbStudentEntries(true);
  const {monthKPI:getStudentMonthKPI,termKPI:getStudentTermKPI,yearKPI:getStudentYearKPI}=studentKpiHelpers(entries);
  const yearsSet=[...new Set(entries.map(e=>e.year))];
  if(!yearsSet.includes(selectedYear))yearsSet.push(selectedYear);
  const availableYears=yearsSet.sort((a,b)=>b-a);
  const isStudent=currentUser.role==="student",isParent=currentUser.role==="parent";
  let vis=students;
  if(!isAdmin){if(currentUser.classTeacher)vis=students.filter(s=>s.class===currentUser.classTeacher.class&&s.section===currentUser.classTeacher.section);else if(isStudent)vis=students.filter(s=>s.id===currentUser.id);else if(isParent)vis=students.filter(s=>s.id===currentUser.studentId);else if((currentUser.guideStudents||[]).length>0)vis=students.filter(s=>currentUser.guideStudents.includes(s.id));}
  const ranked=[...vis].map(s=>({...s,kpi:rType==="monthly"?getStudentMonthKPI(s.id,selMonth,selectedYear):rType==="term1"?getStudentTermKPI(s.id,termConfig.term1,selectedYear):rType==="term2"?getStudentTermKPI(s.id,termConfig.term2,selectedYear):rType==="term3"?getStudentTermKPI(s.id,termConfig.term3,selectedYear):rType==="term4"?getStudentTermKPI(s.id,termConfig.term4,selectedYear):getStudentYearKPI(s.id,selectedYear)})).sort((a,b)=>b.kpi-a.kpi);
  const mc=i=>i===0?"#0f172a":i===1?"#52525b":i===2?"#a1a1aa":"transparent";
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}><h2 style={{...S.pt,margin:0}}>{t.reports}</h2><YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/></div>
    <Tabs items={[{key:"monthly",label:lang==="bn"?"মাসিক":"Monthly"},{key:"term1",label:t.term1},{key:"term2",label:t.term2},{key:"term3",label:t.term3},{key:"term4",label:t.term4},{key:"yearly",label:lang==="bn"?"বার্ষিক":"Yearly"}]} active={rType} onChange={setRType}/>
    {rType==="monthly"&&<div style={S.fg}><label style={S.lbl}>{t.month}</label><select style={{...S.inp,maxWidth:180}} value={selMonth} onChange={e=>setSelMonth(parseInt(e.target.value))}>{MONTHS.map((m,i)=><option key={m} value={i}>{T[lang][m]}</option>)}</select></div>}
    {!isStudent&&!isParent&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,margin:"16px 0"}}>{ranked.slice(0,3).map((s,i)=>(<div key={s.id} style={{...S.card,textAlign:"center",border:"1px solid #e2e8f0"}}><div style={{fontSize:28}}>{i===0?"🥇":i===1?"🥈":"🥉"}</div><div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>{lang==="bn"?s.name:s.nameEn}</div><div style={{fontSize:12,color:"#94a3b8"}}>{t.class} {s.class}{s.section}</div><div style={{fontSize:26,fontWeight:900,color:mc(i)||"#0f172a"}}>{s.kpi}</div><div style={{fontSize:11,color:"#94a3b8"}}>{lang==="bn"?"পয়েন্ট":"pts"}</div></div>))}</div>}
    <div style={S.card}><h3 style={S.ct}>{lang==="bn"?"র‍্যাংকিং":"Rankings"}</h3>
      <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{t.rank}</th><th style={S.th}>{t.name}</th><th style={S.th}>{t.class}</th><th style={S.th}>{t.roll}</th><th style={S.th}>{t.totalPoints}</th></tr></thead>
      <tbody>{ranked.map((s,i)=>{const isMe=isStudent&&s.id===currentUser.id;return(<tr key={s.id} style={{...(i%2===0?{background:"#fafafa"}:{}),fontWeight:i<3?"700":"400",...(isMe?{background:"#f8fafc"}:{})}}><td style={S.td}><span style={{display:"inline-block",width:28,height:28,lineHeight:"28px",textAlign:"center",borderRadius:6,background:i===0?"#fef3c7":i===1?"#f1f5f9":i===2?"#fff7ed":"transparent",color:mc(i)||"#64748b",fontWeight:700}}>{i<3?["🥇","🥈","🥉"][i]:i+1}</span></td><td style={S.td}>{lang==="bn"?s.name:s.nameEn}{isMe&&<span style={{fontSize:11,color:"#0f172a",marginLeft:6}}>(আমি)</span>}</td><td style={S.td}>{s.class}{s.section}</td><td style={S.td}>{s.roll}</td><td style={S.td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{height:8,borderRadius:4,background:"linear-gradient(90deg,#0f172a,#64748b)",width:`${Math.min(100,(s.kpi/(ranked[0]?.kpi||1))*100)}%`,minWidth:4}}/><span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{s.kpi}</span></div></td></tr>);})}</tbody></table></div>
    </div>
  </div>);}

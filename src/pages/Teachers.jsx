import { useState } from "react";
import { S } from "../theme";
import { CLASSES, SECTIONS, SUBJECTS } from "../constants";
import { genId } from "../lib";
import { ConfirmDialog, PageHeader } from "../components";
import { useDbTeachers, createTeacher, updateTeacher, deleteTeacher } from "../api/teachers";
import { useDbStudents } from "../api/students";

export function TeachersPage({t,lang,showNotif}){
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
    <PageHeader title={t.teachers} subtitle={`${lang==="bn"?`মোট ${teachers.length} জন`:`Total ${teachers.length}`}${loading?" · …":""}`} actionLabel={`+ ${t.addTeacher}`} onAction={openAdd}/>
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

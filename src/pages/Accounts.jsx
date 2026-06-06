import { useState } from "react";
import { S } from "../theme";
import { genId } from "../lib";
import { ConfirmDialog, StatCard, Modal } from "../components";
import { useDbParents, createParent, updateParent, setParentStatus, deleteParent } from "../api/parents";
import { useDbStudents } from "../api/students";

export function AccountsPage({t,lang,showNotif}){
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
    {editParent&&(<Modal><h3 style={S.ct}>{lang==="bn"?"অভিভাবক সম্পাদনা":"Edit Parent"}</h3><div style={S.grid2}><div style={S.fg}><label style={S.lbl}>{t.parentName} (বাংলা)</label><input style={S.inp} value={parentForm.name} onChange={e=>setParentForm({...parentForm,name:e.target.value})}/></div><div style={S.fg}><label style={S.lbl}>{t.parentName} (English)</label><input style={S.inp} value={parentForm.nameEn} onChange={e=>setParentForm({...parentForm,nameEn:e.target.value})}/></div><div style={S.fg}><label style={S.lbl}>{t.defaultPass}</label><input style={S.inp} value={parentForm.password} onChange={e=>setParentForm({...parentForm,password:e.target.value})}/></div><div style={S.fg}><label style={S.lbl}>{t.relation}</label><select style={S.inp} value={parentForm.relation} onChange={e=>setParentForm({...parentForm,relation:e.target.value})}><option value="father">{t.father}</option><option value="mother">{t.mother}</option><option value="guardian">{t.guardian}</option></select></div><div style={S.fg}><label style={S.lbl}>{lang==="bn"?"অবস্থা":"Status"}</label><select style={S.inp} value={parentForm.status} onChange={e=>setParentForm({...parentForm,status:e.target.value})}><option value="approved">{t.approved}</option><option value="pending">{t.pending}</option><option value="rejected">{t.rejected}</option></select></div></div><div style={{display:"flex",gap:8,marginTop:12}}><button onClick={handleSaveParent} disabled={saving} style={{...S.saveBtn,...(saving?{opacity:0.6,cursor:"wait"}:{})}}>{t.save}</button><button onClick={()=>setEditParent(null)} style={S.cancelBtn}>{t.cancel}</button></div></Modal>)}
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

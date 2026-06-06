import { useState, useEffect } from "react";
import { S } from "../theme";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { seedDemoData } from "../api/seed";

export function SettingsPage({t,lang,termConfig,onSaveTermConfig,showNotif}){
  const [cfg,setCfg]=useState({...termConfig});
  const [seeding,setSeeding]=useState(false);
  const [savingTerm,setSavingTerm]=useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{setCfg({...termConfig});},[termConfig]);
  const toggle=(term,m)=>{const cur=cfg[term];setCfg({...cfg,[term]:cur.includes(m)?cur.filter(x=>x!==m):[...cur,m].sort((a,b)=>a-b)});};
  const handleSaveTerm=async()=>{setSavingTerm(true);try{await onSaveTermConfig(cfg);showNotif(lang==="bn"?"সেটিংস সংরক্ষণ!":"Settings saved!");}catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}finally{setSavingTerm(false);}};
  const handleSeed=async()=>{
    setSeeding(true);
    try{await seedDemoData(msg=>showNotif(msg));}
    catch(e){showNotif((lang==="bn"?"সীড ত্রুটি: ":"Seed error: ")+(e.message||e));}
    finally{setSeeding(false);}
  };
  return(<div style={S.page}><h2 style={S.pt}>{t.settings}</h2>
    {import.meta.env.DEV&&<div style={S.card}><h3 style={S.ct}>🌱 {lang==="bn"?"ডেমো ডেটা (DEV)":"Demo Data (DEV)"}</h3>
      <p style={{fontSize:13,color:"#64748b",marginBottom:12}}>{lang==="bn"?"প্রশ্ন (সব role) ও ২ জন শিক্ষক (login সহ, পাসওয়ার্ড 123456) তৈরি করে। ইতিমধ্যে থাকলে skip করে। শুধু dev mode-এ দেখায়।":"Creates questions (all roles) and 2 teachers (with login, password 123456). Skips existing. DEV-only."}</p>
      <button onClick={handleSeed} disabled={seeding} style={{...S.saveBtn,...(seeding?{opacity:0.6,cursor:"wait"}:{})}}>{seeding?(lang==="bn"?"সীড হচ্ছে…":"Seeding…"):(lang==="bn"?"ডেমো ডেটা সীড করুন":"Seed demo data")}</button>
    </div>}
    <div style={S.card}><h3 style={S.ct}>{t.termConfig}</h3>
      {["term1","term2","term3","term4"].map((term,ti)=>(<div key={term} style={{marginBottom:20}}><div style={{fontWeight:700,color:"#0f172a",fontSize:14,marginBottom:8}}>{ti===0?t.term1:ti===1?t.term2:ti===2?t.term3:t.term4}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{MONTHS.map((m,mi)=>(<button key={m} onClick={()=>toggle(term,mi)} style={{...S.mBtn,...(cfg[term].includes(mi)?S.mOn:{})}}>{T[lang][m].slice(0,3)}</button>))}</div></div>))}
      <button onClick={handleSaveTerm} disabled={savingTerm} style={{...S.saveBtn,...(savingTerm?{opacity:0.6,cursor:"wait"}:{})}}>{savingTerm?(lang==="bn"?"সংরক্ষণ…":"Saving…"):t.save}</button>
    </div>
    <div style={S.card}><h3 style={S.ct}>{lang==="bn"?"বর্তমান কনফিগারেশন":"Current Configuration"}</h3>
      {["term1","term2","term3","term4"].map((term,ti)=>(<div key={term} style={{padding:"8px 0",borderBottom:"1px solid #f1f5f9",fontSize:14,color:"#374151"}}><strong>{ti===0?t.term1:ti===1?t.term2:ti===2?t.term3:t.term4}:</strong><span style={{marginLeft:8}}>{termConfig[term].map(m=>T[lang][MONTHS[m]]).join(", ")||"—"}</span></div>))}
    </div>
  </div>);}

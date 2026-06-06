// Small shared presentational components.
import { S } from "./theme";

export function YearSelector({lang,selectedYear,setSelectedYear,availableYears}){return(<div style={{display:"flex",alignItems:"center",gap:8,background:"#f8fafc",borderRadius:10,padding:"8px 14px"}}><span style={{fontSize:13,fontWeight:700,color:"#334155"}}>📅 {lang==="bn"?"বছর":"Year"}:</span><select style={{border:"none",background:"transparent",fontSize:15,fontWeight:800,color:"#334155",outline:"none",cursor:"pointer"}} value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value))}>{availableYears.map(y=><option key={y} value={y}>{y}</option>)}</select></div>);}

export function StatCard({icon,value,label}){return(<div style={{...S.statCard,border:"1px solid #e2e8f0"}}><div style={{fontSize:22,marginBottom:8}}>{icon}</div><div style={{fontSize:20,fontWeight:800,color:"#0f172a",marginBottom:4}}>{value}</div><div style={{fontSize:12,color:"#64748b"}}>{label}</div></div>);}

export function RankCard({title,list,lang,t}){return(<div style={S.card}><h3 style={S.ct}>{title}</h3>{list.map((s,i)=>(<div key={s.id} style={S.rankRow}><div style={{...S.rankBadge,background:i===0?"#0f172a":i===1?"#52525b":i===2?"#a1a1aa":"#f4f4f5",color:i<3?"#fff":"#64748b"}}>{i+1}</div><div style={{flex:1,fontSize:14,fontWeight:500}}>{lang==="bn"?s.name:s.nameEn}</div><div style={{fontSize:12,color:"#94a3b8"}}>{t.class} {s.class}{s.section}</div><div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{s.kpi}</div></div>))}</div>);}

export function BarChart({data,cm}){
  const maxVal=Math.max(...data.map(d=>d.val),1);
  return(<div style={{display:"flex",alignItems:"flex-end",gap:6,height:120,padding:"8px 0"}}>
    {data.map((d,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{fontSize:10,color:"#0f172a",fontWeight:700}}>{d.val||""}</div>
      <div style={{width:"100%",background:i===cm?"#0f172a":"#e2e8f0",borderRadius:"4px 4px 0 0",height:`${Math.max((d.val/maxVal)*90,d.val>0?8:2)}px`}}/>
      <div style={{fontSize:9,color:"#94a3b8",fontWeight:600}}>{d.label}</div>
    </div>))}
  </div>);}

export function ConfirmDialog({lang,name,onConfirm,onCancel}){return(<div style={S.modalBg}><div style={{...S.modalBox,maxWidth:360,textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>⚠️</div><h3 style={{...S.ct,marginBottom:8}}>{lang==="bn"?"নিশ্চিত করুন?":"Confirm Delete?"}</h3><p style={{fontSize:14,color:"#64748b",marginBottom:20}}>{lang==="bn"?(`"${name}" মুছে ফেলবেন?`):(`Delete "${name}"?`)}</p><div style={{display:"flex",gap:8,justifyContent:"center"}}><button onClick={onConfirm} style={{padding:"9px 24px",background:"#ef4444",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700}}>{lang==="bn"?"হ্যাঁ, মুছুন":"Yes, Delete"}</button><button onClick={onCancel} style={S.cancelBtn}>{lang==="bn"?"না":"Cancel"}</button></div></div></div>);}

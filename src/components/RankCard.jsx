import { S } from "../theme";

export function RankCard({title,list,lang,t}){return(<div style={S.card}><h3 style={S.ct}>{title}</h3>{list.map((s,i)=>(<div key={s.id} style={S.rankRow}><div style={{...S.rankBadge,background:i===0?"#0f172a":i===1?"#52525b":i===2?"#a1a1aa":"#f4f4f5",color:i<3?"#fff":"#64748b"}}>{i+1}</div><div style={{flex:1,fontSize:14,fontWeight:500}}>{lang==="bn"?s.name:s.nameEn}</div><div style={{fontSize:12,color:"#94a3b8"}}>{t.class} {s.class}{s.section}</div><div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{s.kpi}</div></div>))}</div>);}

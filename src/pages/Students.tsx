import { useState } from "react";
import type { CSSProperties } from "react";
import { S } from "../theme";
import { CLASSES } from "../constants";
import { genId, errMsg } from "../lib";
import { ConfirmDialog, PageHeader, ErrorNote } from "../components";
import { useDbStudents, createStudent, updateStudent, deleteStudent } from "../api/students";
import { useDbTeachers } from "../api/teachers";
import { useDbParents } from "../api/parents";
import type { Dict, Lang, Student } from "../types";

interface Props { t: Dict; lang: Lang; showNotif: (msg: string) => void; }
interface SForm { name: string; nameEn: string; class: string; section: string; roll: number | string; password: string; _authId?: string | null; _systemId?: string; }

export function StudentsPage({ t, lang, showNotif }: Props) {
  // Self-contained Supabase data (admin session required by RLS).
  const { students, loading, error, reload } = useDbStudents(true);
  const { teachers } = useDbTeachers(true);
  const { parents } = useDbParents(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const blank: SForm = { name: "", nameEn: "", class: "8", section: "", roll: "", password: "123456" };
  const [form, setForm] = useState<SForm>(blank);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const openAdd = () => { setEditId(null); setForm(blank); setShowForm(true); };
  const openEdit = (s: Student) => { setEditId(s.id); setForm({ name: s.name || "", nameEn: s.nameEn || "", class: s.class || "8", section: s.section || "", roll: s.roll || "", password: "", _authId: s.authId, _systemId: s.systemId }); setShowForm(true); };
  // Next STD id from the MAX existing suffix (not array length) — survives deletes.
  const nextSystemId = () => {
    const yr = new Date().getFullYear();
    const max = students.reduce((m, s) => { const n = parseInt(String(s.systemId || "").split("-")[1]?.slice(4) ?? "") || 0; return Math.max(m, n); }, 0);
    return genId("STD", yr, max + 1);
  };
  const handleSave = async () => {
    if (!form.name) { showNotif(lang === "bn" ? "নাম আবশ্যক" : "Name required"); return; }
    if (form.password && form.password.length < 6) { showNotif(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" : "Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      const roll = parseInt(String(form.roll)) || null;
      if (editId) {
        await updateStudent(editId, { name: form.name, nameEn: form.nameEn, cls: form.class, section: form.section, roll, password: form.password || null, authId: form._authId, systemId: form._systemId });
        showNotif(lang === "bn" ? "আপডেট হয়েছে!" : "Updated!");
      } else {
        const systemId = nextSystemId();
        await createStudent({ systemId, name: form.name, nameEn: form.nameEn, cls: form.class, section: form.section, roll, password: form.password });
        showNotif(lang === "bn" ? `শিক্ষার্থী যোগ! ID: ${systemId}` : `Student added! ID: ${systemId}`);
      }
      await reload();
      setShowForm(false); setEditId(null); setForm(blank);
    } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
    finally { setSaving(false); }
  };
  const doDelete = async (id: string) => {
    try { await deleteStudent(id); await reload(); showNotif(lang === "bn" ? "মুছা হয়েছে!" : "Deleted!"); }
    catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); }
  };
  const aBtn = (bg: string, cl: string, bc: string): CSSProperties => ({ padding: "4px 10px", background: bg, color: cl, border: `1px solid ${bc}`, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 });
  return (<div style={S.page}>
    {confirmDel && <ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={() => { const id = confirmDel.id; setConfirmDel(null); doDelete(id); }} onCancel={() => setConfirmDel(null)} />}
    <PageHeader title={t.students} subtitle={`${lang === "bn" ? `মোট ${students.length} জন` : `Total ${students.length}`}${loading ? " · …" : ""}`} actionLabel={`+ ${t.addStudent}`} onAction={openAdd} />
    <ErrorNote lang={lang} error={error} />
    {showForm && (<div style={S.card}>
      <h3 style={S.ct}>{editId ? (lang === "bn" ? "শিক্ষার্থী সম্পাদনা" : "Edit Student") : (lang === "bn" ? "নতুন শিক্ষার্থী" : "New Student")}</h3>
      <div style={S.grid2}>
        <div style={S.fg}><label style={S.lbl}>{t.name} (বাংলা)</label><input style={S.inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div style={S.fg}><label style={S.lbl}>{t.name} (English)</label><input style={S.inp} value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} /></div>
        <div style={S.fg}><label style={S.lbl}>{t.class}</label><select style={S.inp} value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}>{CLASSES.map(c => <option key={c}>{c}</option>)}</select></div>
        <div style={S.fg}><label style={S.lbl}>{t.section}</label><input style={S.inp} value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="A, B..." /></div>
        <div style={S.fg}><label style={S.lbl}>{t.roll}</label><input style={S.inp} type="number" value={form.roll} onChange={e => setForm({ ...form, roll: e.target.value })} /></div>
        <div style={S.fg}><label style={S.lbl}>{editId ? (lang === "bn" ? "পাসওয়ার্ড" : "Password") : (t.defaultPass + " (login)")}</label><input style={S.inp} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editId ? (form._authId ? (lang === "bn" ? "খালি = অপরিবর্তিত" : "blank = unchanged") : (lang === "bn" ? "login দিতে পাসওয়ার্ড দিন" : "set to give a login")) : (lang === "bn" ? "খালি = login ছাড়া" : "blank = no login")} /></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={handleSave} disabled={saving} style={{ ...S.saveBtn, ...(saving ? { opacity: 0.6, cursor: "wait" } : {}) }}>{saving ? (lang === "bn" ? "সংরক্ষণ…" : "Saving…") : t.save}</button><button onClick={() => { setShowForm(false); setEditId(null); }} style={S.cancelBtn}>{t.cancel}</button></div>
    </div>)}
    <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{t.autoId}</th><th style={S.th}>{t.name}</th><th style={S.th}>{t.class}</th><th style={S.th}>{t.section}</th><th style={S.th}>{t.roll}</th><th style={S.th}>{lang === "bn" ? "শ্রেণী শিক্ষক" : "Class Teacher"}</th><th style={S.th}>{lang === "bn" ? "অভিভাবক" : "Parents"}</th><th style={S.th}>{lang === "bn" ? "অ্যাকশন" : "Action"}</th></tr></thead>
    <tbody>{students.map((s, i) => { const ct = teachers.find(tc => tc.classTeacher?.class === s.class && tc.classTeacher?.section === s.section); const sParents = (parents || []).filter(p => p.studentId === s.id && p.status === "approved"); return (<tr key={s.id} style={i % 2 === 0 ? { background: "#fafafa" } : {}}><td style={S.td}><code style={{ background: "#f8fafc", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "#0f172a" }}>{s.systemId}</code></td><td style={S.td}><strong>{lang === "bn" ? s.name : s.nameEn}</strong></td><td style={S.td}>{s.class}</td><td style={S.td}>{s.section || "—"}</td><td style={S.td}>{s.roll}</td><td style={S.td}>{ct ? (lang === "bn" ? ct.name : ct.nameEn) : "—"}</td><td style={S.td}>{sParents.length === 0 ? <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span> : <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{sParents.map(p => (<div key={p.id} style={{ fontSize: 12 }}><span style={{ fontWeight: 600 }}>{lang === "bn" ? p.name : p.nameEn}</span><span style={{ color: "#64748b", marginLeft: 4, fontSize: 11 }}>({lang === "bn" ? p.relation === "father" ? "বাবা" : p.relation === "mother" ? "মা" : "অভিভাবক" : p.relation})</span></div>))}</div>}</td><td style={S.td}><div style={{ display: "flex", gap: 6 }}><button onClick={() => openEdit(s)} style={aBtn("#f8fafc", "#0f172a", "#e2e8f0")}>✏️ {t.edit}</button><button onClick={() => setConfirmDel({ id: s.id, name: (lang === "bn" ? s.name : s.nameEn) || "" })} style={aBtn("#fee2e2", "#991b1b", "#fca5a5")}>🗑️ {t.deleteAdmin}</button></div></td></tr>); })}</tbody></table></div>
  </div>);
}

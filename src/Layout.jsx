import { useState } from "react";
import { S } from "./theme";
import { useIsMobile } from "./hooks";

// App shell: notification toast, mobile header, sidebar (logo / language /
// nav / user / logout) and the <main> region. Pages are rendered as children.
// Owns its own mobile-drawer state; routing/auth stay in App.
export function Layout({ t, lang, setLang, currentUser, isAdmin, isTeacher, navItems, activeTab, onNav, onLogout, notif, children }) {
  const isMobile = useIsMobile();
  const [navOpen, setNavOpen] = useState(false);
  const go = (k) => { onNav(k); setNavOpen(false); };
  const roleLabel = isAdmin ? t.admin : isTeacher ? t.teacher : currentUser.role === "student" ? t.student : t.parent;
  return (
    <div style={S.app}>
      {notif && <div style={{ ...S.notif, background: "#10b981", ...(isMobile ? { top: 64, right: 12, left: 12, width: "auto" } : {}) }}>{notif}</div>}
      {isMobile && <header style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "#0f172a", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
        <button onClick={() => setNavOpen(true)} style={{ background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer", padding: "2px 6px", lineHeight: 1, flexShrink: 0 }}>☰</button>
        <div style={S.logoBox}>KPI</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.appTitle}</span>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={() => setLang("bn")} style={{ ...S.langBtn, ...(lang === "bn" ? S.langOn : {}), padding: "3px 7px", fontSize: 11 }}>বাং</button>
          <button onClick={() => setLang("en")} style={{ ...S.langBtn, ...(lang === "en" ? S.langOn : {}), padding: "3px 7px", fontSize: 11 }}>EN</button>
        </div>
      </header>}
      {isMobile && navOpen && <div onClick={() => setNavOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />}
      <aside style={isMobile ? { ...S.sidebar, position: "fixed", top: 0, bottom: 0, left: navOpen ? 0 : -260, width: 250, zIndex: 300, transition: "left .25s ease", height: "100%", overflowY: "auto" } : S.sidebar}>
        <div style={S.sidebarTop}><div style={S.logoBox}>KPI</div><div style={S.logoText}>{t.appTitle}</div></div>
        <div style={S.langRow}>
          <button onClick={() => setLang("bn")} style={{ ...S.langBtn, ...(lang === "bn" ? S.langOn : {}) }}>বাং</button>
          <button onClick={() => setLang("en")} style={{ ...S.langBtn, ...(lang === "en" ? S.langOn : {}) }}>EN</button>
        </div>
        <nav style={S.nav}>{navItems.map(item => (<button key={item.key} onClick={() => go(item.key)} style={{ ...S.navBtn, ...(activeTab === item.key ? S.navBtnOn : {}) }}><span>{item.icon}</span><span>{item.label}</span></button>))}</nav>
        <div style={S.sidebarFoot}>
          <div style={S.userRow}>
            <div style={S.ava}>{(currentUser.name || "A")[0]}</div>
            <div><div style={S.uName}>{currentUser.name}</div>
              <div style={S.uRole}>{roleLabel}</div>
              {currentUser.systemId && <div style={{ fontSize: 10, color: "#94a3b8" }}>{currentUser.systemId}</div>}
            </div>
          </div>
          <button onClick={onLogout} style={S.logoutBtn}>{t.logout}</button>
        </div>
      </aside>
      <main style={{ ...S.main, ...(isMobile ? { marginTop: 56 } : {}) }}>{children}</main>
      <style>{`*{box-sizing:border-box}body{overflow-x:hidden}@media(max-width:767px){table{font-size:12px!important}th,td{padding:6px 8px!important}}`}</style>
    </div>
  );
}

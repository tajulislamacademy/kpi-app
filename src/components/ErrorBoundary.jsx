import { Component } from "react";
import { S } from "../theme";

// Catches render/runtime errors in the page subtree so one broken page shows a
// fallback instead of blanking the whole app. Key it by route to auto-reset on
// navigation. The sidebar/nav live outside this boundary and keep working.
export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Page crashed:", error, info); }
  render() {
    if (this.state.error) {
      const bn = this.props.lang === "bn";
      return (
        <div style={S.page}>
          <div style={{ ...S.card, textAlign: "center", maxWidth: 520, margin: "40px auto" }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>⚠️</div>
            <h2 style={{ ...S.ct, marginBottom: 8 }}>{bn ? "কিছু একটা ভুল হয়েছে" : "Something went wrong"}</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>{bn ? "এই পৃষ্ঠাটি দেখাতে সমস্যা হয়েছে। পুনরায় লোড করুন বা অন্য পৃষ্ঠায় যান।" : "This page failed to render. Reload, or switch to another page."}</p>
            <pre style={{ fontSize: 11, color: "#991b1b", background: "#fee2e2", padding: "10px 12px", borderRadius: 8, textAlign: "left", overflow: "auto", marginBottom: 16 }}>{String(this.state.error?.message || this.state.error)}</pre>
            <button onClick={() => window.location.reload()} style={S.saveBtn}>{bn ? "পুনরায় লোড" : "Reload"}</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

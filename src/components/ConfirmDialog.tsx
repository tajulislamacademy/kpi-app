import { S } from "../theme";
import { Modal } from "./Modal";
import type { Lang } from "../types";

interface Props { lang: Lang; name: string; onConfirm: () => void; onCancel: () => void; }

export function ConfirmDialog({ lang, name, onConfirm, onCancel }: Props) {
  return (
    <Modal maxWidth={360} style={{ textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
      <h3 style={{ ...S.ct, marginBottom: 8 }}>{lang === "bn" ? "নিশ্চিত করুন?" : "Confirm Delete?"}</h3>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>{lang === "bn" ? (`"${name}" মুছে ফেলবেন?`) : (`Delete "${name}"?`)}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={onConfirm} style={{ padding: "9px 24px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>{lang === "bn" ? "হ্যাঁ, মুছুন" : "Yes, Delete"}</button>
        <button onClick={onCancel} style={S.cancelBtn}>{lang === "bn" ? "না" : "Cancel"}</button>
      </div>
    </Modal>
  );
}

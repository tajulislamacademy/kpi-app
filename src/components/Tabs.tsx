import type { CSSProperties, ReactNode } from "react";
import { S } from "../theme";

interface TabItem { key: string; label: ReactNode; show?: boolean; }
interface Props { items: TabItem[]; active: string; onChange: (key: string) => void; style?: CSSProperties; }

// Pill tab row. items: [{key,label}]. onChange(key) handles selection.
export function Tabs({ items, active, onChange, style }: Props) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", ...style }}>
      {items.map((it) => (
        <button key={it.key} onClick={() => onChange(it.key)} style={{ ...S.reportTab, ...(active === it.key ? S.reportTabOn : {}) }}>{it.label}</button>
      ))}
    </div>
  );
}

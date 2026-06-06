import type { ReactNode } from "react";
import { S } from "../theme";

interface Props { icon: ReactNode; value: ReactNode; label: ReactNode; }

export function StatCard({ icon, value, label }: Props) {
  return (
    <div style={{ ...S.statCard, border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
    </div>
  );
}

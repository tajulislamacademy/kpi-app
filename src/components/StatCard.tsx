import type { ReactNode } from "react";
import { S } from "../theme";

interface Props { icon: ReactNode; value: ReactNode; label: ReactNode; }

export function StatCard({ icon, value, label }: Props) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{label}</div>
    </div>
  );
}

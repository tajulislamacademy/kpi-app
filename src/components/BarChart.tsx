interface BarDatum { label: string; val: number; }
interface Props { data: BarDatum[]; cm: number; }

export function BarChart({ data, cm }: Props) {
  const maxVal = Math.max(...data.map((d) => d.val), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, padding: "8px 0" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 10, color: "#0f172a", fontWeight: 700 }}>{d.val || ""}</div>
          <div style={{ width: "100%", background: i === cm ? "#0f172a" : "#e2e8f0", borderRadius: "4px 4px 0 0", height: `${Math.max((d.val / maxVal) * 90, d.val > 0 ? 8 : 2)}px` }} />
          <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

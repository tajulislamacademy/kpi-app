import { S } from "../theme";
import type { Dict, Lang, Student } from "../types";

type RankRow = Student & { kpi: number };
interface Props { title: string; list: RankRow[]; lang: Lang; t: Dict; }

export function RankCard({ title, list, lang, t }: Props) {
  return (
    <div style={S.card}>
      <h3 style={S.ct}>{title}</h3>
      {list.map((s, i) => (
        <div key={s.id} style={S.rankRow}>
          <div style={{ ...S.rankBadge, background: i === 0 ? "#0f172a" : i === 1 ? "#52525b" : i === 2 ? "#a1a1aa" : "var(--muted)", color: i < 3 ? "#fff" : "var(--muted-foreground)" }}>{i + 1}</div>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{lang === "bn" ? s.name : s.nameEn}</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{t.class} {s.class}{s.section}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{s.kpi}</div>
        </div>
      ))}
    </div>
  );
}

import { S } from "../theme";
import { T } from "../i18n";
import { MONTHS } from "../constants";

// Toggleable 12-month grid. value = array of active month indexes; onToggle(i).
export function MonthsPicker({ lang, value, onToggle, style }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, ...style }}>
      {MONTHS.map((m, i) => (
        <button key={m} onClick={() => onToggle(i)} style={{ ...S.mBtn, ...(value.includes(i) ? S.mOn : {}) }}>{T[lang][m].slice(0, 3)}</button>
      ))}
    </div>
  );
}

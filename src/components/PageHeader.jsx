import { S } from "../theme";

// Page title row: title + optional subtitle, with an optional action button.
export function PageHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <div style={S.ph}>
      <div><h2 style={S.pt}>{title}</h2>{subtitle != null && subtitle !== "" && <p style={S.ps}>{subtitle}</p>}</div>
      {actionLabel && <button onClick={onAction} style={S.addBtn}>{actionLabel}</button>}
    </div>
  );
}

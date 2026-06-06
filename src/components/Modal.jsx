import { S } from "../theme";

// Centered modal: backdrop + box. Content passed as children.
export function Modal({ maxWidth, style, children }) {
  return (
    <div style={S.modalBg}>
      <div style={{ ...S.modalBox, ...(maxWidth ? { maxWidth } : {}), ...style }}>{children}</div>
    </div>
  );
}

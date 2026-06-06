import type { CSSProperties, ReactNode } from "react";
import { S } from "../theme";

interface Props { maxWidth?: number; style?: CSSProperties; children: ReactNode; }

// Centered modal: backdrop + box. Content passed as children.
export function Modal({ maxWidth, style, children }: Props) {
  return (
    <div style={S.modalBg}>
      <div style={{ ...S.modalBox, ...(maxWidth ? { maxWidth } : {}), ...style }}>{children}</div>
    </div>
  );
}

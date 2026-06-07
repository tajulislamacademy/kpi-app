import { useState, useEffect } from "react";

// True when the viewport is below the mobile breakpoint (768px); updates on resize.
export function useIsMobile(): boolean {
  const [m, setM] = useState<boolean>(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

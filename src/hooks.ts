import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, init: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : init; } catch { return init; }
  });
  const set = (v: T | ((prev: T) => T)) => {
    setVal((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore quota/serialization errors */ }
      return next;
    });
  };
  return [val, set];
}

export function useIsMobile(): boolean {
  const [m, setM] = useState<boolean>(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// Term configuration — single-row Supabase table (which month indexes belong to
// each of the 4 terms). Read = any authenticated user; write = admin (RLS).
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

export const DEFAULT_TERMS = { term1: [0, 1, 2], term2: [3, 4, 5], term3: [6, 7, 8], term4: [9, 10, 11] };

export async function getTermConfig() {
  const { data, error } = await supabase.from("term_config").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_TERMS;
  return {
    term1: data.term1 || [],
    term2: data.term2 || [],
    term3: data.term3 || [],
    term4: data.term4 || [],
  };
}

export async function updateTermConfig(cfg) {
  const { error } = await supabase
    .from("term_config")
    .update({ term1: cfg.term1, term2: cfg.term2, term3: cfg.term3, term4: cfg.term4 })
    .eq("id", 1);
  if (error) throw error;
}

export function useDbTermConfig(enabled = true) {
  const [termConfig, setTermConfig] = useState(DEFAULT_TERMS);
  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      setTermConfig(await getTermConfig());
    } catch {
      // keep defaults on failure (e.g. logged out)
    }
  }, [enabled]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);
  return { termConfig, reload };
}

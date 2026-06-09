import { useEffect, useSyncExternalStore } from "react";

// A keyed, process-shared, stale-while-revalidate cache for one resource type.
// Every component calling the same hook shares a single fetch + cached value, so
// switching tabs renders instantly from cache instead of refetching from blank.
// A mount revalidates only if the cached value is older than STALE_MS; reload()
// (called after mutations) always refetches and notifies every subscriber.
const STALE_MS = 15000;

interface CacheState<T> { data: T; loading: boolean; error: string | null; loaded: boolean; fetchedAt: number; }
interface Store<T> { state: CacheState<T>; listeners: Set<() => void>; inflight: Promise<void> | null; }

// Every cache registers a reset; clearAllCaches() empties them on auth change so
// one user's cached rows can never be shown to the next user in the same session.
const allResets: (() => void)[] = [];
export function clearAllCaches() { allResets.forEach((r) => r()); }

export function makeCache<T>(initial: T) {
  const stores = new Map<string, Store<T>>();
  const store = (key: string): Store<T> => {
    let s = stores.get(key);
    if (!s) { s = { state: { data: initial, loading: false, error: null, loaded: false, fetchedAt: 0 }, listeners: new Set(), inflight: null }; stores.set(key, s); }
    return s;
  };
  const emit = (s: Store<T>) => s.listeners.forEach((l) => l());

  allResets.push(() => {
    stores.forEach((s) => { s.state = { data: initial, loading: false, error: null, loaded: false, fetchedAt: 0 }; s.inflight = null; emit(s); });
  });

  function load(key: string, fetcher: () => Promise<T>): Promise<void> {
    const s = store(key);
    if (s.inflight) return s.inflight; // dedupe concurrent loads
    s.state = { ...s.state, loading: true, error: null };
    emit(s);
    s.inflight = fetcher()
      .then((data) => { s.state = { data, loading: false, error: null, loaded: true, fetchedAt: Date.now() }; })
      .catch((e) => { s.state = { ...s.state, loading: false, error: e instanceof Error ? e.message : String(e) }; })
      .finally(() => { s.inflight = null; emit(s); });
    return s.inflight;
  }

  function useCache(key: string, fetcher: () => Promise<T>, enabled: boolean) {
    const s = store(key);
    const state = useSyncExternalStore(
      (cb) => { s.listeners.add(cb); return () => s.listeners.delete(cb); },
      () => s.state,
      () => s.state,
    );
    useEffect(() => {
      if (!enabled) return;
      const cur = store(key).state;
      if (cur.loaded && Date.now() - cur.fetchedAt < STALE_MS) return; // fresh enough → serve cache, skip refetch
      load(key, fetcher);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, enabled]);
    const reload = () => load(key, fetcher);
    return { data: state.data, loading: state.loading, error: state.error, reload };
  }

  return { useCache };
}

// OWNER: Dev B
// useStore — the one React binding for the localStorage-backed stores.
// Any component reading from localStore/contracts calls useStoreValue() so a
// write anywhere in the app re-renders it, without a global state library.

import { useSyncExternalStore, useCallback, useEffect, useState } from 'react';
import { subscribeToStoreChange, getStoreVersion } from '@/lib/localStore';

/** Re-renders whenever anything in either store changes. */
export function useStoreVersion(): number {
  return useSyncExternalStore(subscribeToStoreChange, getStoreVersion, getStoreVersion);
}

/**
 * Reads a derived value from the stores and recomputes it on every store
 * change. `read` must be cheap and pure — these stores are small.
 */
export function useStoreValue<T>(read: () => T): T {
  const version = useStoreVersion();
  const [value, setValue] = useState<T>(read);
  const stable = useCallback(read, [read]);
  useEffect(() => { setValue(stable()); }, [version, stable]);
  return value;
}

/** A ticking clock for age/SLA displays. Interval in ms; default 30 s. */
export function useTick(intervalMs = 30_000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

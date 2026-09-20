// OWNER: Dev B
// useStore — the one React binding for the localStorage-backed stores.
// Any component reading from localStore/contracts calls useStoreValue() so a
// write anywhere in the app re-renders it, without a global state library.

import { useSyncExternalStore, useEffect, useState } from 'react';
import { subscribeToStoreChange, getStoreVersion } from '@/lib/localStore';

/** Re-renders whenever anything in either store changes. */
export function useStoreVersion(): number {
  return useSyncExternalStore(subscribeToStoreChange, getStoreVersion, getStoreVersion);
}

/**
 * Reads a derived value from the stores. `read` runs during render and must
 * be cheap and pure — these stores are small and every reader here is a
 * synchronous transform over a few hundred objects.
 *
 * Deliberately NOT cached in state: callers pass inline arrows, so any
 * identity-keyed memo or effect would invalidate on every render. Reading
 * straight through keeps this correct by construction. The returned value is
 * a fresh object each render, so never put it in another hook's dependency
 * array — derive with useMemo from its contents instead.
 */
export function useStoreValue<T>(read: () => T): T {
  useStoreVersion();
  return read();
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

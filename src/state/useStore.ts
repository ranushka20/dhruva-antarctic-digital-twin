// OWNER: Dev B
// useStore — the one React binding for the localStorage-backed stores.
// Any component reading from localStore/contracts calls useStoreValue() so a
// write anywhere in the app re-renders it, without a global state library.

import { useSyncExternalStore, useEffect, useState, useRef } from 'react';
import { subscribeToStoreChange, getStoreVersion } from '@/lib/localStore';

/** Re-renders whenever anything in either store changes. */
export function useStoreVersion(): number {
  return useSyncExternalStore(subscribeToStoreChange, getStoreVersion, getStoreVersion);
}

function isEqual(a: unknown, b: unknown, depth = 0): boolean {
  if (Object.is(a, b)) return true;
  if (depth > 20) return false;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i], depth + 1)) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], depth + 1)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Reads a derived value from the stores and recomputes it on store change.
 * Subscribes to store changes via `useStoreVersion()` (which returns a primitive version number)
 * and preserves referential stability via deep comparison so selectors returning new objects/arrays
 * do not trigger infinite forceStoreRerender loops in React 19.
 */
export function useStoreValue<T>(read: () => T): T {
  useStoreVersion();
  const nextValue = read();
  const ref = useRef<T>(nextValue);

  if (ref.current !== nextValue && isEqual(ref.current, nextValue)) {
    return ref.current;
  }

  ref.current = nextValue;
  return nextValue;
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

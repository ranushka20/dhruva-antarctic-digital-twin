// OWNER: Dev B
// localStore — the thin localStorage wrapper that simulates two independent
// stores: "station" (the station edge, standing in for local SQLite) and
// "hq" (persistent HQ state). This is NOT a placeholder waiting on a backend;
// for this frontend-only build it IS the persistence layer (CLAUDE.md §7.3).
//
// Key format matches src/shared/contracts.ts exactly so both modules read and
// write the same buckets: `antarasetu:<namespace>:<bucket>`.

import { subscribeToStore as subscribeToContractStore } from '@/shared/contracts';

export type StoreNamespace = 'station' | 'hq';

const LS_PREFIX = 'antarasetu';

export function storeKey(namespace: StoreNamespace, bucket: string): string {
  return `${LS_PREFIX}:${namespace}:${bucket}`;
}

// ---- change bus -------------------------------------------------------------
// One bus for both this module's writes and the contract file's writes, so a
// single React hook can subscribe to everything (see src/state/useStore.ts).

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

export function emitStoreChange(): void {
  version += 1;
  listeners.forEach((l) => l());
}

export function subscribeToStoreChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getStoreVersion(): number {
  return version;
}

// Bridge: anything the contract file writes (action transitions, resource
// decrements, outbox drains) bumps this bus too.
subscribeToContractStore(() => {
  version += 1;
  listeners.forEach((l) => l());
});

// ---- durable read / write ---------------------------------------------------

export function readStore<T>(namespace: StoreNamespace, bucket: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storeKey(namespace, bucket));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Durable BEFORE the UI confirms (NFR-6.2). Callers must await/observe the
 * return value rather than optimistically rendering and writing afterwards.
 */
export function writeStore<T>(namespace: StoreNamespace, bucket: string, value: T): boolean {
  try {
    localStorage.setItem(storeKey(namespace, bucket), JSON.stringify(value));
    emitStoreChange();
    return true;
  } catch (err) {
    console.error('[localStore] write failed — storage full or unavailable', err);
    return false;
  }
}

export function updateStore<T>(
  namespace: StoreNamespace,
  bucket: string,
  fallback: T,
  mutate: (current: T) => T
): T {
  const next = mutate(readStore(namespace, bucket, fallback));
  writeStore(namespace, bucket, next);
  return next;
}

export function clearNamespace(namespace: StoreNamespace): void {
  const prefix = `${LS_PREFIX}:${namespace}:`;
  const doomed: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) doomed.push(k);
  }
  doomed.forEach((k) => localStorage.removeItem(k));
  emitStoreChange();
}

/** Client-generated UUID — the dedupe key for every synced record (NFR-6.3). */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

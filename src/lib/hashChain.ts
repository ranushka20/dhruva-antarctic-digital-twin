// OWNER: Dev B
// hashChain — the tamper-evident audit chain (SHA-256).
//
// This is a REAL implementation, not a simulation: it needs no server. Every
// state transition in the app appends {prevHash, payload, actor, timestamp,
// hash} here, and verify() recomputes every hash client-side (NFR-G4).
//
// Vocabulary rule (FR-5.8 / acceptance criteria): this is a "tamper-evident
// hash chain (SHA-256)". The other word must not appear in the UI, the code
// or any export — it is tamper-evident, not non-repudiable, and we say so.

import {
  type AuditEntry,
  type AuditPayload,
  GENESIS_HASH,
  canonicalJSON,
  sha256Hex,
  computeEntryHash,
} from '@/shared/contracts';
import { readStore, writeStore, type StoreNamespace } from '@/lib/localStore';

/**
 * What we actually persist. AuditEntry carries only a payloadSummary, which is
 * a display field — recomputing a hash needs the full payload, so it lives
 * here alongside. Station edge and HQ serialise identically (canonicalJSON),
 * or offline-written entries would fail verification after sync.
 */
export interface ChainEntry extends AuditEntry {
  payload: Record<string, unknown>;
}

const BUCKET = 'auditChain';

export function getChain(namespace: StoreNamespace = 'hq'): ChainEntry[] {
  return readStore<ChainEntry[]>(namespace, BUCKET, []);
}

function putChain(namespace: StoreNamespace, chain: ChainEntry[]): void {
  writeStore(namespace, BUCKET, chain);
}

export interface AppendInput {
  actor: string;
  actorRole: string;
  objectType: string;
  objectId: string;
  transition: string;
  payload: Record<string, unknown>;
  payloadSummary?: string;
  /** Station-stamped time, when the entry originated at the station edge. */
  atStation?: string;
  writtenOffline?: boolean;
}

function summarise(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    parts.push(k + '=' + (s.length > 48 ? s.slice(0, 45) + '...' : s));
    if (parts.length >= 4) break;
  }
  return parts.join(' · ') || 'no payload';
}

/** Appends one entry and returns it. The single write path for the chain. */
export async function appendAudit(
  input: AppendInput,
  namespace: StoreNamespace = 'hq'
): Promise<ChainEntry> {
  const chain = getChain(namespace);
  const prev = chain[chain.length - 1];
  const prevHash = prev ? prev.hash : GENESIS_HASH;
  const seq = prev ? prev.seq + 1 : 0;
  const at = new Date().toISOString();

  const payloadForHash: AuditPayload = {
    seq,
    at,
    atStation: input.atStation,
    actor: input.actor,
    actorRole: input.actorRole,
    objectType: input.objectType,
    objectId: input.objectId,
    transition: input.transition,
    payload: input.payload,
  };

  const hash = await computeEntryHash(prevHash, payloadForHash);

  const entry: ChainEntry = {
    seq,
    at,
    atStation: input.atStation,
    actor: input.actor,
    actorRole: input.actorRole,
    objectType: input.objectType,
    objectId: input.objectId,
    transition: input.transition,
    payloadSummary: input.payloadSummary ?? summarise(input.payload),
    hash,
    prevHash,
    writtenOffline: input.writtenOffline ?? namespace === 'station',
    superseded: false,
    payload: input.payload,
  };

  chain.push(entry);
  putChain(namespace, chain);
  return entry;
}

// ---- Verification -----------------------------------------------------------

export interface FullVerifyResult {
  ok: boolean;
  verified: number;
  brokenAt?: number;
  reason?: 'link' | 'hash';
  durationMs: number;
}

/**
 * Recomputes every hash. Chunked so a long chain never blocks the UI thread
 * (NFR-7.1) — control returns to the browser between chunks rather than after
 * the whole pass.
 */
export async function verifyFullChain(
  namespace: StoreNamespace = 'hq',
  chunkSize = 200
): Promise<FullVerifyResult> {
  const started = performance.now();
  const chain = getChain(namespace);

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    const expectedPrev = i === 0 ? GENESIS_HASH : chain[i - 1].hash;
    if (entry.prevHash !== expectedPrev) {
      return { ok: false, verified: i, brokenAt: i, reason: 'link', durationMs: performance.now() - started };
    }
    const recomputed = await computeEntryHash(entry.prevHash, {
      seq: entry.seq,
      at: entry.at,
      atStation: entry.atStation,
      actor: entry.actor,
      actorRole: entry.actorRole,
      objectType: entry.objectType,
      objectId: entry.objectId,
      transition: entry.transition,
      payload: entry.payload ?? {},
    });
    if (recomputed !== entry.hash) {
      return { ok: false, verified: i, brokenAt: i, reason: 'hash', durationMs: performance.now() - started };
    }
    if (i > 0 && i % chunkSize === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return { ok: true, verified: chain.length, durationMs: performance.now() - started };
}

/** Cached verdict so the app-wide banner does not re-verify on every render. */
const STATUS_BUCKET = 'auditChainStatus';

export interface ChainStatus {
  ok: boolean;
  verified: number;
  brokenAt?: number;
  checkedAt: string;
  durationMs: number;
}

export function getChainStatus(namespace: StoreNamespace = 'hq'): ChainStatus | null {
  return readStore<ChainStatus | null>(namespace, STATUS_BUCKET, null);
}

export async function refreshChainStatus(namespace: StoreNamespace = 'hq'): Promise<ChainStatus> {
  const result = await verifyFullChain(namespace);
  const status: ChainStatus = {
    ok: result.ok,
    verified: result.verified,
    brokenAt: result.brokenAt,
    checkedAt: new Date().toISOString(),
    durationMs: Math.round(result.durationMs),
  };
  writeStore(namespace, STATUS_BUCKET, status);
  return status;
}

// ---- Reconciliation ---------------------------------------------------------

/**
 * Marks an entry superseded rather than deleting it (FR-4.4 / FR-5.6). The
 * log's whole value is that nothing disappears, so superseding is a flag —
 * the hash and its position are untouched.
 */
export function markSuperseded(seq: number, namespace: StoreNamespace = 'hq'): void {
  const chain = getChain(namespace);
  const entry = chain.find((e) => e.seq === seq);
  if (!entry) return;
  entry.superseded = true;
  putChain(namespace, chain);
}

/**
 * Folds station-written entries into the HQ chain after a drain (NFR-6.4).
 * Each entry is re-hashed against its new predecessor — the station-stamped
 * time is preserved as `atStation`, which is what ordering uses.
 */
export async function mergeIntoHqChain(stationEntries: ChainEntry[]): Promise<number> {
  let merged = 0;
  for (const e of stationEntries) {
    await appendAudit(
      {
        actor: e.actor,
        actorRole: e.actorRole,
        objectType: e.objectType,
        objectId: e.objectId,
        transition: e.transition,
        payload: e.payload ?? {},
        payloadSummary: e.payloadSummary,
        atStation: e.atStation ?? e.at,
        writtenOffline: true,
      },
      'hq'
    );
    merged += 1;
  }
  return merged;
}

// ---- Export & demo affordance ----------------------------------------------

/** FR-5.7 — the log as JSON with hashes, for independent verification. */
export function exportChainJSON(namespace: StoreNamespace = 'hq'): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      mechanism: 'tamper-evident hash chain (SHA-256)',
      note:
        'Tamper-evident, not non-repudiable: this chain proves records have not been ' +
        'altered since they were written. It carries no digital signature and does not ' +
        'prove who wrote them beyond the recorded actor.',
      genesisPrevHash: GENESIS_HASH,
      canonicalisation: 'keys sorted, no whitespace, UTF-8',
      entries: getChain(namespace),
    },
    null,
    2
  );
}

/**
 * Demo affordance for FR-5.3 / the acceptance criterion "verify on a tampered
 * entry reports the exact index". Edits a payload in place WITHOUT updating
 * the hash, which is precisely what the verifier is built to catch.
 */
export function tamperWithEntryForDemo(seq: number, namespace: StoreNamespace = 'hq'): boolean {
  const chain = getChain(namespace);
  const entry = chain.find((e) => e.seq === seq);
  if (!entry) return false;
  entry.payload = { ...(entry.payload ?? {}), _edited: 'value altered outside the chain' };
  entry.payloadSummary = entry.payloadSummary + ' · EDITED';
  putChain(namespace, chain);
  return true;
}

/** Truncated hash for table cells: first 8 and last 4 hex characters. */
export function shortHash(hash: string): string {
  if (!hash || hash.length < 16) return hash || '—';
  return hash.slice(0, 8) + '…' + hash.slice(-4);
}

export { GENESIS_HASH, canonicalJSON, sha256Hex };

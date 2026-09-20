// OWNER: Dev B
// sync — the offline outbox and the drain simulation.
//
// This module is the Antarctic-specific part of the product: the station
// keeps working with no link, records queue locally, and on reconnect they
// transfer in strict tier order. Both stores are client-side in this build,
// but the tier check is enforced here AND in the station-side UI as two
// independent checks (NFR-6.6), so the logic mirrors a real client/server
// split rather than collapsing into one.

import {
  type SyncRecord, type Tier, type Conflict, type Action,
  GENESIS_HASH, canonicalJSON, sha256Hex,
} from '@/shared/contracts';
import { readStore, writeStore, uuid } from '@/lib/localStore';
import { appendAudit, getChain, mergeIntoHqChain, markSuperseded, type ChainEntry } from '@/lib/hashChain';
import { getParamValue } from '@/state/params';
import {
  getConnectivity, recordSuccessfulSync, getLinkSegments,
  type StationId,
} from '@/state/connectivity';
import {
  getOutbox, putOutbox, getReceivedRecords, putReceivedRecords,
  putAction, getAction, TIERS,
} from '@/state/data';
import { currentActor } from '@/state/auth';

const TIER_RANK: Record<Tier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };

// ---------------------------------------------------------------------------
// Enqueue — the station's only write path
// ---------------------------------------------------------------------------

export interface EnqueueInput {
  stationId: StationId;
  tier: Tier;
  type: SyncRecord['type'];
  payloadRef: string;
  sizeBytes?: number;
  createdAtStation?: string;
}

/**
 * FR-6.5: write to the local store, append to the local chain, enqueue at the
 * record's tier — in that order — then confirm. Durable before confirmed
 * (NFR-6.2), never the reverse.
 */
export async function enqueueLocalRecord(input: EnqueueInput): Promise<{ record: SyncRecord; queuePosition: number }> {
  const outbox = getOutbox();
  const prevHash = outbox.length ? outbox[outbox.length - 1].hash : GENESIS_HASH;
  const createdAtStation = input.createdAtStation ?? new Date().toISOString();

  const bare = {
    id: uuid(),
    stationId: input.stationId,
    tier: input.tier,
    type: input.type,
    payloadRef: input.payloadRef,
    sizeBytes: input.sizeBytes ?? 1024,
    createdAtStation,
    enqueuedAt: new Date().toISOString(),
  };

  const hash = await sha256Hex(prevHash + canonicalJSON(bare as unknown as Record<string, unknown>));
  const record: SyncRecord = { ...bare, state: 'QUEUED', attempts: 0, hash, prevHash };

  outbox.push(record);
  putOutbox(outbox);

  return { record, queuePosition: queuePositionOf(record.id) };
}

/** Where this record sits in the actual transfer order, not insertion order. */
export function queuePositionOf(recordId: string): number {
  const ordered = drainOrder();
  const index = ordered.findIndex((r) => r.id === recordId);
  return index === -1 ? ordered.length : index + 1;
}

/** FR-2.3 — the next N records in exact transfer order. */
export function drainOrder(): SyncRecord[] {
  return getOutbox()
    .filter((r) => r.state === 'QUEUED' || r.state === 'FAILED' || r.state === 'TRANSFERRING')
    .sort((a, b) => {
      const tier = TIER_RANK[a.tier] - TIER_RANK[b.tier];
      if (tier !== 0) return tier;
      return Date.parse(a.createdAtStation) - Date.parse(b.createdAtStation);
    });
}

/** FR-8.3: promotion carries a reason and is recorded. Demotion is refused. */
export async function promoteRecord(recordId: string, toTier: Tier, reason: string): Promise<SyncRecord> {
  const outbox = getOutbox();
  const record = outbox.find((r) => r.id === recordId);
  if (!record) throw new Error('No queued record ' + recordId);
  if (TIER_RANK[toTier] >= TIER_RANK[record.tier]) {
    throw new Error('Demotion is not permitted — a record may only be promoted to a higher tier.');
  }
  if (!reason.trim()) throw new Error('Promotion requires a reason.');

  record.promotedFrom = record.tier;
  record.promotionReason = reason;
  record.tier = toTier;
  putOutbox(outbox);

  const actor = currentActor();
  await appendAudit(
    {
      actor: actor.name, actorRole: actor.role,
      objectType: 'sync_record', objectId: record.id,
      transition: 'PROMOTED',
      payload: { from: record.promotedFrom, to: toTier, reason },
      atStation: record.createdAtStation,
    },
    'station'
  );
  return record;
}

/** FR-8.1 — untransferred records may be removed by the operator. */
export function removeQueuedRecord(recordId: string): void {
  const outbox = getOutbox();
  const record = outbox.find((r) => r.id === recordId);
  if (!record) return;
  if (record.state === 'SENT' || record.state === 'TRANSFERRING') {
    throw new Error('A record that has started transferring cannot be removed.');
  }
  putOutbox(outbox.filter((r) => r.id !== recordId));
}

export function outboxTotalBytes(stationId?: StationId): number {
  return getOutbox()
    .filter((r) => (!stationId || r.stationId === stationId) && r.state !== 'SENT')
    .reduce((sum, r) => sum + r.sizeBytes, 0);
}

/** Both SYNTH and labelled: we do not know NCPOR's real link budget. */
export function estimatedSecondsToClear(stationId?: StationId): number {
  const kbps = getParamValue<number>('sync.throughputKbps');
  const bytes = outboxTotalBytes(stationId);
  return Math.round((bytes * 8) / (kbps * 1000));
}

// ---------------------------------------------------------------------------
// Drain
// ---------------------------------------------------------------------------

export interface DrainState {
  running: boolean;
  stationId: StationId | null;
  tier: Tier | null;
  transferringId: string | null;
  transferredBytes: number;
  batchSize: number;
  sentThisRun: number;
  status: string;
  startedAt: string | null;
}

const IDLE: DrainState = {
  running: false, stationId: null, tier: null, transferringId: null,
  transferredBytes: 0, batchSize: 0, sentThisRun: 0, status: 'Idle', startedAt: null,
};

export function getDrainState(): DrainState {
  return readStore<DrainState>('hq', 'drainState', IDLE);
}

function putDrainState(state: DrainState): void {
  writeStore('hq', 'drainState', state);
}

export function resetDrainState(): void {
  putDrainState(IDLE);
}

/**
 * One transfer step. Picks the lowest tier that still has anything queued,
 * takes a batch, and moves it across — deduplicating by the record's
 * client-generated UUID so an interrupted drain can be resumed without
 * duplicating anything (NFR-6.3, FR-8.4).
 */
export async function drainStep(stationId: StationId): Promise<{ sent: SyncRecord[]; done: boolean }> {
  if (getConnectivity(stationId) === 'DARK') {
    putDrainState({ ...getDrainState(), running: false, status: 'Link down', tier: null, transferringId: null });
    return { sent: [], done: true };
  }

  const batchSize = getParamValue<number>('sync.batchSize');
  const maxAttempts = getParamValue<number>('sync.maxAttempts');

  const pending = drainOrder().filter((r) => r.stationId === stationId);
  if (pending.length === 0) {
    putDrainState({ ...IDLE, status: 'Idle' });
    recordSuccessfulSync(stationId);
    return { sent: [], done: true };
  }

  // Strict tier ordering: no T2 transfers while any T1 remains. A late
  // higher-tier record pre-empts at the next batch boundary (FR-2.6).
  const tier = pending[0].tier;
  const batch = pending.filter((r) => r.tier === tier).slice(0, batchSize);

  putDrainState({
    running: true,
    stationId,
    tier,
    transferringId: batch[0]?.id ?? null,
    transferredBytes: 0,
    batchSize: batch.length,
    sentThisRun: getDrainState().sentThisRun,
    status: 'Draining ' + tier,
    startedAt: getDrainState().startedAt ?? new Date().toISOString(),
  });

  const outbox = getOutbox();
  const received = getReceivedRecords();
  const seen = new Set(received.map((r) => r.id));
  const sent: SyncRecord[] = [];

  for (const record of batch) {
    const live = outbox.find((r) => r.id === record.id);
    if (!live) continue;

    // Simulated transfer failure: a record that has already failed enough
    // times escalates rather than looping forever (FR-2.7).
    if (live.attempts >= maxAttempts) {
      live.state = 'FAILED';
      live.lastError = 'max attempts exceeded';
      await raiseSyncFailureAction(live);
      continue;
    }

    live.state = 'TRANSFERRING';
    putOutbox(outbox);

    if (seen.has(live.id)) {
      // Already at HQ from a previous, interrupted run — idempotent no-op.
      live.state = 'SENT';
      continue;
    }

    const delivered: SyncRecord = { ...live, state: 'SENT' };
    received.push(delivered);
    seen.add(delivered.id);
    live.state = 'SENT';
    sent.push(delivered);
  }

  putReceivedRecords(received);
  putOutbox(outbox.filter((r) => r.state !== 'SENT'));

  // Station-written chain entries fold into the HQ chain (NFR-6.4).
  const stationChain = getChain('station');
  const alreadyMerged = new Set(
    getChain('hq').filter((e) => e.writtenOffline).map((e) => e.objectId + '|' + e.transition + '|' + (e.atStation ?? ''))
  );
  const toMerge = stationChain.filter(
    (e: ChainEntry) => !alreadyMerged.has(e.objectId + '|' + e.transition + '|' + (e.atStation ?? e.at))
  );
  if (toMerge.length) await mergeIntoHqChain(toMerge);

  const state = getDrainState();
  putDrainState({
    ...state,
    sentThisRun: state.sentThisRun + sent.length,
    transferringId: null,
    transferredBytes: state.transferredBytes + sent.reduce((s, r) => s + r.sizeBytes, 0),
  });

  recordSuccessfulSync(stationId);
  const done = drainOrder().filter((r) => r.stationId === stationId).length === 0;
  if (done) putDrainState({ ...IDLE, status: 'Idle', sentThisRun: getDrainState().sentThisRun });
  return { sent, done };
}

/** Runs batches until the queue clears or the link drops. Resumable. */
export async function drainAll(stationId: StationId, onBatch?: (sent: SyncRecord[]) => void): Promise<number> {
  let total = 0;
  for (let guard = 0; guard < 200; guard++) {
    const { sent, done } = await drainStep(stationId);
    total += sent.length;
    onBatch?.(sent);
    if (done) break;
    await new Promise((r) => setTimeout(r, 420)); // visible progress, not a spinner
  }
  return total;
}

async function raiseSyncFailureAction(record: SyncRecord): Promise<void> {
  const id = 'act-sync-' + record.id.slice(0, 8);
  if (getAction(id)) return;
  const actor = currentActor();
  const action: Action = {
    id,
    stationId: record.stationId,
    tier: 'T2',
    title: 'Sync failure — ' + record.payloadRef,
    reason: 'Transfer exceeded the configured maximum attempts and was escalated automatically.',
    state: 'RAISED',
    trigger: {
      metricName: 'Outbox attempts',
      measurement: {
        value: record.attempts, unit: 'attempts',
        timestamp: new Date().toISOString(), source: 'sync simulation',
        provenance: 'SYNTH', awaiting: 'real transfer telemetry', freshnessSeconds: 0,
      },
      threshold: { value: getParamValue<number>('sync.maxAttempts'), unit: 'attempts', label: 'max attempts' },
    },
    evidence: [],
    timeline: [],
    sla: { targetSeconds: 0, elapsedSeconds: 0, pausedSeconds: 0, breached: false },
    raisedAt: new Date().toISOString(),
    ageSeconds: 0,
  };
  putAction(action);
  await appendAudit({
    actor: actor.name, actorRole: actor.role,
    objectType: 'action', objectId: id,
    transition: 'RAISED', payload: { cause: 'sync failure', recordId: record.id },
  });
}

// ---------------------------------------------------------------------------
// "What we missed" — reconstruction after a gap closes
// ---------------------------------------------------------------------------

export interface MissedEntry {
  recordId: string;
  stationTime: string;
  hqReceiptTime: string;
  tier: Tier;
  type: SyncRecord['type'];
  summary: string;
  reconciled: boolean;
}

export interface MissedWindow {
  fromMs: number;
  toMs: number;
  durationSeconds: number;
  entries: MissedEntry[];
  /**
   * True ONLY for a closed gap that recovered no records: the station was
   * quiet. Different from "we have no data", and different again from a gap
   * still in progress — see `stillOpen`.
   */
  stationReportedNothing: boolean;
  /** The gap has not closed yet, so nothing can have reached HQ from it. */
  stillOpen: boolean;
  cause?: string;
}

/**
 * FR-3.1–3.4. Rebuilds the station's event log for each dark window from the
 * records that have since drained, in STATION-timestamp order. A window with
 * no records says so explicitly — "the station reported nothing in this
 * window" is a different claim from "we have no data", and the difference
 * matters to an operator.
 */
export function reconstructMissedLog(stationId: StationId, windowHours = 168): MissedWindow[] {
  const darkSegments = getLinkSegments(stationId, windowHours).filter((s) => s.state !== 'LIVE');
  const received = getReceivedRecords().filter((r) => r.stationId === stationId);

  return darkSegments.map((segment) => {
    const entries = received
      .filter((r) => {
        const t = Date.parse(r.createdAtStation);
        return t >= segment.fromMs && t <= segment.toMs;
      })
      .sort((a, b) => Date.parse(a.createdAtStation) - Date.parse(b.createdAtStation))
      .map<MissedEntry>((r) => ({
        recordId: r.id,
        stationTime: r.createdAtStation,
        hqReceiptTime: r.enqueuedAt,
        tier: r.tier,
        type: r.type,
        summary: r.payloadRef,
        reconciled: r.state === 'SENT',
      }));

    return {
      fromMs: segment.fromMs,
      toMs: segment.toMs,
      durationSeconds: segment.durationSeconds,
      entries,
      // "The station reported nothing" is a claim about a FINISHED gap. While
      // the link is still down, the truthful statement is that nothing has
      // reached HQ yet — asserting silence would be inventing a fact.
      stationReportedNothing: entries.length === 0 && !segment.open,
      stillOpen: segment.open,
      cause: segment.cause,
    };
  });
}

export function missedSummary(windows: MissedWindow[]): {
  records: number; actions: number; faults: number; inventory: number; gapSeconds: number;
} {
  const all = windows.flatMap((w) => w.entries);
  return {
    records: all.length,
    actions: all.filter((e) => e.type === 'action').length,
    faults: all.filter((e) => e.type === 'fault').length,
    inventory: all.filter((e) => e.type === 'inventory').length,
    gapSeconds: windows.reduce((s, w) => s + w.durationSeconds, 0),
  };
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export function getConflicts(): Conflict[] {
  return readStore<Conflict[]>('hq', 'conflicts', []);
}

export function putConflicts(conflicts: Conflict[]): void {
  writeStore('hq', 'conflicts', conflicts);
}

/**
 * FR-4.3: default rule — the higher-tier actor wins; ties resolve to the
 * station, as the side closer to ground truth. The rule is stated on screen,
 * not just implemented here. FR-4.4: the losing version is preserved as
 * superseded, never deleted.
 */
export async function resolveConflict(
  objectId: string,
  resolvedAs: 'hq' | 'station',
  overrideReason?: string
): Promise<void> {
  const conflicts = getConflicts();
  const conflict = conflicts.find((c) => c.objectId === objectId);
  if (!conflict) return;

  const winner = resolvedAs === 'hq' ? conflict.hqVersion : conflict.stationVersion;
  const loser = resolvedAs === 'hq' ? conflict.stationVersion : conflict.hqVersion;

  if (conflict.objectType === 'action') {
    const action = getAction(objectId);
    if (action) {
      const fields = winner.fields as Partial<Action>;
      const merged: Action = {
        ...action,
        state: (fields.state as Action['state']) ?? action.state,
      };
      merged.timeline = [
        ...action.timeline,
        {
          state: String(loser.fields.state ?? 'superseded'),
          at: loser.at,
          by: loser.actor,
          note: 'Superseded by reconciliation — ' + (overrideReason ?? 'default rule applied'),
          hash: '', prevHash: '',
          pendingSync: false,
          superseded: true,
        },
      ];
      putAction(merged);
    }
  }

  const actor = currentActor();
  const entry = await appendAudit({
    actor: actor.name, actorRole: actor.role,
    objectType: conflict.objectType, objectId,
    transition: 'RECONCILED',
    payload: {
      resolvedAs,
      rule: overrideReason ? 'operator override' : 'higher-tier actor wins; ties to station',
      overrideReason: overrideReason ?? null,
      winner: winner.actor,
      superseded: loser.actor,
      differingFields: conflict.differingFields,
    },
  });

  // The superseded side stays in the chain, greyed rather than removed.
  const chain = getChain('hq');
  const supersededEntry = chain.find((e) => e.objectId === objectId && e.seq < entry.seq && !e.superseded);
  if (supersededEntry) markSuperseded(supersededEntry.seq);

  conflict.resolvedAs = resolvedAs;
  conflict.overrideReason = overrideReason;
  putConflicts(conflicts);
}

export { TIERS };

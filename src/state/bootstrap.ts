// OWNER: Dev B
// bootstrap — seeds the two local stores on first run and rebuilds the audit
// chain so the history the UI shows is a REAL chain: every seeded transition
// is hashed in chronological order, so /compliance can verify it and the
// tamper demo has something honest to break.

import {
  type Action, type AuditEntry, type AuditPayload,
  GENESIS_HASH, computeEntryHash,
} from '@/shared/contracts';
import { readStore, writeStore, clearNamespace } from '@/lib/localStore';
import { refreshChainStatus } from '@/lib/hashChain';
import {
  seedActions, seedInspections, seedLinkHistory, seedObligations,
  seedOutbox, seedResources, seedTimelineTransitions, seedVoyages,
  seedWasteEvents, seedWasteInventory, seedRecordLinks, seedZones, seedConflicts,
} from '@/mock/seed';
import { setLinkHistory, STATION_IDS, type StationId } from '@/state/connectivity';
import { setConnectivity } from '@/shared/contracts';

/**
 * Bump this whenever the seed's SHAPE or content changes. A browser that
 * already holds an older seed re-seeds on next load instead of rendering a
 * half-populated store — the missing bucket would otherwise show up as a
 * silently empty panel, which is exactly what NFR-G2 forbids.
 */
const SEED_VERSION = 'devb-3';

interface StoredChainEntry extends AuditEntry {
  payload: Record<string, unknown>;
}

interface HistoricalEvent {
  at: string;
  atStation?: string;
  actor: string;
  actorRole: string;
  objectType: string;
  objectId: string;
  transition: string;
  payload: Record<string, unknown>;
  payloadSummary: string;
  writtenOffline: boolean;
  /** Back-reference so the action timeline can pick up the real hash. */
  timelineRef?: { actionId: string; index: number };
}

export function isSeeded(): boolean {
  return readStore<string | null>('hq', 'seedVersion', null) === SEED_VERSION;
}

export async function ensureSeeded(): Promise<void> {
  if (isSeeded()) return;
  await reseed();
}

/** Wipes both stores and rebuilds them. The /settings "reset demo data" path. */
export async function reseed(): Promise<void> {
  const session = readStore<unknown>('hq', 'session', null);
  const params = readStore<unknown>('hq', 'params', {});

  clearNamespace('hq');
  clearNamespace('station');

  // Operator identity and parameter overrides survive a reseed — they are the
  // operator's own work, not demo data.
  if (session) writeStore('hq', 'session', session);
  writeStore('hq', 'params', params);

  // ---- Reference data ----
  writeStore('hq', 'voyages', seedVoyages());

  const resources = seedResources();
  writeStore('hq', 'resources', Object.fromEntries(resources.map((r) => [r.id, r])));

  for (const stationId of STATION_IDS) {
    writeStore('hq', 'zones:' + stationId, seedZones(stationId));
    setLinkHistory(stationId, seedLinkHistory(stationId));
  }

  writeStore('hq', 'obligations', seedObligations());
  writeStore('hq', 'wasteEvents', seedWasteEvents());
  writeStore('hq', 'wasteInventory', seedWasteInventory());
  writeStore('hq', 'inspections', seedInspections());
  writeStore('hq', 'conflicts', seedConflicts());

  // ---- Link state ----
  // Bharati is up; Maitri has been dark since 04:10 IST. Each station
  // degrades independently — that asymmetry is the point.
  setConnectivity('bharati', 'LIVE');
  setConnectivity('maitri', 'DARK');
  writeStore('hq', 'lastSyncAt:bharati', new Date(Date.now() - 4 * 60_000).toISOString());
  writeStore('hq', 'lastSyncAt:maitri', new Date(Date.now() - 31.66 * 3_600_000).toISOString());

  // ---- Station-side outbox ----
  const outbox = seedOutbox();
  writeStore('station', 'outbox', outbox);
  writeStore('hq', 'received', []);
  writeStore('hq', 'recordLinks', seedRecordLinks(outbox));

  // ---- Actions + the chain that records them ----
  const actions = seedActions();
  const events = buildHistory(actions);
  const chain = await writeChain(events, actions);

  writeStore('hq', 'actions', Object.fromEntries(actions.map((a) => [a.id, a])));
  writeStore('hq', 'auditChain', chain);

  writeStore('hq', 'seedVersion', SEED_VERSION);
  await refreshChainStatus('hq');
}

/** Every seeded transition and record submission, as one chronological list. */
function buildHistory(actions: Action[]): HistoricalEvent[] {
  const events: HistoricalEvent[] = [];
  const now = Date.now();

  for (const action of actions) {
    const steps = seedTimelineTransitions(action);
    action.timeline = [];
    steps.forEach((step, index) => {
      const at = new Date(now - step.hoursAgo * 3_600_000).toISOString();
      const offline = action.stationId === 'maitri' && step.hoursAgo < 31.7;
      action.timeline.push({
        state: step.state,
        at,
        by: step.by,
        note: step.note,
        hash: '',
        prevHash: '',
        pendingSync: offline,
      });
      events.push({
        at,
        atStation: offline ? at : undefined,
        actor: step.by,
        actorRole: step.by === 'rule engine' ? 'system' : 'hq_operator',
        objectType: 'action',
        objectId: action.id,
        transition: index === 0 ? 'RAISED' : steps[index - 1].state + ' -> ' + step.state,
        payload: { state: step.state, tier: action.tier, stationId: action.stationId, note: step.note ?? null },
        payloadSummary: index === 0 ? action.title : step.state,
        writtenOffline: offline,
        timelineRef: { actionId: action.id, index },
      });
    });
  }

  // A few non-action records so the audit log is not monotonous — these are
  // the submissions an auditor would expect to see alongside the actions.
  const record = (
    hoursAgo: number, objectType: string, objectId: string, transition: string,
    actor: string, actorRole: string, payload: Record<string, unknown>, summary: string
  ) => {
    events.push({
      at: new Date(now - hoursAgo * 3_600_000).toISOString(),
      actor, actorRole, objectType, objectId, transition, payload,
      payloadSummary: summary,
      writtenOffline: false,
    });
  };

  record(24 * 34, 'compliance_record', 'rec-wst-071', 'SUBMITTED', 'P. Sharma', 'compliance',
    { obligation: 'obl-011', period: 'July', stream: 'all' }, 'Waste return July — Bharati');
  record(24 * 34, 'compliance_record', 'rec-wst-072', 'SUBMITTED', 'S. Banerjee', 'compliance',
    { obligation: 'obl-012', period: 'July', stream: 'all' }, 'Waste return July — Maitri');
  record(24 * 30, 'inspection', 'insp-004', 'COMPLETED', 'V. Chandran', 'station_operator',
    { result: 'pass', items: 3 }, 'Living quarters fire safety — pass');
  record(24 * 21, 'inspection', 'insp-002', 'COMPLETED', 'S. Banerjee', 'compliance',
    { result: 'pass_with_findings', findings: 1 }, 'Waste compound — 1 finding');
  record(24 * 14, 'compliance_record', 'rec-inc-004', 'SUBMITTED', 'R. Nair', 'compliance',
    { obligation: 'obl-010', incident: 'fuel transfer weep' }, 'Incident report — fuel transfer weep');
  record(24 * 12, 'inspection', 'insp-001', 'COMPLETED', 'R. Nair', 'station_operator',
    { result: 'pass_with_findings', findings: 1 }, 'Fuel handling area — 1 finding');
  record(24 * 8, 'waste_event', 'wst-bharati-hazardous-m0', 'RECORDED', 'P. Sharma', 'compliance',
    { stream: 'hazardous', direction: 'generated' }, 'Hazardous stream logged — Bharati');
  record(24 * 5, 'inspection', 'insp-003', 'COMPLETED', 'D. Kulkarni', 'station_operator',
    { result: 'fail', findings: 1 }, 'Power plant — N+1 redundancy unavailable');
  record(24 * 3, 'parameter', 'logistics.transitDays', 'CHANGED', 'A. Raghavan', 'hq_operator',
    { from: 19, to: 21, reason: 'Aligned with 25/26 actual passage time' }, 'Transit days 19 -> 21');
  record(24 * 2, 'manifest', 'man-voy-2627-1-v1', 'GENERATED', 'P. Sharma', 'hq_operator',
    { voyage: 'voy-2627-1', version: 1, items: 9 }, 'Manifest v1 for Voyage 26/27-1');

  return events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** Hashes the whole history in order and back-fills each timeline row. */
async function writeChain(events: HistoricalEvent[], actions: Action[]): Promise<StoredChainEntry[]> {
  const byId = new Map(actions.map((a) => [a.id, a]));
  const chain: StoredChainEntry[] = [];
  let prevHash = GENESIS_HASH;

  for (let seq = 0; seq < events.length; seq++) {
    const event = events[seq];
    const payloadForHash: AuditPayload = {
      seq,
      at: event.at,
      atStation: event.atStation,
      actor: event.actor,
      actorRole: event.actorRole,
      objectType: event.objectType,
      objectId: event.objectId,
      transition: event.transition,
      payload: event.payload,
    };
    const hash = await computeEntryHash(prevHash, payloadForHash);

    chain.push({
      seq,
      at: event.at,
      atStation: event.atStation,
      actor: event.actor,
      actorRole: event.actorRole,
      objectType: event.objectType,
      objectId: event.objectId,
      transition: event.transition,
      payloadSummary: event.payloadSummary,
      hash,
      prevHash,
      writtenOffline: event.writtenOffline,
      superseded: false,
      payload: event.payload,
    });

    if (event.timelineRef) {
      const action = byId.get(event.timelineRef.actionId);
      const row = action?.timeline[event.timelineRef.index];
      if (row) { row.hash = hash; row.prevHash = prevHash; }
    }

    prevHash = hash;
  }

  return chain;
}

export type { StationId };

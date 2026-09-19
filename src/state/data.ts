// OWNER: Dev B
// data — the read layer every page uses.
//
// Design rule: the stores hold RAW FACTS (stock, burn rate, voyage windows,
// action state). Everything derived — autonomy, the ± band, margin, LSOD,
// risk, SLA clocks — is recomputed here on read, by the shared engine, using
// the current /settings values. That is what makes "edit a voyage window and
// every LSOD marker moves" real rather than staged (FR-5.2), and what stops
// two pages computing the same number two ways.

import {
  type Action, type InspectionRecord, type Measurement, type Obligation,
  type Resource, type StationSummary, type SyncRecord, type Tier,
  type Voyage, type WasteEvent, type Zone, type DomainState, type Risk,
  type CausalTraceInput,
  computeAutonomy, computeLSOD, computeMarginDays, computeRisk, runCausalTrace,
} from '@/shared/contracts';
import { readStore, writeStore } from '@/lib/localStore';
import { ageSeconds, daysFromNow } from '@/lib/time';
import { getEngineConfig, getParamValue, slaTargetSeconds } from '@/state/params';
import { getSyncInfo, type StationId, STATION_IDS } from '@/state/connectivity';
import { canDeriveDeadline } from '@/lib/freshness';
import { STATION_PROFILES, envSnapshot, ROSTER, type RosterMember } from '@/mock/seed';
import type { StationFilter } from '@/state/stationScope';

export type { StationFilter };
export { STATION_PROFILES, ROSTER, envSnapshot };
export type { RosterMember };

const num = (m: Measurement | undefined, fallback = 0): number =>
  m && typeof m.value === 'number' && isFinite(m.value) ? m.value : fallback;

function matchesFilter(stationId: StationId, filter: StationFilter): boolean {
  return filter === 'all' || filter === stationId;
}

// ---------------------------------------------------------------------------
// Voyages
// ---------------------------------------------------------------------------

export function getVoyages(): Voyage[] {
  return readStore<Voyage[]>('hq', 'voyages', []);
}

export function putVoyages(voyages: Voyage[]): void {
  writeStore('hq', 'voyages', voyages);
}

export function getSeasons(): string[] {
  return Array.from(new Set(getVoyages().map((v) => v.season))).sort().reverse();
}

/** The next voyage that has not sailed, within the selected season. */
export function getActiveVoyage(season?: string): Voyage | null {
  const candidates = getVoyages()
    .filter((v) => v.status === 'planned' || v.status === 'committed')
    .filter((v) => (season ? v.season === season : true))
    .sort((a, b) => Date.parse(a.departureWindow.from) - Date.parse(b.departureWindow.from));
  return candidates[0] ?? null;
}

/** The voyage after the active one — used to flag deferred-at-risk items. */
export function getFollowingVoyage(season?: string): Voyage | null {
  const candidates = getVoyages()
    .filter((v) => v.status === 'planned' || v.status === 'committed')
    .filter((v) => (season ? v.season === season : true))
    .sort((a, b) => Date.parse(a.departureWindow.from) - Date.parse(b.departureWindow.from));
  return candidates[1] ?? null;
}

export interface ShipWindowDays { earliestDay: number; latestDay: number }

/** A voyage's arrival window for a station, expressed in days from today. */
export function shipWindowDays(stationId: StationId, voyage: Voyage | null): ShipWindowDays | null {
  if (!voyage) return null;
  const arrival = voyage.arrival[stationId];
  if (!arrival) return null;
  return {
    earliestDay: daysFromNow(arrival.from),
    latestDay: daysFromNow(arrival.to),
  };
}

export function updateVoyageWindow(
  voyageId: string,
  patch: { departureWindow?: Voyage['departureWindow']; arrival?: Voyage['arrival']; capacityKg?: Voyage['capacityKg'] }
): void {
  const voyages = getVoyages();
  const v = voyages.find((x) => x.id === voyageId);
  if (!v) return;
  Object.assign(v, patch);
  putVoyages(voyages);
}

// ---------------------------------------------------------------------------
// Resources — raw facts in, engine-derived figures out
// ---------------------------------------------------------------------------

function rawResources(): Resource[] {
  const table = readStore<Record<string, Resource>>('hq', 'resources', {});
  return Object.values(table);
}

export function putResource(resource: Resource): void {
  const table = readStore<Record<string, Resource>>('hq', 'resources', {});
  table[resource.id] = resource;
  writeStore('hq', 'resources', table);
}

/**
 * FRONTEND.md §9 writes margin as `shipWindow.earliestDay − (autonomyDays +
 * band)` and then classifies `critical` when that is negative. Those two lines
 * disagree with each other: with that subtraction order a resource that
 * comfortably outlasts the voyage comes out negative, so every healthy
 * resource would render critical and the colour contract would be meaningless.
 *
 * We keep computeMarginDays() as the ONLY implementation — no second formula
 * anywhere in the app — and flip the sign once, here, so "margin to ship"
 * means what the column header says: days of cover beyond the ship's arrival.
 * Flagged for Dev A in PROGRESS.md; the correction belongs in the engine.
 */
function marginToShip(
  autonomyDays: number,
  bandDays: number,
  window: ShipWindowDays
): { min: number; max: number } {
  const engine = computeMarginDays(autonomyDays, bandDays, window);
  return { min: -engine.max, max: -engine.min };
}

export interface DerivedResource extends Resource {
  /** Why LSOD is null, when it is. */
  lsodUnavailableReason?: 'stale' | 'no-voyage';
  belowReorder: boolean;
  syncState: StationSummary['sync']['state'];
  voyageId?: string;
}

export function getResources(filter: StationFilter = 'all', season?: string): DerivedResource[] {
  const voyage = getActiveVoyage(season);
  return rawResources()
    .filter((r) => matchesFilter(r.stationId, filter))
    .map((r) => deriveResource(r, voyage))
    .sort(byLsodAscending);
}

export function getResource(id: string, season?: string): DerivedResource | undefined {
  const raw = rawResources().find((r) => r.id === id);
  if (!raw) return undefined;
  return deriveResource(raw, getActiveVoyage(season));
}

export function deriveResource(raw: Resource, voyage: Voyage | null): DerivedResource {
  const stationId = raw.stationId;
  const config = getEngineConfig(stationId);
  const sync = getSyncInfo(stationId);

  const stock = num(raw.stock);
  const burn = num(raw.burnRate);
  const { autonomyDays, autonomyBandDays } = computeAutonomy(stock, burn, config);

  const window = shipWindowDays(stationId, voyage);

  let lsodDays: number | null = null;
  let reason: DerivedResource['lsodUnavailableReason'];
  if (!window) {
    reason = 'no-voyage';
  } else if (!canDeriveDeadline(sync.state)) {
    // A stale input must never produce a confident deadline (FR-2.7).
    reason = 'stale';
  } else {
    lsodDays = computeLSOD(autonomyDays, window, config);
  }

  const margin = window ? marginToShip(autonomyDays, autonomyBandDays, window) : null;
  const risk: Risk = margin ? computeRisk(margin.min, lsodDays) : 'watch';

  return {
    ...raw,
    autonomyDays,
    autonomyBandDays,
    marginDays: margin,
    lsodDays,
    lsodUnavailableReason: reason,
    risk,
    belowReorder: raw.reorderPoint !== undefined && stock <= raw.reorderPoint,
    syncState: sync.state,
    voyageId: voyage?.id,
  };
}

/** LSOD ascending, with "cannot compute" rows kept visible at the end. */
export function byLsodAscending(a: DerivedResource, b: DerivedResource): number {
  if (a.lsodDays === null && b.lsodDays === null) return a.autonomyDays - b.autonomyDays;
  if (a.lsodDays === null) return 1;
  if (b.lsodDays === null) return -1;
  return a.lsodDays - b.lsodDays;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const TIER_RANK: Record<Tier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };
export const OPEN_STATES: Action['state'][] = ['RAISED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS'];

export interface DerivedAction extends Action {
  resourceId?: string;
  syncState: StationSummary['sync']['state'];
  isOpen: boolean;
  isUnacked: boolean;
  /** Present when the coupling engine can express the cost of inaction. */
  consequenceLabel: string | null;
  linkedLsodDays?: number | null;
  slaPausedNow: boolean;
}

function rawActions(namespace: 'hq' | 'station' = 'hq'): (Action & { resourceId?: string })[] {
  const table = readStore<Record<string, Action & { resourceId?: string }>>(namespace, 'actions', {});
  return Object.values(table);
}

export function putAction(action: Action, namespace: 'hq' | 'station' = 'hq'): void {
  const table = readStore<Record<string, Action>>(namespace, 'actions', {});
  table[action.id] = action;
  writeStore(namespace, 'actions', table);
}

/**
 * SLA clocks pause while the station is DARK (FR-7.3) — a station cannot
 * breach an acknowledgement SLA it could not be told about. The pause is
 * computed from the link history, not stored, so it stays honest if the
 * thresholds on /settings change.
 */
function slaFor(action: Action, darkSeconds: number): Action['sla'] {
  const target = slaTargetSeconds(action.tier);
  const pauseWhileDark = getParamValue<boolean>('sla.pauseWhileDark');
  const acked = action.state !== 'RAISED';
  const ackAt = acked ? action.timeline.find((t) => t.state === 'ACKNOWLEDGED')?.at : undefined;
  const elapsedRaw = ackAt
    ? Math.max(0, (Date.parse(ackAt) - Date.parse(action.raisedAt)) / 1000)
    : ageSeconds(action.raisedAt);
  const paused = pauseWhileDark ? Math.min(darkSeconds, elapsedRaw) : 0;
  const elapsed = Math.max(0, elapsedRaw - paused);
  return {
    targetSeconds: target,
    elapsedSeconds: Math.round(elapsed),
    pausedSeconds: Math.round(paused),
    breached: !acked && elapsed > target,
  };
}

function darkSecondsSince(stationId: StationId, sinceIso: string): number {
  const info = getSyncInfo(stationId);
  if (info.state !== 'DARK') return 0;
  const darkSince = Math.max(Date.parse(info.lastSyncAt), Date.parse(sinceIso));
  return Math.max(0, (Date.now() - darkSince) / 1000);
}

export function deriveAction(raw: Action & { resourceId?: string }): DerivedAction {
  const sync = getSyncInfo(raw.stationId);
  const dark = darkSecondsSince(raw.stationId, raw.raisedAt);
  const resource = raw.resourceId ? getResource(raw.resourceId) : undefined;
  return {
    ...raw,
    ageSeconds: ageSeconds(raw.raisedAt),
    sla: slaFor(raw, dark),
    syncState: sync.state,
    isOpen: OPEN_STATES.includes(raw.state),
    isUnacked: raw.state === 'RAISED',
    consequenceLabel: raw.consequence?.label ?? null,
    linkedLsodDays: resource?.lsodDays ?? null,
    slaPausedNow: sync.state === 'DARK' && getParamValue<boolean>('sla.pauseWhileDark'),
  };
}

export function getActions(filter: StationFilter = 'all'): DerivedAction[] {
  return rawActions('hq')
    .filter((a) => matchesFilter(a.stationId, filter))
    .map(deriveAction)
    .sort(byPriority);
}

export function getAction(id: string): DerivedAction | undefined {
  const raw = rawActions('hq').find((a) => a.id === id) ?? rawActions('station').find((a) => a.id === id);
  return raw ? deriveAction(raw) : undefined;
}

export function getStationConsoleActions(): DerivedAction[] {
  return rawActions('station').map(deriveAction).sort(byPriority);
}

/** Default sort everywhere: tier desc, then time-to-LSOD asc, then age desc. */
export function byPriority(a: DerivedAction, b: DerivedAction): number {
  const tier = TIER_RANK[a.tier] - TIER_RANK[b.tier];
  if (tier !== 0) return tier;
  const al = a.linkedLsodDays ?? Number.POSITIVE_INFINITY;
  const bl = b.linkedLsodDays ?? Number.POSITIVE_INFINITY;
  if (al !== bl) return al - bl;
  return b.ageSeconds - a.ageSeconds;
}

export interface ActionCounts {
  open: number;
  unacked: number;
  breaching: number;
  deferred: number;
  resolved: number;
  byTier: Record<Tier, number>;
  byState: Record<Action['state'], number>;
}

export function getActionCounts(filter: StationFilter = 'all'): ActionCounts {
  const actions = getActions(filter);
  const byTier: Record<Tier, number> = { T0: 0, T1: 0, T2: 0, T3: 0 };
  const byState: Record<Action['state'], number> = {
    RAISED: 0, ACKNOWLEDGED: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0, DEFERRED: 0,
  };
  let open = 0, unacked = 0, breaching = 0;
  for (const a of actions) {
    byState[a.state] += 1;
    if (a.isOpen) {
      open += 1;
      byTier[a.tier] += 1;
      if (a.isUnacked) unacked += 1;
      if (a.sla.breached) breaching += 1;
    }
  }
  return {
    open, unacked, breaching,
    deferred: byState.DEFERRED,
    resolved: byState.RESOLVED,
    byTier, byState,
  };
}

/** Is there an unacknowledged T0/T1 anywhere? Drives the nav alert dot. */
export function hasUrgentUnacked(): boolean {
  return getActions('all').some((a) => a.isUnacked && (a.tier === 'T0' || a.tier === 'T1'));
}

// ---------------------------------------------------------------------------
// Zones & station summaries
// ---------------------------------------------------------------------------

export function getZones(stationId: StationId): Zone[] {
  const zones = readStore<Zone[]>('hq', 'zones:' + stationId, []);
  const actions = getActions(stationId).filter((a) => a.isOpen);
  return zones.map((z) => ({
    ...z,
    openActionCount: actions.filter((a) => a.zoneCode === z.code).length,
  }));
}

function domainStates(stationId: StationId, zones: Zone[], resources: DerivedResource[], actions: DerivedAction[]): StationSummary['domains'] {
  const worst = (statuses: DomainState['status'][]): DomainState['status'] =>
    statuses.includes('warning') ? 'warning' : statuses.includes('watch') ? 'watch' : statuses.includes('unknown') ? 'unknown' : 'ok';

  const infraZones = zones.filter((z) => ['B1', 'B2', 'B3'].includes(z.code));
  const energyZones = zones.filter((z) => ['A1', 'A2'].includes(z.code));
  const commsZone = zones.find((z) => z.code === 'A3');
  const fuel = resources.find((r) => r.category === 'fuel');
  const riskToStatus: Record<Risk, DomainState['status']> = {
    ok: 'ok', watch: 'watch', warning: 'warning', critical: 'warning',
  };
  const sync = getSyncInfo(stationId);

  const openInfra = actions.filter((a) => a.isOpen && a.zoneCode && ['B1', 'B2', 'B3'].includes(a.zoneCode)).length;
  const openEnergy = actions.filter((a) => a.isOpen && a.zoneCode && ['A1', 'A2'].includes(a.zoneCode)).length;

  return {
    infrastructure: {
      status: worst(infraZones.map((z) => z.status)),
      summary: openInfra > 0 ? `${openInfra} open in living/labs/storage` : 'All occupied zones nominal',
    },
    energy: {
      status: worst(energyZones.map((z) => z.status)),
      summary: openEnergy > 0 ? `${openEnergy} open on power/fuel` : 'Generation and fuel nominal',
    },
    logistics: {
      status: fuel ? riskToStatus[fuel.risk] : 'unknown',
      summary: fuel
        ? fuel.lsodDays === null
          ? 'LSOD cannot be computed — inputs stale'
          : `Fuel LSOD in ${Math.round(fuel.lsodDays)} d`
        : 'No fuel resource reported',
    },
    environment: {
      status: sync.state === 'DARK' ? 'unknown' : commsZone?.status === 'warning' ? 'watch' : 'ok',
      summary: sync.state === 'DARK' ? 'No station readings since last sync' : 'Replayed public record, current',
    },
  };
}

export function getStationSummary(stationId: StationId): StationSummary {
  const profile = STATION_PROFILES[stationId];
  const sync = getSyncInfo(stationId);
  const zones = getZones(stationId);
  const resources = getResources(stationId);
  const actions = getActions(stationId);

  return {
    id: stationId,
    code: profile.code,
    name: profile.name,
    lat: profile.lat,
    lon: profile.lon,
    crew: profile.crew,
    sync: { state: sync.state, lastSyncAt: sync.lastSyncAt, ageSeconds: sync.ageSeconds },
    domains: domainStates(stationId, zones, resources, actions),
    zones,
    resources,
    openActions: actions.filter((a) => a.isOpen),
    outbox: outboxSummary(stationId),
  };
}

export function getStationSummaries(): StationSummary[] {
  return STATION_IDS.map(getStationSummary);
}

// ---------------------------------------------------------------------------
// Outbox (station side) — read helpers; the drain engine lives in state/sync.ts
// ---------------------------------------------------------------------------

export function getOutbox(): SyncRecord[] {
  return readStore<SyncRecord[]>('station', 'outbox', []);
}

export function putOutbox(records: SyncRecord[]): void {
  writeStore('station', 'outbox', records);
}

export const TIERS: Tier[] = ['T0', 'T1', 'T2', 'T3'];

export function outboxSummary(stationId?: StationId): { tier: Tier; queued: number; sent: number }[] {
  const outbox = getOutbox().filter((r) => !stationId || r.stationId === stationId);
  const sent = getReceivedRecords().filter((r) => !stationId || r.stationId === stationId);
  return TIERS.map((tier) => ({
    tier,
    queued: outbox.filter((r) => r.tier === tier && (r.state === 'QUEUED' || r.state === 'FAILED')).length,
    sent: sent.filter((r) => r.tier === tier).length,
  }));
}

/** Records that have landed at HQ. The dedupe set for idempotent retries. */
export function getReceivedRecords(): SyncRecord[] {
  return readStore<SyncRecord[]>('hq', 'received', []);
}

export function putReceivedRecords(records: SyncRecord[]): void {
  writeStore('hq', 'received', records);
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export function getObligations(filter: StationFilter = 'all'): Obligation[] {
  return readStore<Obligation[]>('hq', 'obligations', [])
    .filter((o) => matchesFilter(o.stationId as StationId, filter))
    .map((o) => ({ ...o, status: resolveObligationStatus(o) }))
    .sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));
}

export function putObligations(obligations: Obligation[]): void {
  writeStore('hq', 'obligations', obligations);
}

/**
 * FR-2.6: an obligation whose evidence is sitting in a station outbox reads
 * QUEUED OFFLINE, not OVERDUE. The station did its part; the link did not.
 */
export function resolveObligationStatus(o: Obligation): Obligation['status'] {
  if (o.status === 'submitted') return 'submitted';
  const queued = getOutbox().some(
    (r) => r.type === 'compliance' && r.stationId === o.stationId && r.state !== 'SENT'
  );
  const dueInDays = daysFromNow(o.dueDate);
  if (dueInDays < 0) return queued ? 'queued_offline' : 'overdue';
  if (dueInDays <= 30) return 'due_soon';
  return 'future';
}

export function getWasteEvents(filter: StationFilter = 'all'): WasteEvent[] {
  return readStore<WasteEvent[]>('hq', 'wasteEvents', [])
    .filter((w) => matchesFilter(w.stationId as StationId, filter))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function putWasteEvents(events: WasteEvent[]): void {
  writeStore('hq', 'wasteEvents', events);
}

export interface WasteBalanceRow {
  stream: WasteEvent['stream'];
  stationId: StationId;
  generatedKg: number;
  shippedKg: number;
  storedKg: number;
  /** generated − shipped − stored. Beyond tolerance this is an integrity fault. */
  discrepancyKg: number;
  withinTolerance: boolean;
}

/**
 * FR-3.4 — the page's most useful integrity feature. `generated − shipped =
 * stored`; anything beyond the configured tolerance renders orange and earns
 * a T2 action.
 */
export function wasteBalance(filter: StationFilter = 'all'): WasteBalanceRow[] {
  const tolerance = getParamValue<number>('thresholds.wasteBalanceToleranceKg');
  const events = getWasteEvents(filter);
  const key = (e: WasteEvent) => e.stationId + '|' + e.stream;
  const groups = new Map<string, WasteEvent[]>();
  for (const e of events) {
    const list = groups.get(key(e)) ?? [];
    list.push(e);
    groups.set(key(e), list);
  }

  const rows: WasteBalanceRow[] = [];
  for (const [k, list] of groups) {
    const [stationId, stream] = k.split('|') as [StationId, WasteEvent['stream']];
    const generatedKg = list.filter((e) => e.direction === 'generated').reduce((s, e) => s + num(e.massKg), 0);
    const shippedKg = list.filter((e) => e.direction === 'shipped').reduce((s, e) => s + num(e.massKg), 0);
    const storedKg = Math.max(0, generatedKg - shippedKg);
    const discrepancyKg = generatedKg - shippedKg - storedKg;
    rows.push({
      stream, stationId, generatedKg, shippedKg, storedKg,
      discrepancyKg: Number(discrepancyKg.toFixed(1)),
      withinTolerance: Math.abs(discrepancyKg) <= tolerance,
    });
  }
  return rows.sort((a, b) => a.stream.localeCompare(b.stream) || a.stationId.localeCompare(b.stationId));
}

/** Monthly generation by stream, for the stacked bar chart (FR-3.3). */
export function wasteMonthlySeries(filter: StationFilter = 'all'): {
  month: string;
  byStream: Record<string, number>;
  cumulativeStoredKg: number;
}[] {
  const events = getWasteEvents(filter).filter((e) => e.direction === 'generated');
  const buckets = new Map<string, Record<string, number>>();
  for (const e of events) {
    const d = new Date(e.at);
    const month = d.toISOString().slice(0, 7);
    const bucket = buckets.get(month) ?? {};
    bucket[e.stream] = (bucket[e.stream] ?? 0) + num(e.massKg);
    buckets.set(month, bucket);
  }
  const shipped = getWasteEvents(filter).filter((e) => e.direction === 'shipped');
  let cumulative = 0;
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, byStream]) => {
      const generated = Object.values(byStream).reduce((s, v) => s + v, 0);
      const removed = shipped
        .filter((e) => e.at.slice(0, 7) === month)
        .reduce((s, e) => s + num(e.massKg), 0);
      cumulative += generated - removed;
      return { month, byStream, cumulativeStoredKg: Math.max(0, Number(cumulative.toFixed(1))) };
    });
}

// ---------------------------------------------------------------------------
// Causal trace inputs — ONE builder, so every surface traces the same chain
// ---------------------------------------------------------------------------

/**
 * Touchpoint #10: the Action Centre drawer, the Twin page, Environment and
 * the Sandbox must all produce identical CausalTrace numbers for the same
 * asset and conditions. They do that by building the engine's input HERE,
 * once, rather than each assembling their own. Dev A's pages should call
 * this too rather than hand-rolling an input object.
 */
export function causalTraceInput(
  stationId: StationId,
  opts: { resourceId?: string; zoneCode?: string; provenanceOverride?: 'SIM' } = {}
): CausalTraceInput {
  const env = envSnapshot(stationId);
  const config = getEngineConfig(stationId);
  const fuel =
    (opts.resourceId ? rawResources().find((r) => r.id === opts.resourceId) : undefined) ??
    rawResources().find((r) => r.stationId === stationId && r.category === 'fuel');

  const voyage = getActiveVoyage();
  const window = shipWindowDays(stationId, voyage) ?? { earliestDay: 0, latestDay: 0 };

  const baseU = getParamValue<number>('thermal.uValue', stationId);
  const zone = opts.zoneCode ? getZones(stationId).find((z) => z.code === opts.zoneCode) : undefined;
  const lossPct =
    zone?.status === 'warning' ? getParamValue<number>('thermal.zoneWarningLossPct', stationId)
    : zone?.status === 'watch' ? getParamValue<number>('thermal.zoneWatchLossPct', stationId)
    : 0;

  return {
    ambientTempC: num(env.ambientC),
    windKmh: num(env.windKt) * 1.852,
    uValue: baseU * (1 + lossPct / 100),
    areaM2: getParamValue<number>('thermal.areaM2', stationId),
    stockUnits: num(fuel?.stock),
    shipWindow: window,
    config,
    provenanceOverride: opts.provenanceOverride,
  };
}

export interface ZoneImpact {
  beforeDays: number;
  afterDays: number;
  deltaDays: number;
  lossPct: number;
}

/**
 * FR-9.1 — the operational cost of leaving a zone in its current state,
 * expressed the only way that matters here: days of autonomy. Both figures
 * come from runCausalTrace, so they cannot drift from the twin's numbers.
 */
export function zoneAutonomyImpact(stationId: StationId, zoneCode: string): ZoneImpact {
  const before = runCausalTrace(causalTraceInput(stationId));
  const after = runCausalTrace(causalTraceInput(stationId, { zoneCode }));
  const lossPct = (causalTraceInput(stationId, { zoneCode }).uValue /
    causalTraceInput(stationId).uValue - 1) * 100;
  return {
    beforeDays: before.autonomyDays,
    afterDays: after.autonomyDays,
    deltaDays: after.autonomyDays - before.autonomyDays,
    lossPct,
  };
}

export function getInspections(filter: StationFilter = 'all'): InspectionRecord[] {
  return readStore<InspectionRecord[]>('hq', 'inspections', [])
    .filter((i) => matchesFilter(i.stationId as StationId, filter))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function putInspections(records: InspectionRecord[]): void {
  writeStore('hq', 'inspections', records);
}

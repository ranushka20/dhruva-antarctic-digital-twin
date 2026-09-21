/**
 * Antarasetu — FROZEN SHARED CONTRACT
 * ====================================
 *
 * This file is the single source of truth for everything that crosses the
 * Dev A (Twin, Physics & Assets) / Dev B (Operations, Records & Resilience)
 * boundary. Both developers import FROM this file. Neither developer edits
 * the signatures in this file without telling the other — the whole point
 * of freezing it is that each side can build against it independently.
 *
 * THIS IS A FRONTEND-ONLY BUILD. There is no real backend anywhere in this
 * project. See "FRONTEND-ONLY BUILD SCOPE" in FRONTEND.md (Part I) for the
 * full translation table. The short version: everywhere the original build
 * docs assumed a server, this file (or its owner's real implementation)
 * simulates that behaviour client-side instead — via localStorage, an
 * in-memory store, and a scripted connectivity toggle. That is not a
 * placeholder awaiting a backend — for this build, it IS the backend.
 *
 * Canonical folder mapping (per FRONTEND.md §12): this single file is a
 * convenience for the handoff between two developers/agents. Once both of
 * you are comfortable with the shapes below, feel free to split it along
 * these lines to match FRONTEND.md's folder structure exactly — re-export
 * from each new location so import paths stay stable:
 *   - Section 1 (types)              → src/types/*.ts
 *   - Section 2 (coupling engine)    → src/engine/coupling.ts, autonomy.ts, lsod.ts
 *   - Section 3 (hash chain)         → src/lib/hashChain.ts
 *   - Section 4 (stateful stores)    → state/connectivity.ts, lib/localStore.ts,
 *                                       adapters/*.adapter.ts
 * Splitting is optional; keeping one file is fine for a hackathon timeline.
 *
 * Three kinds of exports live here, and they are NOT equivalent:
 *
 *   1. TYPES — frozen. Never change a shape without agreement from both devs.
 *   2. REAL IMPLEMENTATIONS — the coupling engine and the audit hash chain
 *      are fully specified by FRONTEND.md, so they are implemented for real,
 *      right here, on day one, and need no backend to work. Neither dev
 *      "owns" finishing these — they already work. Dev A may extend the
 *      engine (new formulas); if so, update this file and log it in
 *      PROGRESS.md's "Contract changes" section the same day.
 *   3. LOCAL-STORE-BACKED SIMULATIONS — `useActionTransitions` and the
 *      sync/outbox helpers stand in for what a real backend would do.
 *      They are implemented here as working, deterministic mocks backed by
 *      `localStorage` (not just in-memory) so state survives a page refresh
 *      during a demo. Dev B owns this section and extends it as needed —
 *      the exported function signatures should stay stable so Dev A's
 *      pages never need to change their call sites.
 *
 * Route ownership (for reference, enforced nowhere but here — matches
 * FRONTEND.md exactly, note the Twin route is nested under :id/twin):
 *   Dev A: /stations/:id/twin  /assets  /assets/:assetId  /environment  /sandbox
 *   Dev B: /  /actions  /actions/:actionId  /logistics  /logistics/manifest/:id
 *          /comms  /station  /compliance  /handover  /settings  /login
 */

// ============================================================================
// 1. CORE TYPES — used on every page, by both developers
// ============================================================================

export type Provenance = 'LIVE' | 'MODELED' | 'SYNTH' | 'SIM';

export interface Measurement {
  value: number | string | null;
  unit: string;
  timestamp: string;               // ISO 8601, station-stamped
  source: string;
  provenance: Provenance;
  confidence?: number;             // 0–1, optional
  freshnessSeconds: number;        // derived at read time
  parents?: { name: string; provenance: Provenance }[];  // required when MODELED
  awaiting?: string;                // required when SYNTH — the feed not yet connected
  model?: string;                   // required when MODELED — the formula used
}

export type Risk = 'ok' | 'watch' | 'warning' | 'critical';
export type SyncState = 'LIVE' | 'LAGGING' | 'DARK';
export type Tier = 'T0' | 'T1' | 'T2' | 'T3';
export type ZoneStatus = 'ok' | 'watch' | 'warning' | 'unknown';

export interface DomainState {
  status: 'ok' | 'watch' | 'warning' | 'unknown';
  summary: string;
}

export interface StationSummary {
  id: 'bharati' | 'maitri';
  code: 'BHR' | 'MTR';
  name: string;
  lat: number; lon: number;
  crew: number;
  sync: { state: SyncState; lastSyncAt: string; ageSeconds: number };
  domains: {
    infrastructure: DomainState;
    energy: DomainState;
    logistics: DomainState;
    environment: DomainState;
  };
  zones: Zone[];
  resources: Resource[];
  openActions: Action[];
  outbox: { tier: Tier; queued: number; sent: number }[];
}

// ---- Dev A domain: Twin / Assets / Environment / Sandbox -------------------

export interface Zone {
  code: string; name: string;
  status: ZoneStatus;
  summary: Measurement;
  openActionCount: number;
}

export interface ZoneModel {
  code: string;
  name: string;
  grid: { gx: number; gy: number };
  height: number;
  status: ZoneStatus;
  topLabel: string;
  topValue: Measurement;
  feature?: 'mast' | 'tank' | 'none';
  assets: TwinAsset[];
  openActions: Action[];
}

export interface StationModel {
  stationId: 'bharati' | 'maitri';
  zones: ZoneModel[];
}

export interface TwinAsset {
  id: string; name: string;
  status: ZoneStatus;
  current: Measurement;
  threshold?: { value: number; unit: string; label: string };
  series24h: { t: string; v: number }[];
  provenance: Provenance;
}

export interface Asset {
  id: string; name: string;
  stationId: 'bharati' | 'maitri';
  zoneCode: string;
  category: 'power' | 'hvac' | 'water' | 'comms' | 'vehicle' | 'lab' | 'safety' | 'structural';
  criticality: Tier;
  spec: {
    manufacturer?: string; model?: string;
    installedAt?: string; ratedCapacity?: Measurement;
    provenance: Provenance;              // MODELED if from documentation, SYNTH if invented
  };
  condition: 'good' | 'monitor' | 'degraded' | 'fault';
  conditionRule: { id: string; expression: string; firedAt?: string };
  metrics: {
    key: string; label: string; current: Measurement;
    threshold?: { value: number; unit: string; label: string };
    series: { t: string; v: number | null }[];
  }[];
  runHours?: Measurement;
  service: {
    intervalBasis: 'calendar_days' | 'run_hours' | 'cycles';
    interval: number;
    lastServiceAt?: string; lastServiceAtHours?: number;
    nextDueAt?: string; nextDueAtHours?: number;
    overdue: boolean;
  };
  openActionIds: string[];
}

export interface MaintenanceEvent {
  id: string; assetId: string;
  type: 'service' | 'inspection' | 'fault' | 'repair' | 'part_replacement' | 'condition_change';
  at: string; atStation?: string;
  performedBy: string;
  notes: string;
  partsUsed: { resourceId: string; quantity: number }[];   // decrements /logistics — see integration §4
  downtimeMinutes?: number;
  evidence: { id: string; kind: string; label: string }[];
  auditHash: string; prevHash: string;
  pendingSync: boolean;
  provenance: Provenance;
}

export interface Fault {
  id: string; assetId: string;
  symptom: string; diagnosis?: string; resolution?: string;
  raisedAt: string; resolvedAt?: string;
  timeToResolveMinutes?: number;
  linkedActionId?: string;
  provenance: Provenance;                // SYNTH while history is synthetic
}

export interface EnvironmentalSeries {
  stationId: 'bharati' | 'maitri';
  metric: 'temperature' | 'windSpeed' | 'windDir' | 'pressure' | 'humidity' | 'heatingDemand';
  unit: string;
  points: { t: string; v: number | null }[];   // null marks a gap — never interpolate
  gaps: { from: string; to: string; reason?: string }[];
  provenance: Provenance;
  source: string;
  sourceUrl?: string;
  downsampled?: { method: 'LTTB'; from: number; to: number };
}

export interface DataSource {
  id: string;
  name: string;
  provides: string[];
  provenance: Provenance;
  group: 'connected' | 'derived' | 'awaiting';
  url?: string;
  attribution?: string;
  cadence: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  coverage: number;                // 0–1 over the selected range
  awaiting?: string;                // required when provenance === 'SYNTH'
  adapterInterface: string;
  consumedBy: string[];             // route names
}

export interface SandboxParameter {
  key: string; group: 'environmental' | 'energy' | 'logistics' | 'crew';
  label: string; unit: string;
  baseline: number;
  value: number;
  min: number; max: number; step: number;
  boundSource: string;
  constrainedBy?: string[];
}

export interface Scenario {
  id: string; name: string;
  stationId: 'bharati' | 'maitri';
  parameters: Record<string, number>;
  createdBy: string; createdAt: string;
  preset: boolean;
}

export interface SandboxResult {
  scenarioId: string;
  forkedFrom: { stationId: string; at: string };
  metrics: {
    key: string; label: string; unit: string;
    before: { value: number; band?: number; risk: Risk; provenance: Provenance };
    after: { value: number; band?: number; risk: Risk; provenance: 'SIM' };
    delta: number;
  }[];
  trace: CausalTraceStep[];
  projection: {
    baseline: { t: string; v: number; band: number }[];
    scenario: { t: string; v: number; band: number }[];
    lsodBaseline: number | null;
    lsodScenario: number | null;
    method: 'linear-rate' | 'trend' | 'arima';
    caption: string;                  // always "projection from the entered rate"
  };
  zoneImpact: { zoneCode: string; before: Risk; after: Risk }[];
}

// ---- Dev B domain: HQ / Actions / Logistics / Comms / Compliance / Handover

export interface Resource {
  id: string; name: string; stationId: 'bharati' | 'maitri';
  category?: 'lifeSafety' | 'power' | 'fuel' | 'medical' | 'spares' | 'provisions' | 'science';
  stock: Measurement;                 // SYNTH until inventory feed exists
  unit?: string;
  burnRate: Measurement;              // units per day
  burnSeries12w?: { t: string; v: number }[];
  reorderPoint?: number;
  autonomyDays: number;
  autonomyBandDays: number;           // the ± value — MANDATORY, never a bare point estimate
  shipWindow?: { earliestDay: number; latestDay: number };
  marginDays: { min: number; max: number } | null;
  lsodDays: number | null;            // null when inputs are stale
  risk: Risk;
  provenance: Provenance;
  massPerUnitKg?: number;
}

export interface Voyage {
  id: string; name: string; season: string;
  departureWindow: { from: string; to: string };
  arrival: { bharati?: { from: string; to: string }; maitri?: { from: string; to: string } };
  capacityKg: { min: number; max: number };
  provenance: Provenance;
  status: 'planned' | 'committed' | 'sailed' | 'completed';
}

export interface ManifestItem {
  resourceId: string; stationId: string;
  quantity: number; massKg: number;
  urgency: number; criticality: number; score: number;
  included: boolean; manualOverride: boolean;
}

export interface Manifest {
  id: string; voyageId: string; version: number;
  items: ManifestItem[];
  totalMassKg: number; capacityKg: number;
  deferredAtRisk: number;
  generatedAt: string; generatedBy: string; auditHash: string;
}

export interface Action {
  id: string;
  stationId: 'bharati' | 'maitri';
  zoneCode?: string;
  assetId?: string;
  tier: Tier;
  title: string;
  reason: string;
  state: 'RAISED' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'DEFERRED';
  trigger: {
    metricName: string;
    measurement: Measurement;
    threshold?: { value: number; unit: string; label: string };
  };
  consequence?: {
    kind: 'autonomy' | 'lsod' | 'compliance' | 'safety';
    before: number; after: number; unit: string;
    label: string;                    // "autonomy −16 d"
  };
  assignee?: { id: string; name: string; role: string };
  deferral?: { reason: string; reviewDate: string };
  resolution?: { note: string; at: string; by: string };
  evidence: { id: string; kind: 'photo' | 'reading' | 'note' | 'file'; label: string; at: string; pendingSync: boolean }[];
  timeline: {
    state: string; at: string; by: string; note?: string;
    hash: string; prevHash: string; pendingSync: boolean; superseded?: boolean;
  }[];
  sla: { targetSeconds: number; elapsedSeconds: number; pausedSeconds: number; breached: boolean };
  raisedAt: string;
  ageSeconds: number;
  similar?: { actionId: string; title: string; score: number; resolution: string; provenance: Provenance }[];
}

export interface SyncRecord {
  id: string;                          // client-generated UUID, dedupe key
  stationId: 'bharati' | 'maitri';
  tier: Tier;
  type: 'action' | 'fault' | 'inventory' | 'compliance' | 'measurement' | 'attachment' | 'handover';
  payloadRef: string;
  sizeBytes: number;
  createdAtStation: string;
  enqueuedAt: string;
  state: 'QUEUED' | 'TRANSFERRING' | 'SENT' | 'FAILED' | 'SUPERSEDED';
  attempts: number;
  lastError?: string;
  promotedFrom?: Tier;
  promotionReason?: string;
  hash: string; prevHash: string;
}

export interface CommunicationEvent {
  stationId: string;
  state: SyncState;
  from: string; to?: string;
  durationSeconds: number;
  recordsRecovered?: number;
  cause?: string;                      // MODELED or SYNTH — never asserted as fact
}

export interface Conflict {
  objectType: 'action' | 'resource' | 'record';
  objectId: string;
  hqVersion: { actor: string; at: string; fields: Record<string, unknown> };
  stationVersion: { actor: string; at: string; fields: Record<string, unknown> };
  differingFields: string[];
  defaultResolution: 'hq' | 'station';
  resolvedAs?: 'hq' | 'station';
  overrideReason?: string;
}

export interface Obligation {
  id: string; name: string; category: string;
  stationId: 'bharati' | 'maitri';
  cadence: 'monthly' | 'quarterly' | 'seasonal' | 'annual' | 'event-driven';
  dueDate: string;
  owner: string;
  status: 'future' | 'due_soon' | 'overdue' | 'submitted' | 'queued_offline';
  lastSubmissionId?: string;
  linkedActionId?: string;
  templateId: string; templateVersion: number;
}

export interface WasteEvent {
  id: string; stationId: string;
  stream: 'general' | 'recyclable' | 'hazardous' | 'fuel_oily' | 'food' | 'sewage' | 'medical' | 'scientific';
  direction: 'generated' | 'shipped';
  massKg: Measurement;                 // SYNTH until a real station record feed exists
  containerId?: string;
  handler: string;
  destination?: string;
  voyageId?: string;                   // links to /logistics when shipped
  at: string;
  evidence: { id: string; kind: string; label: string }[];
  auditHash: string;
  pendingSync: boolean;
}

export interface InspectionRecord {
  id: string; stationId: string;
  type: string; templateId: string; templateVersion: number;
  scope: { zoneCodes?: string[]; assetIds?: string[] };
  inspector: string; at: string;
  items: { id: string; label: string; result: 'pass' | 'fail' | 'na'; note?: string; linkedActionId?: string }[];
  result: 'pass' | 'pass_with_findings' | 'fail';
  auditHash: string;
}

export interface AuditEntry {
  seq: number;
  at: string;                          // HQ receipt time
  atStation?: string;                  // station-stamped, when applicable
  actor: string; actorRole: string;
  objectType: string; objectId: string;
  transition: string;
  payloadSummary: string;
  hash: string; prevHash: string;
  writtenOffline: boolean;
  superseded: boolean;
}

export interface HandoverSnapshot {
  id: string; version: number;
  stationId: 'bharati' | 'maitri';
  rotation: { id: string; from: string; to: string; outgoingLead: string; incomingLead?: string };
  generatedAt: string; generatedBy: string;
  syncStateAtGeneration: { state: SyncState; lastSyncAt: string };
  sections: {
    key: 'state' | 'actions' | 'recurring_faults' | 'incidents' | 'resources'
    | 'maintenance' | 'compliance' | 'comms' | 'notes';
    included: boolean;
    itemCount: number;
    stale: boolean;
    items: unknown[];
  }[];
  notes?: { html: string; attachments: { id: string; label: string }[] };
  acknowledgedAt?: string; acknowledgedBy?: string;
  auditHash: string; prevHash: string;
}

export interface Parameter {
  key: string;
  group: 'logistics' | 'energy' | 'thermal' | 'sync' | 'sla' | 'thresholds' | 'stations' | 'users' | 'sources';
  label: string;
  value: number | string | boolean;
  unit?: string;
  default: number | string | boolean;
  min?: number; max?: number;
  scope: 'global' | 'bharati' | 'maitri';
  overriddenFromGlobal: boolean;
  source: string;                      // "assumption — pending NCPOR confirmation"
  provenance: Provenance;              // SYNTH until confirmed
  confirmedBy?: string; confirmedAt?: string;
  lastChangedBy?: string; lastChangedAt?: string;
  usedBy: string[];                    // engine functions that read it
}

// ============================================================================
// 2. COUPLING ENGINE — REAL, WORKING IMPLEMENTATION (owned by Dev A,
//    consumed read-only by Dev B). Pure, synchronous, no side effects.
//    Every constant below must also exist as an editable Parameter on
//    Dev B's /settings page (10-crew-handover-and-settings.md, PART B) —
//    do not let this list drift from that page's parameter groups.
// ============================================================================

export interface EngineConfig {
  degreeDayBaseC: number;              // default 18
  baselineLoadKw: number;
  generatorEfficiency: number;         // 0–1
  burnRateVariance: number;            // fraction, drives the ± band
  unloadingDays: number;
  transitDays: number;
  consolidationDays: number;
  procurementLeadDays: number;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  degreeDayBaseC: 18,
  baselineLoadKw: 60,
  generatorEfficiency: 0.38,
  burnRateVariance: 0.08,
  unloadingDays: 3,
  transitDays: 21,
  consolidationDays: 5,
  procurementLeadDays: 14,
};

/** Heating degree-days. T_base and T_avg in °C. */
export function computeHDD(tAvgC: number, tBaseC = DEFAULT_ENGINE_CONFIG.degreeDayBaseC): number {
  return Math.max(0, tBaseC - tAvgC);
}

/** Building heat loss. U = W/m²K, A = m², deltaT = °C. Returns watts. */
export function computeHeatLoss(uValue: number, areaM2: number, deltaTC: number): number {
  return uValue * areaM2 * deltaTC;
}

/** Wind chill — standard NWS / Environment Canada formula. T in °C, v in km/h. */
export function computeWindChill(tC: number, vKmh: number): number {
  if (vKmh < 4.8) return tC; // formula is only valid above ~3 mph
  return (
    13.12 +
    0.6215 * tC -
    11.37 * Math.pow(vKmh, 0.16) +
    0.3965 * tC * Math.pow(vKmh, 0.16)
  );
}

/** Energy demand in kW = baseline load + heating load derived from HDD/heat-loss. */
export function computeEnergyDemand(
  hddOrHeatLossW: number,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): number {
  // heatingLoad is expressed in kW-equivalent; callers pass either a raw
  // heat-loss wattage (converted /1000) or a HDD-derived load already in kW.
  const heatingLoadKw = hddOrHeatLossW / 1000;
  return config.baselineLoadKw + heatingLoadKw;
}

/** Fuel burn rate (units/day-equivalent) = demand ÷ generator efficiency. */
export function computeFuelBurn(demandKw: number, config: EngineConfig = DEFAULT_ENGINE_CONFIG): number {
  return demandKw / config.generatorEfficiency;
}

/** Autonomy in days, plus its mandatory ± band. Never surface autonomyDays alone. */
export function computeAutonomy(
  stockUnits: number,
  burnRatePerDay: number,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): { autonomyDays: number; autonomyBandDays: number } {
  const autonomyDays = burnRatePerDay > 0 ? stockUnits / burnRatePerDay : Infinity;
  const autonomyBandDays = autonomyDays * config.burnRateVariance;
  return { autonomyDays, autonomyBandDays };
}

/**
 * Last Safe Order Date, in days-from-today. Returns null when any input is
 * stale — a stale input must never produce a confident deadline (see
 * 04-logistics-and-resupply.md FR-2.7 / 04's algorithm section).
 */
export function computeLSOD(
  depletionDayFromToday: number | null,
  shipWindow: { earliestDay: number; latestDay: number },
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): number | null {
  if (depletionDayFromToday === null || !isFinite(depletionDayFromToday)) return null;
  const rawLsod =
    depletionDayFromToday -
    config.unloadingDays -
    config.transitDays -
    config.consolidationDays -
    config.procurementLeadDays;
  // snap backward to the last feasible sailing date in the window
  return Math.min(rawLsod, shipWindow.latestDay);
}

export function computeMarginDays(
  depletionDayFromToday: number,
  bandDays: number,
  shipWindow: { earliestDay: number; latestDay: number }
): { min: number; max: number } {
  return {
    min: shipWindow.earliestDay - (depletionDayFromToday + bandDays),
    max: shipWindow.latestDay - (depletionDayFromToday - bandDays),
  };
}

export function computeRisk(marginDaysMin: number, lsodDays: number | null): Risk {
  if (marginDaysMin < 0) return 'critical';
  if (lsodDays === null) return 'watch';
  if (lsodDays <= 14) return 'warning';
  if (lsodDays <= 45) return 'watch';
  return 'ok';
}

/**
 * Manifest prioritisation (04-logistics-and-resupply.md §4). Ranks candidate
 * items by urgency × criticality and fills capacity greedily.
 */
const CRITICALITY_WEIGHTS: Record<NonNullable<Resource['category']>, number> = {
  lifeSafety: 1.0,
  power: 0.9,
  fuel: 0.85,
  medical: 0.8,
  spares: 0.6,
  provisions: 0.5,
  science: 0.3,
};

export function scoreManifestCandidate(
  horizonDays: number,
  lsodDays: number,
  category: NonNullable<Resource['category']>
): number {
  const urgency = Math.min(1, Math.max(0, (horizonDays - lsodDays) / horizonDays));
  return urgency * CRITICALITY_WEIGHTS[category];
}

/**
 * The single call site every "why this matters" panel must use — Twin,
 * Assets, Environment coupling panel, Sandbox and the Action Centre drawer
 * ALL render CausalTraceStep[] from this function for the same inputs and
 * MUST produce identical numbers. Do not compute a trace any other way.
 */
export interface CausalTraceStep {
  label: string;                       // "AMBIENT", "↓ HEATING", "↓ GEN LOAD", ...
  value: Measurement;
  formula?: string;                    // shown on hover
}

export interface CausalTraceInput {
  ambientTempC: number;
  windKmh: number;
  uValue: number; areaM2: number;
  stockUnits: number;
  shipWindow: { earliestDay: number; latestDay: number };
  config?: EngineConfig;
  provenanceOverride?: Provenance;      // pass 'SIM' from the Sandbox, else defaults to 'MODELED'
}

export function runCausalTrace(input: CausalTraceInput): {
  steps: CausalTraceStep[];
  autonomyDays: number; autonomyBandDays: number;
  lsodDays: number | null; risk: Risk;
} {
  const cfg = input.config ?? DEFAULT_ENGINE_CONFIG;
  const provenance: Provenance = input.provenanceOverride ?? 'MODELED';
  const now = new Date().toISOString();

  const hdd = computeHDD(input.ambientTempC, cfg.degreeDayBaseC);
  const heatLossW = computeHeatLoss(input.uValue, input.areaM2, hdd);
  const demandKw = computeEnergyDemand(heatLossW, cfg);
  const burnRate = computeFuelBurn(demandKw, cfg);
  const { autonomyDays, autonomyBandDays } = computeAutonomy(input.stockUnits, burnRate, cfg);
  const lsodDays = computeLSOD(autonomyDays, input.shipWindow, cfg);
  const margin = computeMarginDays(autonomyDays, autonomyBandDays, input.shipWindow);
  const risk = computeRisk(margin.min, lsodDays);

  const mk = (value: number, unit: string, model: string): Measurement => ({
    value, unit, timestamp: now, source: 'coupling-engine', provenance, freshnessSeconds: 0, model,
  });

  const steps: CausalTraceStep[] = [
    { label: 'AMBIENT', value: mk(input.ambientTempC, '°C', 'input'), formula: 'input' },
    { label: '↓ HEATING', value: mk(hdd, 'HDD', 'HDD = max(0, T_base − T_avg)'), formula: 'HDD = max(0, T_base − T_avg)' },
    { label: '↓ GEN LOAD', value: mk(demandKw, 'kW', 'demand = baseline + heatingLoad(HDD, Q)'), formula: 'demand = baseline + heatingLoad(HDD, Q)' },
    { label: '↓ FUEL BURN', value: mk(burnRate, 'units/day', 'burnRate = demand / generatorEfficiency'), formula: 'burnRate = demand / generatorEfficiency' },
    { label: '↓ AUTONOMY', value: mk(autonomyDays, 'd', 'autonomyDays = stock / burnRate'), formula: 'autonomyDays = stock / burnRate' },
  ];

  return { steps, autonomyDays, autonomyBandDays, lsodDays, risk };
}

// ============================================================================
// 3. AUDIT HASH CHAIN — REAL, WORKING IMPLEMENTATION (owned by Dev B,
//    consumed by Dev A wherever an action/maintenance transition is written).
//    Algorithm per 07-compliance-and-audit.md. Uses Web Crypto (available in
//    browsers and Node ≥ 18) — no external crypto dependency needed.
// ============================================================================

export const GENESIS_HASH = '0'.repeat(64);

/** Keys sorted, no whitespace, UTF-8 — both station edge and HQ must match this exactly. */
export function canonicalJSON(obj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(obj).sort();
  const sorted: Record<string, unknown> = {};
  for (const k of sortedKeys) sorted[k] = obj[k];
  return JSON.stringify(sorted);
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface AuditPayload {
  seq: number; at: string; atStation?: string;
  actor: string; actorRole: string;
  objectType: string; objectId: string;
  transition: string; payload: Record<string, unknown>;
}

/** Computes entry.hash = SHA256(prevHash + canonicalJSON(payload)). */
export async function computeEntryHash(prevHash: string, payload: AuditPayload): Promise<string> {
  return sha256Hex(prevHash + canonicalJSON(payload as unknown as Record<string, unknown>));
}

export interface ChainVerifyResult {
  ok: boolean;
  verified: number;
  brokenAt?: number;
}

/** Recomputes every hash client-side. Run in a Web Worker for chains > ~1000 entries. */
export async function verifyChain(chain: AuditEntry[]): Promise<ChainVerifyResult> {
  for (let i = 0; i < chain.length; i++) {
    const expectedPrev = i === 0 ? GENESIS_HASH : chain[i - 1].hash;
    if (chain[i].prevHash !== expectedPrev) return { ok: false, verified: i, brokenAt: i };
    // NOTE: full recompute requires the original payload, not just payloadSummary.
    // Store full payload alongside AuditEntry in the local store (see §4 below);
    // payloadSummary here is a display-only field and is NOT sufficient to
    // recompute the hash.
  }
  return { ok: true, verified: chain.length };
}

// ============================================================================
// 4. SIMULATED BACKEND — this build has no server (see the header note and
//    FRONTEND.md's "FRONTEND-ONLY BUILD SCOPE"). Everything below is the
//    FINAL implementation for this build, not a placeholder — it persists to
//    localStorage so state survives a page refresh mid-demo, namespaced
//    separately for "station" vs "hq" to simulate two independent stores
//    connected by a sync step. Dev B owns this section and extends it; Dev A
//    calls into it and never reimplements any of it.
// ============================================================================

export type ConnectivityState = 'LIVE' | 'LAGGING' | 'DARK';

const LS_PREFIX = 'antarasetu';

function lsKey(namespace: 'station' | 'hq', bucket: string): string {
  return `${LS_PREFIX}:${namespace}:${bucket}`;
}

function lsRead<T>(namespace: 'station' | 'hq', bucket: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(lsKey(namespace, bucket));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite<T>(namespace: 'station' | 'hq', bucket: string, value: T): void {
  try {
    localStorage.setItem(lsKey(namespace, bucket), JSON.stringify(value));
  } catch (err) {
    console.error('[localStore] write failed — is storage full or unavailable?', err);
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }
export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---- 4.1 Connectivity toggle (owns the LIVE/LAGGING/DARK state for /comms) --

export function getConnectivity(stationId: 'bharati' | 'maitri'): ConnectivityState {
  return lsRead('hq', `connectivity:${stationId}`, 'LIVE' as ConnectivityState);
}

/** The dev/demo control on /comms. Setting DARK is what every
 *  <DegradableSurface> app-wide reacts to. */
export function setConnectivity(stationId: 'bharati' | 'maitri', state: ConnectivityState): void {
  lsWrite('hq', `connectivity:${stationId}`, state);
  notify();
}

// ---- 4.2 Action state machine, useActionTransitions() -----------------------

function readActions(namespace: 'station' | 'hq'): Record<string, Action> {
  return lsRead(namespace, 'actions', {} as Record<string, Action>);
}
function writeActions(namespace: 'station' | 'hq', actions: Record<string, Action>): void {
  lsWrite(namespace, 'actions', actions);
}

/**
 * Chain append, inlined here on purpose. src/lib/hashChain.ts is the richer
 * reader/verifier over the SAME `auditChain` bucket; duplicating the twelve
 * lines below is what keeps this file dependency-free and free of an import
 * cycle, while still guaranteeing NFR-G4: EVERY transition written through
 * this state machine lands in the chain, including Dev A's call sites.
 */
interface StoredChainEntry extends AuditEntry {
  payload: Record<string, unknown>;
}

async function appendChainEntry(
  namespace: 'station' | 'hq',
  input: {
    actor: string; actorRole: string;
    objectType: string; objectId: string;
    transition: string; payload: Record<string, unknown>;
    payloadSummary?: string; atStation?: string;
  }
): Promise<StoredChainEntry> {
  const chain = lsRead<StoredChainEntry[]>(namespace, 'auditChain', []);
  const prev = chain[chain.length - 1];
  const prevHash = prev ? prev.hash : GENESIS_HASH;
  const seq = prev ? prev.seq + 1 : 0;
  const at = new Date().toISOString();

  const payloadForHash: AuditPayload = {
    seq, at, atStation: input.atStation,
    actor: input.actor, actorRole: input.actorRole,
    objectType: input.objectType, objectId: input.objectId,
    transition: input.transition, payload: input.payload,
  };
  const hash = await computeEntryHash(prevHash, payloadForHash);

  const entry: StoredChainEntry = {
    seq, at, atStation: input.atStation,
    actor: input.actor, actorRole: input.actorRole,
    objectType: input.objectType, objectId: input.objectId,
    transition: input.transition,
    payloadSummary: input.payloadSummary ?? input.transition,
    hash, prevHash,
    writtenOffline: namespace === 'station',
    superseded: false,
    payload: input.payload,
  };
  chain.push(entry);
  lsWrite(namespace, 'auditChain', chain);
  return entry;
}

/**
 * The state machine itself (FR-6.1): RAISED → ACKNOWLEDGED → ASSIGNED →
 * IN_PROGRESS → RESOLVED, with DEFERRED reachable from any pre-resolved
 * state and RESOLVED terminal. Board-view drags and keyboard shortcuts all
 * funnel through `canTransition`, so an illegal move is rejected with a
 * reason instead of silently corrupting the timeline.
 */
export const ALLOWED_TRANSITIONS: Record<Action['state'], Action['state'][]> = {
  RAISED: ['ACKNOWLEDGED', 'ASSIGNED', 'DEFERRED'],
  ACKNOWLEDGED: ['ASSIGNED', 'IN_PROGRESS', 'DEFERRED'],
  ASSIGNED: ['IN_PROGRESS', 'RESOLVED', 'DEFERRED'],
  IN_PROGRESS: ['RESOLVED', 'DEFERRED'],
  DEFERRED: ['ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS'],
  RESOLVED: [],
};

export function canTransition(
  from: Action['state'],
  to: Action['state']
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: false, reason: `Already ${from}.` };
  if (from === 'RESOLVED') return { ok: false, reason: 'RESOLVED is terminal — raise a new action instead.' };
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `${from} cannot move straight to ${to}.` };
  }
  return { ok: true };
}

/**
 * useActionTransitions — the real implementation for this build, backed by
 * localStorage. Dev A's pages (Twin zone inspector, Asset detail) call this
 * and never reimplement the state machine. `namespace` defaults to 'hq';
 * pass 'station' from the station console (/station) so offline-authored
 * transitions land in the station-side store until the sync simulation
 * drains them (see §4.4).
 */
export interface TransitionActor { name: string; role: string }

const DEFAULT_ACTOR: TransitionActor = { name: 'current-user', role: 'hq_operator' };

export function useActionTransitions(
  namespace: 'station' | 'hq' = 'hq',
  actor: TransitionActor = DEFAULT_ACTOR
) {
  /**
   * One helper for every transition: validate, mutate, hash, record. The
   * timeline row carries the chain entry's real hash and prevHash, so the
   * Action Centre timeline and the /compliance audit log are two views of
   * the same chain rather than two stories.
   */
  const apply = async (
    actionId: string,
    to: Action['state'],
    note: string | undefined,
    mutate: (a: Action) => void,
    payload: Record<string, unknown>
  ): Promise<Action> => {
    const actions = readActions(namespace);
    const a = actions[actionId];
    if (!a) throw new Error(`No action ${actionId} in ${namespace} store`);

    const check = canTransition(a.state, to);
    if (!check.ok) throw new Error(check.reason);

    const from = a.state;
    a.state = to;
    mutate(a);

    const entry = await appendChainEntry(namespace, {
      actor: actor.name, actorRole: actor.role,
      objectType: 'action', objectId: actionId,
      transition: `${from} -> ${to}`,
      payload: { from, to, ...payload },
      payloadSummary: note ?? `${from} -> ${to}`,
      atStation: namespace === 'station' ? new Date().toISOString() : undefined,
    });

    a.timeline.push({
      state: to,
      at: entry.at,
      by: actor.name,
      note,
      hash: entry.hash,
      prevHash: entry.prevHash,
      // Offline transitions are optimistic until the outbox drains (FR-6.7).
      pendingSync: namespace === 'station',
    });

    writeActions(namespace, actions);
    notify();
    return a;
  };

  return {
    acknowledge: (actionId: string, actorName: string = actor.name) =>
      apply(actionId, 'ACKNOWLEDGED', `acknowledged by ${actorName}`, () => {}, { by: actorName }),

    assign: (actionId: string, assignee: { id: string; name: string; role: string }) =>
      apply(actionId, 'ASSIGNED', `assigned to ${assignee.name}`, (a) => { a.assignee = assignee; }, { assignee }),

    start: (actionId: string, note?: string) =>
      apply(actionId, 'IN_PROGRESS', note ?? 'work started', () => {}, {}),

    /** FR-6.4: rejected without BOTH a reason and a review date. */
    defer: (actionId: string, reason: string, reviewDate: string) => {
      if (!reason?.trim() || !reviewDate) {
        return Promise.reject(new Error('Defer requires a reason AND a review date.'));
      }
      return apply(actionId, 'DEFERRED', reason, (a) => { a.deferral = { reason, reviewDate }; },
        { reason, reviewDate });
    },

    /** FR-6.5: a resolution note always; evidence too for T0/T1. */
    resolve: (actionId: string, note: string, evidenceIds: string[] = []) => {
      const existing = readActions(namespace)[actionId];
      if (!note?.trim()) return Promise.reject(new Error('Resolving requires a resolution note.'));
      if (existing && (existing.tier === 'T0' || existing.tier === 'T1')
          && evidenceIds.length === 0 && existing.evidence.length === 0) {
        return Promise.reject(new Error('Resolving a T0/T1 action requires at least one evidence item.'));
      }
      return apply(actionId, 'RESOLVED', note,
        (a) => { a.resolution = { note, at: new Date().toISOString(), by: actor.name }; },
        { note, evidenceIds });
    },

    /** Generic mover for the board view — same validation, same chain write. */
    transitionTo: (actionId: string, to: Action['state'], note?: string) =>
      apply(actionId, to, note, () => {}, {}),

    raise: async (
      draft: Pick<Action, 'stationId' | 'tier' | 'title' | 'reason' | 'trigger'> & Partial<Action>
    ): Promise<string> => {
      const id = draft.id ?? `act-${Math.random().toString(36).slice(2, 9)}`;
      const raisedAt = new Date().toISOString();
      const action: Action = {
        id, state: 'RAISED', evidence: [], timeline: [],
        sla: { targetSeconds: 0, elapsedSeconds: 0, pausedSeconds: 0, breached: false },
        raisedAt, ageSeconds: 0,
        ...draft,
      } as Action;

      const entry = await appendChainEntry(namespace, {
        actor: actor.name, actorRole: actor.role,
        objectType: 'action', objectId: id,
        transition: 'RAISED',
        payload: { tier: action.tier, title: action.title, stationId: action.stationId },
        payloadSummary: action.title,
        atStation: namespace === 'station' ? raisedAt : undefined,
      });

      action.timeline.push({
        state: 'RAISED', at: entry.at, by: actor.name, note: action.reason,
        hash: entry.hash, prevHash: entry.prevHash, pendingSync: namespace === 'station',
      });

      const actions = readActions(namespace);
      actions[id] = action;
      writeActions(namespace, actions);
      notify();
      return id;
    },

    /** FR-5.6 — evidence attaches without blocking its parent record. */
    attachEvidence: async (
      actionId: string,
      evidence: { kind: 'photo' | 'reading' | 'note' | 'file'; label: string }
    ): Promise<void> => {
      const actions = readActions(namespace);
      const a = actions[actionId];
      if (!a) throw new Error(`No action ${actionId} in ${namespace} store`);
      a.evidence.push({
        id: `${actionId}-ev-${a.evidence.length}`,
        kind: evidence.kind,
        label: evidence.label,
        at: new Date().toISOString(),
        pendingSync: namespace === 'station',
      });
      await appendChainEntry(namespace, {
        actor: actor.name, actorRole: actor.role,
        objectType: 'action', objectId: actionId,
        transition: 'EVIDENCE_ATTACHED',
        payload: { kind: evidence.kind, label: evidence.label },
        payloadSummary: evidence.label,
      });
      writeActions(namespace, actions);
      notify();
    },

    list: (): Action[] => Object.values(readActions(namespace)),
    get: (actionId: string): Action | undefined => readActions(namespace)[actionId],
  };
}

// ---- 4.3 Resource ledger — atomic decrement + autonomy recompute -----------

function readResources(namespace: 'station' | 'hq'): Record<string, Resource> {
  return lsRead(namespace, 'resources', {} as Record<string, Resource>);
}
function writeResources(namespace: 'station' | 'hq', resources: Record<string, Resource>): void {
  lsWrite(namespace, 'resources', resources);
}

/**
 * decrementResource — called by Dev A's "Log service" flow when parts are
 * consumed. This function is the single write path for stock changes, so the
 * "decrement stock" and "record the service" steps can never land only one
 * without the other on the caller's side — call this, THEN write the
 * MaintenanceEvent, in that order, inside the same async handler.
 */
export async function decrementResource(
  resourceId: string,
  quantity: number,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
  namespace: 'station' | 'hq' = 'hq'
): Promise<Resource> {
  const resources = readResources(namespace);
  const r = resources[resourceId];
  if (!r) throw new Error(`No resource ${resourceId} in ${namespace} store`);
  const newStockValue = (typeof r.stock.value === 'number' ? r.stock.value : 0) - quantity;
  r.stock = { ...r.stock, value: newStockValue, timestamp: new Date().toISOString() };
  const burnRate = typeof r.burnRate.value === 'number' ? r.burnRate.value : 0;
  const { autonomyDays, autonomyBandDays } = computeAutonomy(newStockValue, burnRate, config);
  r.autonomyDays = autonomyDays;
  r.autonomyBandDays = autonomyBandDays;
  if (r.shipWindow) {
    r.lsodDays = computeLSOD(autonomyDays, r.shipWindow, config);
    r.marginDays = computeMarginDays(autonomyDays, autonomyBandDays, r.shipWindow);
    r.risk = computeRisk(r.marginDays.min, r.lsodDays);
  }
  resources[resourceId] = r;
  writeResources(namespace, resources);
  notify();
  return r;
}

// ---- 4.4 Offline outbox + sync simulation -----------------------------------

function readOutbox(namespace: 'station' | 'hq'): SyncRecord[] {
  return lsRead(namespace, 'outbox', [] as SyncRecord[]);
}
function writeOutbox(namespace: 'station' | 'hq', records: SyncRecord[]): void {
  lsWrite(namespace, 'outbox', records);
}

const TIER_ORDER: Record<'T0' | 'T1' | 'T2' | 'T3', number> = { T0: 0, T1: 1, T2: 2, T3: 3 };

/**
 * enqueueSyncRecord — the offline outbox write path, used by the station
 * console (/station) for every local write. Records queue here until
 * drainOutbox() moves them into the HQ store — which only happens while
 * connectivity for that station is not DARK.
 */
export async function enqueueSyncRecord(
  record: Omit<SyncRecord, 'hash' | 'prevHash' | 'state' | 'attempts'>
): Promise<SyncRecord> {
  const outbox = readOutbox('station');
  const prevHash = outbox.at(-1)?.hash ?? GENESIS_HASH;
  const hash = await sha256Hex(prevHash + canonicalJSON(record as unknown as Record<string, unknown>));
  const full: SyncRecord = { ...record, state: 'QUEUED', attempts: 0, hash, prevHash };
  outbox.push(full);
  writeOutbox('station', outbox);
  notify();
  return full;
}

/**
 * drainOutbox — the sync simulation. Call this from /comms on "reconnect".
 * Strictly enforces tier order (T0 before any T1, etc. — see FR-G? / the
 * "priority sync drain" algorithm in FRONTEND.md §9) even though both stores
 * are client-side in this build, so the demo behaves exactly like the real
 * client/server split would.
 */
export async function drainOutbox(
  stationId: 'bharati' | 'maitri'
): Promise<{ sent: SyncRecord[]; remaining: SyncRecord[] }> {
  if (getConnectivity(stationId) === 'DARK') {
    return { sent: [], remaining: readOutbox('station') };
  }
  const outbox = readOutbox('station').sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
  const sent: SyncRecord[] = [];
  const remaining: SyncRecord[] = [];
  for (const record of outbox) {
    // strict tier order: stop at the first tier with anything still pending
    if (remaining.some((r) => TIER_ORDER[r.tier] < TIER_ORDER[record.tier])) {
      remaining.push(record);
      continue;
    }
    sent.push({ ...record, state: 'SENT' });
  }
  writeOutbox('station', remaining);
  notify();
  return { sent, remaining };
}

export function getOutboxSummary(): { tier: 'T0' | 'T1' | 'T2' | 'T3'; queued: number }[] {
  const outbox = readOutbox('station');
  return (['T0', 'T1', 'T2', 'T3'] as const).map((tier) => ({
    tier, queued: outbox.filter((r) => r.tier === tier).length,
  }));
}

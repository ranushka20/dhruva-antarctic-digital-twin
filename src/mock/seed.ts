// OWNER: Dev B
// seed — the primary data source for this build (FRONTEND.md §12: mock/ is
// primary, not a fallback).
//
// Honesty rules baked into the data itself:
//  - Station telemetry (fuel, generator load, inventory, maintenance, waste
//    masses) is SYNTH. None of it comes from NCPOR and the badges say so.
//  - Environmental values are MODELED from the public record (SCAR READER /
//    AMRC station climatology for Bharati and Maitri) — replayed, not live-
//    fetched, and labelled accordingly.
//  - Nothing derived from a stale input is stored with a confident deadline;
//    LSOD is computed at read time and returns null when inputs are stale.

import type {
  Action, CommunicationEvent, Conflict, InspectionRecord, Measurement,
  Obligation, Resource, SyncRecord, Tier, Voyage, WasteEvent, Zone,
} from '@/shared/contracts';
import type { StationId } from '@/state/connectivity';
import { live, derived, synth } from '@/lib/provenance';

const NOW = () => Date.now();
const iso = (msFromNow: number) => new Date(NOW() + msFromNow).toISOString();
const hours = (h: number) => h * 3_600_000;
const days = (d: number) => d * 86_400_000;

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

export interface StationProfile {
  id: StationId;
  code: 'BHR' | 'MTR';
  name: string;
  location: string;
  lat: number;
  lon: number;
  crew: number;
  /** Normalised 0–1 position used by the inline-SVG Antarctica map. */
  map: { x: number; y: number };
}

export const STATION_PROFILES: Record<StationId, StationProfile> = {
  bharati: {
    id: 'bharati',
    code: 'BHR',
    name: 'Bharati',
    location: 'Larsemann Hills, Prydz Bay',
    lat: -69.4069,
    lon: 76.1872,
    crew: 21,
    map: { x: 0.74, y: 0.55 },
  },
  maitri: {
    id: 'maitri',
    code: 'MTR',
    name: 'Maitri',
    location: 'Schirmacher Oasis, Queen Maud Land',
    lat: -70.766,
    lon: 11.7314,
    crew: 23,
    map: { x: 0.44, y: 0.28 },
  },
};

// ---------------------------------------------------------------------------
// Environment — MODELED from the public station record, replayed not fetched
// ---------------------------------------------------------------------------

const READER_SOURCE = 'SCAR READER / AMRC station record (replayed)';

export interface EnvSnapshot {
  ambientC: Measurement;
  windKt: Measurement;
  loadKw: Measurement;
  pressureHpa: Measurement;
}

export function envSnapshot(stationId: StationId): EnvSnapshot {
  const base = stationId === 'bharati' ? -14.6 : -19.2;
  const wind = stationId === 'bharati' ? 17 : 24;
  const load = stationId === 'bharati' ? 118 : 131;
  return {
    ambientC: derived(base, '°C', READER_SOURCE, 'monthly mean replay + diurnal offset', [
      { name: 'SCAR READER monthly mean', provenance: 'LIVE' },
    ]),
    windKt: derived(wind, 'kt', READER_SOURCE, 'monthly mean replay', [
      { name: 'AMRC AWS record', provenance: 'LIVE' },
    ]),
    loadKw: synth(load, 'kW', 'station SCADA adapter', { source: 'prototype placeholder' }),
    pressureHpa: derived(stationId === 'bharati' ? 985 : 972, 'hPa', READER_SOURCE, 'monthly mean replay', [
      { name: 'SCAR READER monthly mean', provenance: 'LIVE' },
    ]),
  };
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

function zone(code: string, name: string, status: Zone['status'], summary: Measurement, openActionCount = 0): Zone {
  return { code, name, status, summary, openActionCount };
}

export function seedZones(stationId: StationId): Zone[] {
  if (stationId === 'bharati') {
    return [
      zone('A1', 'Power', 'warning', synth(92, '% load', 'station SCADA adapter'), 1),
      zone('A2', 'Fuel', 'watch', synth(38, '% stock', 'station fuel telemetry'), 1),
      zone('A3', 'Comms', 'ok', synth(1, 'link up', 'station comms adapter')),
      zone('B1', 'Living', 'ok', synth(20.4, '°C', 'station BMS adapter')),
      zone('B2', 'Labs', 'ok', synth(19.1, '°C', 'station BMS adapter')),
      zone('B3', 'Storage', 'watch', synth(6.2, '°C', 'station BMS adapter'), 1),
    ];
  }
  return [
    zone('A1', 'Power', 'ok', synth(71, '% load', 'station SCADA adapter')),
    zone('A2', 'Fuel', 'warning', synth(24, '% stock', 'station fuel telemetry'), 2),
    zone('A3', 'Comms', 'warning', synth(0, 'link down', 'station comms adapter'), 1),
    zone('B1', 'Living', 'ok', synth(19.8, '°C', 'station BMS adapter')),
    zone('B2', 'Labs', 'watch', synth(15.4, '°C', 'station BMS adapter'), 1),
    zone('B3', 'Storage', 'ok', synth(4.8, '°C', 'station BMS adapter')),
  ];
}

// ---------------------------------------------------------------------------
// Voyages — the resupply season is the organising unit, not the month
// ---------------------------------------------------------------------------

export function seedVoyages(): Voyage[] {
  return [
    {
      id: 'voy-2627-1',
      name: 'Voyage 26/27-1',
      season: '2026-27',
      departureWindow: { from: iso(days(64)), to: iso(days(72)) },
      arrival: {
        bharati: { from: iso(days(93)), to: iso(days(101)) },
        maitri: { from: iso(days(107)), to: iso(days(114)) },
      },
      capacityKg: { min: 42000, max: 58000 },
      provenance: 'SYNTH',
      status: 'planned',
    },
    {
      id: 'voy-2627-2',
      name: 'Voyage 26/27-2',
      season: '2026-27',
      departureWindow: { from: iso(days(122)), to: iso(days(130)) },
      arrival: {
        bharati: { from: iso(days(147)), to: iso(days(155)) },
        maitri: { from: iso(days(158)), to: iso(days(166)) },
      },
      capacityKg: { min: 38000, max: 52000 },
      provenance: 'SYNTH',
      status: 'planned',
    },
    {
      id: 'voy-2526-3',
      name: 'Voyage 25/26-3',
      season: '2025-26',
      departureWindow: { from: iso(-days(232)), to: iso(-days(226)) },
      arrival: {
        bharati: { from: iso(-days(201)), to: iso(-days(196)) },
        maitri: { from: iso(-days(188)), to: iso(-days(182)) },
      },
      capacityKg: { min: 40000, max: 55000 },
      provenance: 'SYNTH',
      status: 'completed',
    },
  ];
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

function burnSeries(base: number, drift: number): { t: string; v: number }[] {
  // 12 weekly points. Deterministic wobble — no Math.random, so the same demo
  // renders the same sparkline every time.
  return Array.from({ length: 12 }, (_, i) => ({
    t: iso(-days((11 - i) * 7)),
    v: Number((base + drift * i + Math.sin(i * 1.7) * base * 0.03).toFixed(2)),
  }));
}

interface ResourceSeed {
  id: string;
  name: string;
  stationId: StationId;
  category: NonNullable<Resource['category']>;
  stock: number;
  unit: string;
  burnRate: number;
  burnDrift: number;
  reorderPoint: number;
  massPerUnitKg: number;
  awaiting: string;
}

const RESOURCE_SEEDS: ResourceSeed[] = [
  // ---- Bharati ----
  { id: 'bhr-hsd', name: 'HSD bulk fuel', stationId: 'bharati', category: 'fuel', stock: 168000, unit: 'L', burnRate: 1180, burnDrift: 9, reorderPoint: 60000, massPerUnitKg: 0.84, awaiting: 'station fuel telemetry' },
  { id: 'bhr-lpg', name: 'LPG cylinders', stationId: 'bharati', category: 'power', stock: 210, unit: 'cyl', burnRate: 1.9, burnDrift: 0.01, reorderPoint: 90, massPerUnitKg: 33, awaiting: 'station inventory system' },
  { id: 'bhr-prov', name: 'Dry provisions', stationId: 'bharati', category: 'provisions', stock: 9400, unit: 'kg', burnRate: 41, burnDrift: 0.12, reorderPoint: 3600, massPerUnitKg: 1, awaiting: 'station inventory system' },
  { id: 'bhr-med', name: 'Medical consumables', stationId: 'bharati', category: 'medical', stock: 1250, unit: 'unit', burnRate: 4.1, burnDrift: 0.02, reorderPoint: 500, massPerUnitKg: 0.4, awaiting: 'station inventory system' },
  { id: 'bhr-gensp', name: 'Generator spares (set 2)', stationId: 'bharati', category: 'spares', stock: 6, unit: 'set', burnRate: 0.055, burnDrift: 0.0008, reorderPoint: 4, massPerUnitKg: 62, awaiting: 'station maintenance records' },
  { id: 'bhr-ro', name: 'RO membranes', stationId: 'bharati', category: 'lifeSafety', stock: 9, unit: 'unit', burnRate: 0.06, burnDrift: 0.001, reorderPoint: 6, massPerUnitKg: 18, awaiting: 'station inventory system' },
  { id: 'bhr-sci', name: 'Aerosol filter cassettes', stationId: 'bharati', category: 'science', stock: 480, unit: 'unit', burnRate: 2.4, burnDrift: 0.01, reorderPoint: 120, massPerUnitKg: 0.05, awaiting: 'station inventory system' },

  // ---- Maitri ----
  { id: 'mtr-hsd', name: 'HSD bulk fuel', stationId: 'maitri', category: 'fuel', stock: 96500, unit: 'L', burnRate: 1310, burnDrift: 14, reorderPoint: 60000, massPerUnitKg: 0.84, awaiting: 'station fuel telemetry' },
  { id: 'mtr-prov', name: 'Dry provisions', stationId: 'maitri', category: 'provisions', stock: 8100, unit: 'kg', burnRate: 44, burnDrift: 0.1, reorderPoint: 3600, massPerUnitKg: 1, awaiting: 'station inventory system' },
  { id: 'mtr-med', name: 'Medical consumables', stationId: 'maitri', category: 'medical', stock: 640, unit: 'unit', burnRate: 4.6, burnDrift: 0.03, reorderPoint: 500, massPerUnitKg: 0.4, awaiting: 'station inventory system' },
  { id: 'mtr-gensp', name: 'Generator spares (set 1)', stationId: 'maitri', category: 'spares', stock: 3, unit: 'set', burnRate: 0.062, burnDrift: 0.0012, reorderPoint: 4, massPerUnitKg: 62, awaiting: 'station maintenance records' },
  { id: 'mtr-lube', name: 'Lubricants & hydraulics', stationId: 'maitri', category: 'power', stock: 2150, unit: 'L', burnRate: 11.8, burnDrift: 0.06, reorderPoint: 900, massPerUnitKg: 0.9, awaiting: 'station inventory system' },
  { id: 'mtr-sci', name: 'Ice-core sleeves', stationId: 'maitri', category: 'science', stock: 260, unit: 'unit', burnRate: 1.7, burnDrift: 0.008, reorderPoint: 80, massPerUnitKg: 0.3, awaiting: 'station inventory system' },
];

/**
 * Resources are stored as RAW FACTS only — stock, burn rate, category. Every
 * derived field (autonomy, band, margin, LSOD, risk) is recomputed at read
 * time from the engine and the current /settings values, which is what makes
 * "edit a voyage window, watch every LSOD move" real rather than staged.
 */
export function seedResources(): Resource[] {
  return RESOURCE_SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    stationId: s.stationId,
    category: s.category,
    stock: synth(s.stock, s.unit, s.awaiting),
    unit: s.unit,
    burnRate: synth(s.burnRate, s.unit + '/day', s.awaiting),
    burnSeries12w: burnSeries(s.burnRate, s.burnDrift),
    reorderPoint: s.reorderPoint,
    massPerUnitKg: s.massPerUnitKg,
    // Placeholders — overwritten on every read by the engine. Stored so a
    // cold start has something to render before the first recompute.
    autonomyDays: 0,
    autonomyBandDays: 0,
    marginDays: null,
    lsodDays: null,
    risk: 'ok',
    provenance: 'SYNTH',
  }));
}

// ---------------------------------------------------------------------------
// Roster — who an action can be assigned to (FR-6.3)
// ---------------------------------------------------------------------------

export interface RosterMember { id: string; name: string; role: string; stationId: StationId }

export const ROSTER: RosterMember[] = [
  { id: 'bhr-eng-1', name: 'R. Nair', role: 'Station engineer', stationId: 'bharati' },
  { id: 'bhr-eng-2', name: 'D. Kulkarni', role: 'Power systems', stationId: 'bharati' },
  { id: 'bhr-log-1', name: 'P. Sharma', role: 'Logistics officer', stationId: 'bharati' },
  { id: 'bhr-med-1', name: 'Dr. A. Bose', role: 'Station doctor', stationId: 'bharati' },
  { id: 'mtr-eng-1', name: 'V. Chandran', role: 'Station engineer', stationId: 'maitri' },
  { id: 'mtr-eng-2', name: 'T. Dorji', role: 'Mechanical', stationId: 'maitri' },
  { id: 'mtr-log-1', name: 'S. Banerjee', role: 'Logistics officer', stationId: 'maitri' },
  { id: 'mtr-com-1', name: 'H. Mishra', role: 'Comms officer', stationId: 'maitri' },
];

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface ActionSeed {
  id: string;
  stationId: StationId;
  tier: Tier;
  title: string;
  reason: string;
  state: Action['state'];
  zoneCode?: string;
  assetId?: string;
  resourceId?: string;
  ageHours: number;
  trigger: Action['trigger'];
  consequence?: Action['consequence'];
  assigneeId?: string;
  deferral?: Action['deferral'];
  resolution?: Action['resolution'];
  evidence?: { kind: 'photo' | 'reading' | 'note' | 'file'; label: string; pendingSync?: boolean }[];
  similar?: Action['similar'];
}

const ACTION_SEEDS: ActionSeed[] = [
  {
    id: 'act-bhr-001',
    stationId: 'bharati',
    tier: 'T1',
    title: 'Generator #2 running above continuous rating',
    reason: 'Sustained load above 85% for 6 h while #1 is on service hold — no N+1 margin.',
    state: 'RAISED',
    zoneCode: 'A1',
    assetId: 'bhr-gen-02',
    ageHours: 5.2,
    trigger: {
      metricName: 'Generator #2 electrical load',
      measurement: synth(92, '%', 'station SCADA adapter'),
      threshold: { value: 85, unit: '%', label: 'continuous rating' },
    },
    consequence: { kind: 'autonomy', before: 142, after: 126, unit: 'd', label: 'autonomy −16 d' },
    evidence: [{ kind: 'reading', label: 'Load trend 06:00–12:00 IST' }],
    similar: [
      { actionId: 'act-bhr-h07', title: 'Generator #1 over-rating during blizzard', score: 0.71, resolution: 'Shed lab load, rebalanced across #1/#3', provenance: 'SYNTH' },
      { actionId: 'act-mtr-h02', title: 'Gen set over-rating after heater bank fault', score: 0.52, resolution: 'Heater bank isolated, load returned to 74%', provenance: 'SYNTH' },
    ],
  },
  {
    id: 'act-mtr-001',
    stationId: 'maitri',
    tier: 'T1',
    title: 'HSD stock below reorder point',
    reason: 'Bulk fuel at 24% with burn rate rising; the next feasible sailing is inside the lead time.',
    state: 'RAISED',
    zoneCode: 'A2',
    resourceId: 'mtr-hsd',
    ageHours: 31.6,
    trigger: {
      metricName: 'HSD bulk stock',
      measurement: synth(96500, 'L', 'station fuel telemetry'),
      threshold: { value: 60000, unit: 'L', label: 'reorder point' },
    },
    consequence: { kind: 'lsod', before: 41, after: 12, unit: 'd', label: 'LSOD in 12 d' },
    evidence: [{ kind: 'reading', label: 'Tank gauge 04:10 IST', pendingSync: true }],
    similar: [
      { actionId: 'act-mtr-h11', title: 'Fuel below reorder ahead of 24/25 voyage', score: 0.83, resolution: 'Pulled forward to voyage 1 manifest, 40 kL loaded', provenance: 'SYNTH' },
    ],
  },
  {
    id: 'act-mtr-002',
    stationId: 'maitri',
    tier: 'T0',
    title: 'Lab B2 temperature below occupied minimum',
    reason: 'Occupied laboratory at 15.4 °C against a 16 °C floor — a life-safety threshold, not a comfort one.',
    state: 'ACKNOWLEDGED',
    zoneCode: 'B2',
    ageHours: 2.1,
    assigneeId: 'mtr-eng-1',
    trigger: {
      metricName: 'Zone B2 air temperature',
      measurement: synth(15.4, '°C', 'station BMS adapter'),
      threshold: { value: 16, unit: '°C', label: 'occupied minimum' },
    },
    consequence: { kind: 'safety', before: 16, after: 15.4, unit: '°C', label: 'below occupied minimum' },
    evidence: [{ kind: 'reading', label: 'Zone sensor trace, 6 h' }],
  },
  {
    id: 'act-mtr-003',
    stationId: 'maitri',
    tier: 'T1',
    title: 'Satellite terminal offline — no contact since 04:10',
    reason: 'Outbound link lost mid-transfer; station is writing locally with 23 records queued.',
    state: 'ASSIGNED',
    zoneCode: 'A3',
    ageHours: 31.7,
    assigneeId: 'mtr-com-1',
    trigger: {
      metricName: 'Link state',
      measurement: synth('DARK', '', 'station comms adapter'),
    },
    consequence: { kind: 'compliance', before: 0, after: 23, unit: 'records', label: '23 records queued offline' },
    evidence: [{ kind: 'note', label: 'Terminal reboot attempted 04:40', pendingSync: true }],
  },
  {
    id: 'act-bhr-002',
    stationId: 'bharati',
    tier: 'T2',
    title: 'Waste return for August not submitted',
    reason: 'Monthly waste return is 3 days past its due date. Evidence is on station and queued.',
    state: 'RAISED',
    ageHours: 74,
    trigger: {
      metricName: 'Obligation due date',
      measurement: synth('overdue 3 d', '', 'compliance register'),
      threshold: { value: 0, unit: 'd', label: 'due date' },
    },
    consequence: { kind: 'compliance', before: 0, after: 3, unit: 'd', label: 'compliance overdue 3 d' },
  },
  {
    id: 'act-bhr-003',
    stationId: 'bharati',
    tier: 'T2',
    title: 'Cold store B3 above set point',
    reason: 'Storage zone at 6.2 °C against a 4 °C set point for 9 h — provisions spoilage risk.',
    state: 'IN_PROGRESS',
    zoneCode: 'B3',
    ageHours: 9.4,
    assigneeId: 'bhr-eng-2',
    trigger: {
      metricName: 'Zone B3 air temperature',
      measurement: synth(6.2, '°C', 'station BMS adapter'),
      threshold: { value: 4, unit: '°C', label: 'cold store set point' },
    },
    consequence: { kind: 'autonomy', before: 229, after: 216, unit: 'd', label: 'autonomy −13 d' },
    evidence: [{ kind: 'photo', label: 'Condenser icing, B3 plant room' }],
  },
  {
    id: 'act-bhr-004',
    stationId: 'bharati',
    tier: 'T2',
    title: 'RO membrane set due for replacement',
    reason: 'Membrane hours past the service interval; only 9 spares on station.',
    state: 'DEFERRED',
    ageHours: 200,
    assetId: 'bhr-ro-01',
    resourceId: 'bhr-ro',
    assigneeId: 'bhr-eng-1',
    deferral: {
      reason: 'Water quality within limits; replacement scheduled with the November plant shutdown.',
      reviewDate: iso(days(38)),
    },
    trigger: {
      metricName: 'Membrane service hours',
      measurement: synth(8760, 'h', 'station maintenance records'),
      threshold: { value: 8000, unit: 'h', label: 'service interval' },
    },
    consequence: { kind: 'autonomy', before: 150, after: 140, unit: 'd', label: 'autonomy −10 d' },
  },
  {
    id: 'act-mtr-004',
    stationId: 'maitri',
    tier: 'T2',
    title: 'Generator spares below minimum holding',
    reason: '3 sets on station against a minimum of 4, with two services due next rotation.',
    state: 'RAISED',
    zoneCode: 'A1',
    resourceId: 'mtr-gensp',
    ageHours: 51,
    trigger: {
      metricName: 'Generator spares on hand',
      measurement: synth(3, 'set', 'station inventory system'),
      threshold: { value: 4, unit: 'set', label: 'minimum holding' },
    },
    consequence: { kind: 'lsod', before: 60, after: 27, unit: 'd', label: 'LSOD in 27 d' },
  },
  {
    id: 'act-bhr-005',
    stationId: 'bharati',
    tier: 'T3',
    title: 'Aerosol sampler cassette backlog',
    reason: 'Bulk science records queued behind operational traffic for 6 days.',
    state: 'RAISED',
    ageHours: 144,
    trigger: {
      metricName: 'Queued science records',
      measurement: synth(64, 'records', 'station outbox'),
    },
  },
  {
    id: 'act-mtr-005',
    stationId: 'maitri',
    tier: 'T3',
    title: 'Ice-core sleeve stock trending low',
    reason: 'Consumption above plan; not operationally critical this rotation.',
    state: 'DEFERRED',
    resourceId: 'mtr-sci',
    ageHours: 300,
    deferral: {
      reason: 'Science programme can re-use sleeves for shallow cores this season.',
      reviewDate: iso(days(21)),
    },
    trigger: {
      metricName: 'Ice-core sleeves on hand',
      measurement: synth(260, 'unit', 'station inventory system'),
      threshold: { value: 80, unit: 'unit', label: 'reorder point' },
    },
  },
  {
    id: 'act-bhr-006',
    stationId: 'bharati',
    tier: 'T1',
    title: 'Fuel transfer pump seal weep',
    reason: 'Weep observed at the day-tank transfer pump; containment tray in use.',
    state: 'RESOLVED',
    zoneCode: 'A2',
    assetId: 'bhr-pump-03',
    ageHours: 410,
    assigneeId: 'bhr-eng-1',
    resolution: { note: 'Seal kit replaced, 2 h run-in clean. Spare seal kit consumed from stores.', at: iso(-hours(380)), by: 'R. Nair' },
    trigger: {
      metricName: 'Visual inspection',
      measurement: synth('weep at shaft seal', '', 'station maintenance records'),
    },
    evidence: [
      { kind: 'photo', label: 'Seal face before replacement' },
      { kind: 'note', label: 'Run-in log, 2 h' },
    ],
  },
  {
    id: 'act-mtr-006',
    stationId: 'maitri',
    tier: 'T2',
    title: 'Hazardous waste drum labelling incomplete',
    reason: 'Two drums staged for shipment without container IDs recorded.',
    state: 'RESOLVED',
    ageHours: 520,
    resolution: { note: 'Drums re-labelled and reconciled against the waste ledger.', at: iso(-hours(500)), by: 'S. Banerjee' },
    trigger: {
      metricName: 'Inspection finding',
      measurement: synth('2 drums unlabelled', '', 'station compliance records'),
    },
  },
  {
    id: 'act-bhr-007',
    stationId: 'bharati',
    tier: 'T2',
    title: 'Sync failure — attachment batch retried 5 times',
    reason: 'Attachment batch exceeded the configured retry limit and was escalated automatically.',
    state: 'RAISED',
    ageHours: 12.5,
    trigger: {
      metricName: 'Outbox attempts',
      measurement: synth(5, 'attempts', 'sync simulation'),
      threshold: { value: 5, unit: 'attempts', label: 'max attempts' },
    },
    consequence: { kind: 'compliance', before: 0, after: 4, unit: 'records', label: '4 attachments unsent' },
  },
  {
    id: 'act-mtr-007',
    stationId: 'maitri',
    tier: 'T0',
    title: 'Medical consumables below 30-day cover',
    reason: 'Stock covers under 30 days of consumption with no voyage inside the lead time.',
    state: 'RAISED',
    resourceId: 'mtr-med',
    ageHours: 0.6,
    trigger: {
      metricName: 'Medical consumables cover',
      measurement: synth(640, 'unit', 'station inventory system'),
      threshold: { value: 30, unit: 'd', label: 'minimum cover' },
    },
    consequence: { kind: 'lsod', before: 30, after: 9, unit: 'd', label: 'LSOD in 9 d' },
  },
];

export function seedActions(): Action[] {
  return ACTION_SEEDS.map((s) => {
    const raisedAt = iso(-hours(s.ageHours));
    const assignee = s.assigneeId ? ROSTER.find((r) => r.id === s.assigneeId) : undefined;
    return {
      id: s.id,
      stationId: s.stationId,
      zoneCode: s.zoneCode,
      assetId: s.assetId,
      tier: s.tier,
      title: s.title,
      reason: s.reason,
      state: s.state,
      trigger: s.trigger,
      consequence: s.consequence,
      assignee: assignee ? { id: assignee.id, name: assignee.name, role: assignee.role } : undefined,
      deferral: s.deferral,
      resolution: s.resolution,
      evidence: (s.evidence ?? []).map((e, i) => ({
        id: s.id + '-ev-' + i,
        kind: e.kind,
        label: e.label,
        at: iso(-hours(s.ageHours - 0.3)),
        pendingSync: Boolean(e.pendingSync),
      })),
      timeline: [],   // built by bootstrap, which hashes each transition
      sla: { targetSeconds: 0, elapsedSeconds: 0, pausedSeconds: 0, breached: false },
      raisedAt,
      ageSeconds: Math.round(s.ageHours * 3600),
      similar: s.similar,
      // Carried through so the ledger row action can find its resource.
      ...(s.resourceId ? { resourceId: s.resourceId } : {}),
    } as Action & { resourceId?: string };
  });
}

/** The transitions each seeded action has already been through. */
export function seedTimelineTransitions(action: Action): { state: string; hoursAgo: number; by: string; note?: string }[] {
  const age = action.ageSeconds / 3600;
  const steps: { state: string; hoursAgo: number; by: string; note?: string }[] = [
    { state: 'RAISED', hoursAgo: age, by: 'rule engine', note: action.reason },
  ];
  const actor = action.assignee?.name ?? 'A. Raghavan';
  if (['ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].includes(action.state)) {
    steps.push({ state: 'ACKNOWLEDGED', hoursAgo: age * 0.75, by: 'A. Raghavan' });
  }
  if (['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].includes(action.state)) {
    steps.push({ state: 'ASSIGNED', hoursAgo: age * 0.6, by: 'A. Raghavan', note: 'assigned to ' + actor });
  }
  if (['IN_PROGRESS', 'RESOLVED'].includes(action.state)) {
    steps.push({ state: 'IN_PROGRESS', hoursAgo: age * 0.4, by: actor });
  }
  if (action.state === 'RESOLVED') {
    steps.push({ state: 'RESOLVED', hoursAgo: age * 0.1, by: action.resolution?.by ?? actor, note: action.resolution?.note });
  }
  if (action.state === 'DEFERRED') {
    steps.push({ state: 'DEFERRED', hoursAgo: age * 0.3, by: 'A. Raghavan', note: action.deferral?.reason });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Compliance — obligations, waste ledger, inspections
// ---------------------------------------------------------------------------

export function seedObligations(): Obligation[] {
  const o = (
    id: string, name: string, category: string, stationId: StationId,
    cadence: Obligation['cadence'], dueInDays: number, owner: string,
    status: Obligation['status'], extra: Partial<Obligation> = {}
  ): Obligation => ({
    id, name, category, stationId, cadence,
    dueDate: iso(days(dueInDays)),
    owner, status,
    templateId: 'tmpl-' + category,
    templateVersion: 3,
    ...extra,
  });

  return [
    o('obl-001', 'Monthly waste return — August', 'waste return', 'bharati', 'monthly', -3, 'P. Sharma', 'overdue', { linkedActionId: 'act-bhr-002' }),
    o('obl-002', 'Monthly waste return — August', 'waste return', 'maitri', 'monthly', -1, 'S. Banerjee', 'queued_offline'),
    o('obl-003', 'Fuel handling record — Q3', 'fuel-handling record', 'bharati', 'quarterly', 11, 'R. Nair', 'due_soon'),
    o('obl-004', 'Fuel handling record — Q3', 'fuel-handling record', 'maitri', 'quarterly', 11, 'V. Chandran', 'due_soon'),
    o('obl-005', 'Wildlife interaction log — season', 'wildlife interaction log', 'bharati', 'seasonal', 46, 'Dr. A. Bose', 'future'),
    o('obl-006', 'EIA — Larsemann Hills drilling programme', 'EIA', 'bharati', 'event-driven', 24, 'P. Sharma', 'due_soon'),
    o('obl-007', 'Station inspection report — mid-season', 'inspection report', 'maitri', 'seasonal', -8, 'H. Mishra', 'queued_offline'),
    o('obl-008', 'Seasonal operational return 2025-26', 'seasonal operational return', 'bharati', 'annual', 92, 'P. Sharma', 'future'),
    o('obl-009', 'Seasonal operational return 2025-26', 'seasonal operational return', 'maitri', 'annual', 92, 'S. Banerjee', 'future'),
    o('obl-010', 'Incident report — fuel transfer weep', 'incident report', 'bharati', 'event-driven', -14, 'R. Nair', 'submitted', { lastSubmissionId: 'rec-inc-004' }),
    o('obl-011', 'Monthly waste return — July', 'waste return', 'bharati', 'monthly', -34, 'P. Sharma', 'submitted', { lastSubmissionId: 'rec-wst-071' }),
    o('obl-012', 'Monthly waste return — July', 'waste return', 'maitri', 'monthly', -34, 'S. Banerjee', 'submitted', { lastSubmissionId: 'rec-wst-072' }),
  ];
}

const STREAMS: WasteEvent['stream'][] = ['general', 'recyclable', 'hazardous', 'fuel_oily', 'food', 'sewage', 'medical', 'scientific'];

export function seedWasteEvents(): WasteEvent[] {
  const events: WasteEvent[] = [];
  const handlers: Record<StationId, string> = { bharati: 'P. Sharma', maitri: 'S. Banerjee' };

  // Six months of generation, deterministic, per station per stream.
  (['bharati', 'maitri'] as StationId[]).forEach((stationId) => {
    STREAMS.forEach((stream, si) => {
      for (let month = 5; month >= 0; month--) {
        const base = [420, 180, 46, 95, 260, 1100, 12, 38][si];
        const factor = stationId === 'bharati' ? 1 : 0.88;
        const mass = Number((base * factor * (1 + Math.sin((month + si) * 0.9) * 0.08)).toFixed(1));
        events.push({
          id: `wst-${stationId}-${stream}-m${month}`,
          stationId,
          stream,
          direction: 'generated',
          massKg: synth(mass, 'kg', 'station waste records'),
          handler: handlers[stationId],
          at: iso(-days(month * 30 + 4)),
          evidence: [],
          auditHash: '',
          pendingSync: false,
        });
      }
    });

    // Removals on the completed 25/26 voyage.
    STREAMS.forEach((stream, si) => {
      const shipped = [1800, 760, 190, 380, 980, 0, 44, 150][si] * (stationId === 'bharati' ? 1 : 0.86);
      if (shipped <= 0) return;
      events.push({
        id: `wst-${stationId}-${stream}-ship`,
        stationId,
        stream,
        direction: 'shipped',
        massKg: synth(Number(shipped.toFixed(1)), 'kg', 'station waste records'),
        containerId: `${stationId.slice(0, 3).toUpperCase()}-${stream.toUpperCase().slice(0, 4)}-01`,
        handler: handlers[stationId],
        destination: 'Cape Town — licensed contractor',
        voyageId: 'voy-2526-3',
        at: iso(-days(stationId === 'bharati' ? 198 : 185)),
        evidence: [{ id: `wst-ev-${stationId}-${stream}`, kind: 'file', label: 'Transfer note' }],
        auditHash: '',
        pendingSync: false,
      });
    });
  });

  // A deliberate mismatch so the balance check has something real to catch
  // (FR-3.4). Hazardous stream at Maitri: mass removed exceeds what the
  // ledger says was generated and stored.
  events.push({
    id: 'wst-maitri-hazardous-adj',
    stationId: 'maitri',
    stream: 'hazardous',
    direction: 'shipped',
    massKg: synth(140, 'kg', 'station waste records'),
    containerId: 'MTR-HAZA-02',
    handler: 'S. Banerjee',
    destination: 'Cape Town — licensed contractor',
    voyageId: 'voy-2526-3',
    at: iso(-days(185)),
    evidence: [],
    auditHash: '',
    pendingSync: true,
  });

  return events;
}

export function seedInspections(): InspectionRecord[] {
  return [
    {
      id: 'insp-001',
      stationId: 'bharati',
      type: 'Fuel handling area',
      templateId: 'tmpl-fuel-inspection',
      templateVersion: 4,
      scope: { zoneCodes: ['A2'] },
      inspector: 'R. Nair',
      at: iso(-days(12)),
      items: [
        { id: 'i1', label: 'Bunding intact and free of standing fuel', result: 'pass' },
        { id: 'i2', label: 'Transfer hoses within test date', result: 'fail', note: 'One hose 2 months past test date', linkedActionId: 'act-bhr-006' },
        { id: 'i3', label: 'Spill kit complete', result: 'pass' },
        { id: 'i4', label: 'Static bonding continuity verified', result: 'na', note: 'Test set unavailable' },
      ],
      result: 'pass_with_findings',
      auditHash: '',
    },
    {
      id: 'insp-002',
      stationId: 'maitri',
      type: 'Waste storage compound',
      templateId: 'tmpl-waste-inspection',
      templateVersion: 2,
      scope: { zoneCodes: ['B3'] },
      inspector: 'S. Banerjee',
      at: iso(-days(21)),
      items: [
        { id: 'i1', label: 'Streams segregated per protocol', result: 'pass' },
        { id: 'i2', label: 'All containers labelled with IDs', result: 'fail', note: 'Two hazardous drums unlabelled', linkedActionId: 'act-mtr-006' },
        { id: 'i3', label: 'No wind-scatter from the compound', result: 'pass' },
      ],
      result: 'pass_with_findings',
      auditHash: '',
    },
    {
      id: 'insp-003',
      stationId: 'bharati',
      type: 'Power plant',
      templateId: 'tmpl-power-inspection',
      templateVersion: 3,
      scope: { zoneCodes: ['A1'], assetIds: ['bhr-gen-01', 'bhr-gen-02', 'bhr-gen-03'] },
      inspector: 'D. Kulkarni',
      at: iso(-days(5)),
      items: [
        { id: 'i1', label: 'Exhaust system integrity', result: 'pass' },
        { id: 'i2', label: 'N+1 redundancy available', result: 'fail', note: 'Gen #1 on service hold — no redundancy' },
        { id: 'i3', label: 'Day tank levels logged', result: 'pass' },
      ],
      result: 'fail',
      auditHash: '',
    },
    {
      id: 'insp-004',
      stationId: 'maitri',
      type: 'Living quarters — fire safety',
      templateId: 'tmpl-fire-inspection',
      templateVersion: 5,
      scope: { zoneCodes: ['B1'] },
      inspector: 'V. Chandran',
      at: iso(-days(30)),
      items: [
        { id: 'i1', label: 'Detection heads clean and in date', result: 'pass' },
        { id: 'i2', label: 'Escape routes clear', result: 'pass' },
        { id: 'i3', label: 'Extinguishers serviced', result: 'pass' },
      ],
      result: 'pass',
      auditHash: '',
    },
  ];
}

// ---------------------------------------------------------------------------
// Comms — link history, station outbox, reconciliation conflicts
// ---------------------------------------------------------------------------

export function seedLinkHistory(stationId: StationId): CommunicationEvent[] {
  const events: CommunicationEvent[] = [];
  const push = (state: CommunicationEvent['state'], fromHoursAgo: number, toHoursAgo: number | null, cause?: string) => {
    const from = iso(-hours(fromHoursAgo));
    const to = toHoursAgo === null ? undefined : iso(-hours(toHoursAgo));
    events.push({
      stationId,
      state,
      from,
      to,
      durationSeconds: toHoursAgo === null ? 0 : Math.round((fromHoursAgo - toHoursAgo) * 3600),
      cause,
    });
  };

  if (stationId === 'bharati') {
    push('LIVE', 168, 121);
    push('LAGGING', 121, 118, 'ground-station maintenance window (MODELED from pass schedule)');
    push('LIVE', 118, 74);
    push('DARK', 74, 69, 'terminal fault (SYNTH — cause not confirmed)');
    push('LIVE', 69, 26);
    push('LAGGING', 26, 25.2, 'weather-related signal loss (MODELED)');
    push('LIVE', 25.2, null);
  } else {
    push('LIVE', 168, 140);
    push('LAGGING', 140, 137, 'scheduled pass gap (SYNTH)');
    push('LIVE', 137, 96);
    push('DARK', 96, 88, 'blizzard — antenna icing (MODELED from station weather)');
    push('LIVE', 88, 33.3);
    push('DARK', 33.3, null, 'terminal offline since 04:10 IST (SYNTH — cause not confirmed)');
  }
  return events;
}

const RECORD_TYPES: SyncRecord['type'][] = ['action', 'fault', 'inventory', 'compliance', 'measurement', 'attachment', 'handover'];

/** The station-side outbox: what Maitri has written while DARK. */
export function seedOutbox(): SyncRecord[] {
  const specs: { tier: Tier; type: SyncRecord['type']; label: string; size: number; hoursAgo: number; station: StationId }[] = [
    { tier: 'T0', type: 'action', label: 'Lab B2 below occupied minimum', size: 1840, hoursAgo: 2.1, station: 'maitri' },
    { tier: 'T0', type: 'action', label: 'Medical cover below 30 days', size: 1620, hoursAgo: 0.6, station: 'maitri' },
    { tier: 'T1', type: 'fault', label: 'Satellite terminal offline', size: 2410, hoursAgo: 31.7, station: 'maitri' },
    { tier: 'T1', type: 'inventory', label: 'HSD tank gauge reading', size: 640, hoursAgo: 31.4, station: 'maitri' },
    { tier: 'T1', type: 'action', label: 'Generator spares below minimum', size: 1980, hoursAgo: 28.2, station: 'maitri' },
    { tier: 'T1', type: 'fault', label: 'Heater bank 3 intermittent trip', size: 2210, hoursAgo: 22.5, station: 'maitri' },
    { tier: 'T2', type: 'inventory', label: 'Provisions issue — week 38', size: 1280, hoursAgo: 30.9, station: 'maitri' },
    { tier: 'T2', type: 'compliance', label: 'Waste return August — draft', size: 7400, hoursAgo: 29.6, station: 'maitri' },
    { tier: 'T2', type: 'compliance', label: 'Mid-season inspection record', size: 9120, hoursAgo: 27.1, station: 'maitri' },
    { tier: 'T2', type: 'inventory', label: 'Lubricant drum issue', size: 820, hoursAgo: 24.3, station: 'maitri' },
    { tier: 'T2', type: 'action', label: 'Ice-core sleeve stock note', size: 760, hoursAgo: 20.8, station: 'maitri' },
    { tier: 'T2', type: 'measurement', label: 'Zone temperature series, 24 h', size: 15400, hoursAgo: 18.4, station: 'maitri' },
    { tier: 'T2', type: 'attachment', label: 'Photo — heater bank 3 contactor', size: 184000, hoursAgo: 22.2, station: 'maitri' },
    { tier: 'T2', type: 'attachment', label: 'Photo — hazardous drum labels', size: 162000, hoursAgo: 17.6, station: 'maitri' },
    { tier: 'T3', type: 'measurement', label: 'Ice-core log, cores 214–229', size: 46000, hoursAgo: 26.4, station: 'maitri' },
    { tier: 'T3', type: 'measurement', label: 'Radiosonde ascent 12Z', size: 38000, hoursAgo: 14.2, station: 'maitri' },
    { tier: 'T3', type: 'attachment', label: 'Aerosol sampler raw dump', size: 512000, hoursAgo: 12.9, station: 'maitri' },
    { tier: 'T3', type: 'measurement', label: 'Snow accumulation stakes', size: 9400, hoursAgo: 9.1, station: 'maitri' },
    { tier: 'T3', type: 'measurement', label: 'Katabatic wind log', size: 21000, hoursAgo: 6.3, station: 'maitri' },
    { tier: 'T3', type: 'attachment', label: 'Time-lapse, ice shelf camera', size: 740000, hoursAgo: 4.8, station: 'maitri' },
    { tier: 'T2', type: 'handover', label: 'Rotation notes draft', size: 5200, hoursAgo: 3.2, station: 'maitri' },
    { tier: 'T3', type: 'measurement', label: 'Magnetometer hourly means', size: 16800, hoursAgo: 2.4, station: 'maitri' },
    { tier: 'T3', type: 'measurement', label: 'GPS baseline solution', size: 11200, hoursAgo: 1.1, station: 'maitri' },
  ];

  return specs.map((s, i) => ({
    id: `sync-seed-${i.toString().padStart(3, '0')}`,
    stationId: s.station,
    tier: s.tier,
    type: s.type,
    payloadRef: s.label,
    sizeBytes: s.size,
    createdAtStation: iso(-hours(s.hoursAgo)),
    enqueuedAt: iso(-hours(s.hoursAgo) + 2000),
    state: 'QUEUED',
    attempts: 0,
    hash: '',
    prevHash: '',
  }));
}

export function seedConflicts(): Conflict[] {
  return [
    {
      objectType: 'action',
      objectId: 'act-mtr-002',
      hqVersion: {
        actor: 'A. Raghavan',
        at: iso(-hours(1.4)),
        fields: { state: 'ACKNOWLEDGED', assignee: 'unassigned', note: 'Acknowledged at HQ pending station contact' },
      },
      stationVersion: {
        actor: 'V. Chandran',
        at: iso(-hours(1.9)),
        fields: { state: 'IN_PROGRESS', assignee: 'V. Chandran', note: 'Heater bank 3 isolated, portable heater in place' },
      },
      differingFields: ['state', 'assignee', 'note'],
      defaultResolution: 'station',
    },
    {
      objectType: 'resource',
      objectId: 'mtr-hsd',
      hqVersion: { actor: 'P. Sharma', at: iso(-hours(20)), fields: { stock: 98000, source: 'last synced gauge' } },
      stationVersion: { actor: 'V. Chandran', at: iso(-hours(31.4)), fields: { stock: 96500, source: 'manual dip 04:10 IST' } },
      differingFields: ['stock'],
      defaultResolution: 'station',
    },
  ];
}

export { RECORD_TYPES, STREAMS };
export const ENV_SOURCE_NOTE =
  'Environmental values replay the public station record (SCAR READER, AMRC, NCPOR NPDC). ' +
  'Fuel, generator, inventory, maintenance and waste figures are SYNTH — NCPOR has not shared that telemetry.';
export { live };

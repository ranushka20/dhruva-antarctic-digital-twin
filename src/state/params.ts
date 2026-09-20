// OWNER: Dev B
// params — the parameter registry behind /settings.
//
// NFR-B1: no constant used anywhere in the coupling engine may be absent from
// this registry. Every value here is an ASSUMPTION until NCPOR confirms it,
// which is exactly why it is editable and provenance-badged rather than
// buried in code. getEngineConfig() is the only way a page should build an
// EngineConfig — that is what keeps /settings honest.

import {
  type Parameter,
  type EngineConfig,
  type Provenance,
  DEFAULT_ENGINE_CONFIG,
} from '@/shared/contracts';
import { readStore, writeStore } from '@/lib/localStore';

export type ParamScope = 'global' | 'bharati' | 'maitri';
type ParamValue = number | string | boolean;

const ASSUMPTION = 'assumption — pending NCPOR confirmation';
const PUBLISHED = 'published formula / public standard';

type Def = Omit<Parameter, 'scope' | 'overriddenFromGlobal' | 'value'> & { value: ParamValue };

function def(
  key: string,
  group: Parameter['group'],
  label: string,
  value: ParamValue,
  opts: Partial<Def> = {}
): Def {
  return {
    key, group, label,
    value,
    default: opts.default ?? value,
    unit: opts.unit,
    min: opts.min, max: opts.max,
    source: opts.source ?? ASSUMPTION,
    provenance: opts.provenance ?? ('SYNTH' as Provenance),
    usedBy: opts.usedBy ?? [],
    confirmedBy: opts.confirmedBy,
    confirmedAt: opts.confirmedAt,
    lastChangedBy: opts.lastChangedBy,
    lastChangedAt: opts.lastChangedAt,
  };
}

// ---- The registry -----------------------------------------------------------

export const PARAM_DEFS: Def[] = [
  // ---- Logistics (FR-B3) ----
  def('logistics.procurementLeadDays', 'logistics', 'Procurement lead time', DEFAULT_ENGINE_CONFIG.procurementLeadDays, {
    unit: 'days', min: 0, max: 180, usedBy: ['computeLSOD'],
  }),
  def('logistics.consolidationDays', 'logistics', 'Consolidation at port', DEFAULT_ENGINE_CONFIG.consolidationDays, {
    unit: 'days', min: 0, max: 90, usedBy: ['computeLSOD'],
  }),
  def('logistics.transitDays', 'logistics', 'Sea transit duration', DEFAULT_ENGINE_CONFIG.transitDays, {
    unit: 'days', min: 1, max: 120, usedBy: ['computeLSOD'],
  }),
  def('logistics.unloadingDays', 'logistics', 'Unloading at station', DEFAULT_ENGINE_CONFIG.unloadingDays, {
    unit: 'days', min: 0, max: 60, usedBy: ['computeLSOD'],
  }),
  def('logistics.capacityMinKg', 'logistics', 'Cargo capacity — low', 260000, {
    unit: 'kg', min: 0, max: 2000000, usedBy: ['manifestBuilder'],
  }),
  def('logistics.capacityMaxKg', 'logistics', 'Cargo capacity — high', 300000, {
    unit: 'kg', min: 0, max: 2000000, usedBy: ['manifestBuilder'],
  }),
  def('logistics.horizonDays', 'logistics', 'Prioritisation horizon', 365, {
    unit: 'days', min: 30, max: 1095, usedBy: ['scoreManifestCandidate'],
  }),
  def('logistics.targetCoverDays', 'logistics', 'Target cover after resupply', 400, {
    unit: 'days', min: 30, max: 1095, usedBy: ['manifestBuilder'],
  }),
  def('logistics.lsodWarningDays', 'logistics', 'LSOD warning threshold', 14, {
    unit: 'days', min: 1, max: 120, usedBy: ['computeRisk'],
  }),
  def('logistics.lsodWatchDays', 'logistics', 'LSOD watch threshold', 45, {
    unit: 'days', min: 1, max: 365, usedBy: ['computeRisk'],
  }),
  def('logistics.crit.lifeSafety', 'logistics', 'Criticality — life safety', 1.0, { min: 0, max: 1, usedBy: ['scoreManifestCandidate'] }),
  def('logistics.crit.power', 'logistics', 'Criticality — power', 0.9, { min: 0, max: 1, usedBy: ['scoreManifestCandidate'] }),
  def('logistics.crit.fuel', 'logistics', 'Criticality — fuel', 0.85, { min: 0, max: 1, usedBy: ['scoreManifestCandidate'] }),
  def('logistics.crit.medical', 'logistics', 'Criticality — medical', 0.8, { min: 0, max: 1, usedBy: ['scoreManifestCandidate'] }),
  def('logistics.crit.spares', 'logistics', 'Criticality — spares', 0.6, { min: 0, max: 1, usedBy: ['scoreManifestCandidate'] }),
  def('logistics.crit.provisions', 'logistics', 'Criticality — provisions', 0.5, { min: 0, max: 1, usedBy: ['scoreManifestCandidate'] }),
  def('logistics.crit.science', 'logistics', 'Criticality — science', 0.3, { min: 0, max: 1, usedBy: ['scoreManifestCandidate'] }),

  // ---- Energy (FR-B4) ----
  def('energy.baselineLoadKw', 'energy', 'Baseline station load', DEFAULT_ENGINE_CONFIG.baselineLoadKw, {
    unit: 'kW', min: 0, max: 1000, usedBy: ['computeEnergyDemand'],
  }),
  def('energy.generatorRatedKw', 'energy', 'Generator rated capacity', 200, {
    unit: 'kW', min: 1, max: 2000, usedBy: ['generatorLoadPct'],
  }),
  def('energy.generatorEfficiency', 'energy', 'Generator efficiency', DEFAULT_ENGINE_CONFIG.generatorEfficiency, {
    min: 0.05, max: 1, usedBy: ['computeFuelBurn'],
  }),
  def('energy.renewableMixPct', 'energy', 'Renewable mix', 12, {
    unit: '%', min: 0, max: 100, usedBy: ['computeEnergyDemand'],
  }),
  def('energy.burnRateVariance', 'energy', 'Burn-rate variance (± band)', DEFAULT_ENGINE_CONFIG.burnRateVariance, {
    min: 0, max: 0.5, usedBy: ['computeAutonomy'],
  }),
  // computeFuelBurn() returns a kW-equivalent. This is the one factor that
  // turns it into the litres the fuel ledger is denominated in, so the
  // causal trace and the resource ledger cannot drift apart.
  def('energy.fuelEnergyKwhPerL', 'energy', 'Fuel energy density', 10.0, {
    unit: 'kWh/L', min: 1, max: 20, usedBy: ['computeFuelBurn', 'causalTraceInput'],
    source: 'diesel lower heating value, ~9.9–10.1 kWh/L (published)',
    provenance: 'MODELED',
  }),

  // ---- Thermal (FR-B5) ----
  def('thermal.degreeDayBaseC', 'thermal', 'Degree-day base temperature', DEFAULT_ENGINE_CONFIG.degreeDayBaseC, {
    unit: '°C', min: -20, max: 30, usedBy: ['computeHDD'],
  }),
  def('thermal.uValue', 'thermal', 'Envelope U-value', 0.32, {
    unit: 'W/m2K', min: 0.05, max: 3, usedBy: ['computeHeatLoss'],
  }),
  def('thermal.areaM2', 'thermal', 'Heated envelope area', 2600, {
    unit: 'm2', min: 10, max: 50000, usedBy: ['computeHeatLoss'],
  }),
  def('thermal.zoneWarningLossPct', 'thermal', 'Envelope loss added by a zone in warning', 8, {
    unit: '%', min: 0, max: 100, usedBy: ['zoneAutonomyImpact'],
  }),
  def('thermal.zoneWatchLossPct', 'thermal', 'Envelope loss added by a zone in watch', 4, {
    unit: '%', min: 0, max: 100, usedBy: ['zoneAutonomyImpact'],
  }),
  def('thermal.windChillFormula', 'thermal', 'Wind-chill formula', 'NWS', {
    source: PUBLISHED, provenance: 'LIVE', usedBy: ['computeWindChill'],
    confirmedBy: 'NWS / Environment Canada', confirmedAt: '2001-11-01T00:00:00.000Z',
  }),

  // ---- Sync (FR-B6) ----
  def('sync.laggingAfterMinutes', 'sync', 'LIVE to LAGGING threshold', 30, {
    unit: 'min', min: 1, max: 1440, usedBy: ['freshnessState'],
  }),
  def('sync.darkAfterHours', 'sync', 'LAGGING to DARK threshold', 12, {
    unit: 'h', min: 1, max: 168, usedBy: ['freshnessState'],
  }),
  def('sync.batchSize', 'sync', 'Drain batch size', 5, {
    unit: 'records', min: 1, max: 200, usedBy: ['drainOutbox'],
  }),
  def('sync.retryBackoffSeconds', 'sync', 'Retry backoff (base)', 30, {
    unit: 's', min: 1, max: 3600, usedBy: ['drainOutbox'],
  }),
  def('sync.maxAttempts', 'sync', 'Max attempts before raising an action', 5, {
    min: 1, max: 50, usedBy: ['drainOutbox'],
  }),
  def('sync.throughputKbps', 'sync', 'Assumed link throughput', 64, {
    unit: 'kbps', min: 1, max: 100000, usedBy: ['timeToClear'],
  }),

  // ---- SLA (FR-B7) ----
  def('sla.T0Seconds', 'sla', 'T0 acknowledgement target', 15 * 60, { unit: 's', min: 60, max: 86400, usedBy: ['slaState'] }),
  def('sla.T1Seconds', 'sla', 'T1 acknowledgement target', 2 * 3600, { unit: 's', min: 60, max: 604800, usedBy: ['slaState'] }),
  def('sla.T2Seconds', 'sla', 'T2 acknowledgement target', 24 * 3600, { unit: 's', min: 60, max: 2592000, usedBy: ['slaState'] }),
  def('sla.T3Seconds', 'sla', 'T3 acknowledgement target', 7 * 86400, { unit: 's', min: 60, max: 7776000, usedBy: ['slaState'] }),
  def('sla.pauseWhileDark', 'sla', 'Pause SLA clocks while DARK', true, { usedBy: ['slaState'] }),

  // ---- Thresholds (FR-B8) ----
  def('thresholds.fuelReorderPct', 'thresholds', 'Fuel reorder point', 30, { unit: '% of stock', min: 0, max: 100, usedBy: ['reorderCheck'] }),
  def('thresholds.provisionsReorderPct', 'thresholds', 'Provisions reorder point', 25, { unit: '% of stock', min: 0, max: 100, usedBy: ['reorderCheck'] }),
  def('thresholds.wasteBalanceToleranceKg', 'thresholds', 'Waste balance tolerance', 25, { unit: 'kg', min: 0, max: 5000, usedBy: ['wasteBalanceCheck'] }),
  def('thresholds.generatorLoadWarnPct', 'thresholds', 'Generator load warning', 85, { unit: '%', min: 10, max: 100, usedBy: ['assetAlarm'] }),
  def('thresholds.zoneMinTempC', 'thresholds', 'Occupied-zone minimum temperature', 16, { unit: '°C', min: -20, max: 30, usedBy: ['zoneAlarm'] }),

  // ---- Stations (FR-B9) ----
  def('stations.bharati.crewCapacity', 'stations', 'Bharati crew capacity', 24, { unit: 'people', min: 1, max: 200, source: 'NCPOR station profile (public)', provenance: 'MODELED' }),
  def('stations.maitri.crewCapacity', 'stations', 'Maitri crew capacity', 25, { unit: 'people', min: 1, max: 200, source: 'NCPOR station profile (public)', provenance: 'MODELED' }),
  def('stations.bharati.changeover', 'stations', 'Bharati crew changeover', '2027-02-18', { source: ASSUMPTION }),
  def('stations.maitri.changeover', 'stations', 'Maitri crew changeover', '2027-03-04', { source: ASSUMPTION }),

  // ---- Data sources (FR-B11) — read-only mirror of /environment ----
  def('sources.environment.enabled', 'sources', 'Environment adapter (NCPOR / READER / AMRC)', true, {
    source: 'data.ncpor.res.in · antarctica.ac.uk/met/READER', provenance: 'LIVE',
  }),
  def('sources.environment.cacheTtlMinutes', 'sources', 'Environment cache TTL', 30, { unit: 'min', min: 1, max: 1440, provenance: 'LIVE', source: 'adapter setting' }),
  def('sources.fuel.enabled', 'sources', 'Fuel telemetry adapter', false, { source: 'not connected — station fuel telemetry' }),
  def('sources.generator.enabled', 'sources', 'Generator SCADA adapter', false, { source: 'not connected — station SCADA' }),
  def('sources.inventory.enabled', 'sources', 'Inventory adapter', false, { source: 'not connected — station inventory system' }),
  def('sources.maintenance.enabled', 'sources', 'Maintenance adapter', false, { source: 'not connected — station maintenance records' }),
  def('sources.logistics.enabled', 'sources', 'Cargo / voyage adapter', false, { source: 'not connected — cargo / voyage system' }),
];

const DEF_BY_KEY = new Map(PARAM_DEFS.map((d) => [d.key, d]));

// ---- Overrides --------------------------------------------------------------

type OverrideEntry = { value: ParamValue; by: string; at: string };
type OverrideTable = Partial<Record<ParamScope, Record<string, OverrideEntry>>>;

function readOverrides(): OverrideTable {
  return readStore<OverrideTable>('hq', 'params', {});
}

function writeOverrides(t: OverrideTable): void {
  writeStore('hq', 'params', t);
}

/** Every parameter, resolved for a scope, with override bookkeeping intact. */
export function getParameters(scope: ParamScope = 'global'): Parameter[] {
  const overrides = readOverrides();
  return PARAM_DEFS.map((d) => {
    const globalOv = overrides.global?.[d.key];
    const scopeOv = scope !== 'global' ? overrides[scope]?.[d.key] : undefined;
    const active = scopeOv ?? globalOv;
    return {
      ...d,
      scope,
      value: active ? active.value : d.value,
      overriddenFromGlobal: Boolean(scopeOv),
      lastChangedBy: active?.by,
      lastChangedAt: active?.at,
    } as Parameter;
  });
}

export function getParameter(key: string, scope: ParamScope = 'global'): Parameter | undefined {
  return getParameters(scope).find((p) => p.key === key);
}

/**
 * A synchronous, in-memory override layer used by the /settings impact
 * preview. It never touches storage and never notifies, so "what would this
 * value do?" can be answered by the real engine without a write that other
 * views would see — and without clobbering an override the operator already
 * has at that scope.
 */
let sandboxOverrides: Record<string, ParamValue> | null = null;

export function withSandboxParams<T>(overrides: Record<string, ParamValue>, fn: () => T): T {
  const previous = sandboxOverrides;
  sandboxOverrides = { ...(previous ?? {}), ...overrides };
  try {
    return fn();
  } finally {
    sandboxOverrides = previous;
  }
}

export function getParamValue<T extends ParamValue>(key: string, scope: ParamScope = 'global'): T {
  if (sandboxOverrides && key in sandboxOverrides) return sandboxOverrides[key] as T;
  const overrides = readOverrides();
  const scoped = scope !== 'global' ? overrides[scope]?.[key] : undefined;
  const globalOv = overrides.global?.[key];
  const fallback = DEF_BY_KEY.get(key)?.value;
  return ((scoped ?? globalOv)?.value ?? fallback) as T;
}

export class ParamRangeError extends Error {
  param: Parameter;
  attempted: ParamValue;
  constructor(param: Parameter, attempted: ParamValue) {
    // NFR-B5: reject with the valid range and its source. Never silently clamp.
    super(
      [
        param.label,
        ' must be between ', String(param.min), ' and ', String(param.max),
        param.unit ? ' ' + param.unit : '',
        ' — range source: ', param.source,
      ].join('')
    );
    this.name = 'ParamRangeError';
    this.param = param;
    this.attempted = attempted;
  }
}

/** Validates and writes. Throws ParamRangeError rather than clamping. */
export function setParamValue(
  key: string,
  scope: ParamScope,
  value: ParamValue,
  by: string
): { previous: ParamValue; next: ParamValue } {
  const current = getParameter(key, scope);
  if (!current) throw new Error('Unknown parameter ' + key);
  let nextValue = value;
  if (typeof current.default === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(n)) throw new ParamRangeError(current, value);
    if ((current.min !== undefined && n < current.min) || (current.max !== undefined && n > current.max)) {
      throw new ParamRangeError(current, n);
    }
    nextValue = n;
  }
  const previous = current.value;
  const table = readOverrides();
  const bucket: Record<string, OverrideEntry> = { ...(table[scope] ?? {}) };
  bucket[key] = { value: nextValue, by, at: new Date().toISOString() };
  table[scope] = bucket;
  writeOverrides(table);
  return { previous, next: nextValue };
}

export function resetParam(key: string, scope: ParamScope): void {
  const table = readOverrides();
  const bucket = table[scope];
  if (bucket) {
    const next = { ...bucket };
    delete next[key];
    table[scope] = next;
    writeOverrides(table);
  }
}

// ---- Engine config ----------------------------------------------------------

/**
 * The single builder for an EngineConfig. Pages never construct one by hand,
 * so a /settings edit reaches every derived number in the app (NFR-B2).
 */
export function getEngineConfig(scope: ParamScope = 'global'): EngineConfig {
  return {
    degreeDayBaseC: getParamValue<number>('thermal.degreeDayBaseC', scope),
    baselineLoadKw: getParamValue<number>('energy.baselineLoadKw', scope),
    generatorEfficiency: getParamValue<number>('energy.generatorEfficiency', scope),
    burnRateVariance: getParamValue<number>('energy.burnRateVariance', scope),
    unloadingDays: getParamValue<number>('logistics.unloadingDays', scope),
    transitDays: getParamValue<number>('logistics.transitDays', scope),
    consolidationDays: getParamValue<number>('logistics.consolidationDays', scope),
    procurementLeadDays: getParamValue<number>('logistics.procurementLeadDays', scope),
  };
}

export function slaTargetSeconds(tier: 'T0' | 'T1' | 'T2' | 'T3', scope: ParamScope = 'global'): number {
  return getParamValue<number>('sla.' + tier + 'Seconds', scope);
}

export function syncThresholds(scope: ParamScope = 'global'): { laggingAfterSeconds: number; darkAfterSeconds: number } {
  return {
    laggingAfterSeconds: getParamValue<number>('sync.laggingAfterMinutes', scope) * 60,
    darkAfterSeconds: getParamValue<number>('sync.darkAfterHours', scope) * 3600,
  };
}

export function criticalityWeight(
  category: 'lifeSafety' | 'power' | 'fuel' | 'medical' | 'spares' | 'provisions' | 'science'
): number {
  return getParamValue<number>('logistics.crit.' + category);
}

export function unconfirmedParameters(scope: ParamScope = 'global'): Parameter[] {
  return getParameters(scope).filter((p) => p.provenance === 'SYNTH');
}

/** FR-B15 — the artefact you hand a chief engineer to validate. */
export function exportParametersJSON(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: 'Antarasetu',
      note:
        'Every SYNTH-badged parameter is an assumption pending NCPOR confirmation. ' +
        'Values drive the coupling engine directly — changing one changes every derived figure.',
      scopes: {
        global: getParameters('global'),
        bharati: getParameters('bharati'),
        maitri: getParameters('maitri'),
      },
    },
    null,
    2
  );
}

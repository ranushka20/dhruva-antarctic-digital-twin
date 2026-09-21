// OWNER: Dev A (page), built on Dev B's parameter registry and state layer.
//
// The Sandbox scenario model. This file exists because the sliders used to be
// decorative: `crewSize` was held in React state and never reached the engine,
// and `windKmh` is accepted by runCausalTrace but never read by it, so two of
// the four controls moved nothing at all.
//
// Every parameter below now has exactly ONE documented path into the engine,
// declared in PARAMETERS. Nothing here computes a result itself — each lever
// either overrides a registry parameter (via withSandboxParams, which writes
// nothing anywhere, satisfying NFR-8.4) or adjusts a CausalTraceInput field.
// The numbers all come out of runCausalTrace, the same call the Twin and the
// Action Centre drawer use.
//
// THE INVARIANT: with every parameter at its baseline, the scenario result
// must equal the baseline result exactly. Levers that are naturally absolute
// (wind chill, renewable mix) are therefore applied as a DELTA against their
// own baseline, never as a raw factor. If you add a lever, preserve this —
// it is what makes "0 of 10 parameters changed" mean something.

import {
  runCausalTrace, computeWindChill,
  type CausalTraceInput, type Risk, type Zone,
} from '@/shared/contracts';
import { causalTraceInput, getZones, getStationSummary } from '@/state/data';
import { withSandboxParams, getParamValue, type ParamValue } from '@/state/params';
import { readStore, writeStore } from '@/lib/localStore';
import type { StationId } from '@/state/connectivity';

export type ParamGroup = 'environmental' | 'energy' | 'logistics' | 'crew';

export interface SandboxParameter {
  key: string;
  group: ParamGroup;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  /** Where the bound comes from — inspectable in the UI per NFR-8.7. */
  boundSource: string;
  /** How this lever reaches the engine, in one line, shown under the slider. */
  mechanism: string;
  /** Baseline value, read from real state — never a literal. */
  baseline: (ctx: BaselineCtx) => number;
  /** Decimal places for display. */
  precision?: number;
}

export type ScenarioValues = Record<string, number>;

/**
 * Prepared once per baselineValues() call. Without it every parameter that
 * needed the untouched trace re-ran causalTraceInput + runCausalTrace, so a
 * single slider drag recomputed the baseline ten times over.
 */
export interface BaselineCtx {
  stationId: StationId;
  input: CausalTraceInput;
}

/** Registry parameter baselines, read once per station. */
const p = (key: string, stationId: StationId) => getParamValue<number>(key, stationId);

export const PARAMETERS: SandboxParameter[] = [
  // ---- Environmental -------------------------------------------------------
  {
    key: 'ambientC', group: 'environmental', label: 'Ambient temperature', unit: '°C',
    min: -55, max: 5, step: 0.5, precision: 1,
    boundSource: 'SCAR READER monthly means, Bharati and Maitri, 1990–2024',
    mechanism: 'Sets T_avg, so it drives HDD directly: HDD = max(0, T_base − T_avg).',
    baseline: (c) => c.input.ambientTempC,
  },
  {
    key: 'windKt', group: 'environmental', label: 'Wind speed', unit: 'kt',
    min: 0, max: 90, step: 1,
    boundSource: 'AMRC AWS distribution — 90 kt is above the recorded maximum',
    mechanism:
      'Applied as a wind-chill DELTA against baseline wind, using the engine\'s own NWS formula, '
      + 'and added to T_avg. An approximation of raised envelope loss, not a separate infiltration model.',
    baseline: (c) => c.input.windKmh / 1.852,
  },
  {
    key: 'stormDays', group: 'environmental', label: 'Storm duration', unit: 'd',
    min: 0, max: 14, step: 1,
    boundSource: 'station event record — longest logged continuous event',
    mechanism: 'Added to logistics.unloadingDays: a vessel alongside in a storm cannot discharge. Moves LSOD.',
    baseline: () => 0,
  },

  // ---- Energy --------------------------------------------------------------
  {
    key: 'renewablePct', group: 'energy', label: 'Renewable mix', unit: '%',
    min: 0, max: 60, step: 1,
    boundSource: 'station config — installed wind and solar capacity',
    mechanism: 'Scales the generator-served share of baseline load, relative to the current mix.',
    baseline: (c) => p('energy.renewableMixPct', c.stationId),
  },
  {
    key: 'genEfficiencyPct', group: 'energy', label: 'Generator efficiency', unit: '%',
    min: 20, max: 50, step: 0.5, precision: 1,
    boundSource: 'equipment spec sheet — diesel genset part-load curve',
    mechanism: 'Overrides energy.generatorEfficiency: burnRate = demand ÷ efficiency.',
    baseline: (c) => p('energy.generatorEfficiency', c.stationId) * 100,
  },
  {
    key: 'uValue', group: 'energy', label: 'Envelope U-value', unit: 'W/m²K',
    min: 0.1, max: 1.5, step: 0.01, precision: 2,
    boundSource: 'building config — insulated panel to uninsulated steel',
    mechanism: 'Overrides thermal.uValue: heatLoss = U × A × HDD.',
    baseline: (c) => p('thermal.uValue', c.stationId),
  },

  // ---- Logistics -----------------------------------------------------------
  {
    key: 'resupplyDelayDays', group: 'logistics', label: 'Resupply delay', unit: 'd',
    min: 0, max: 120, step: 1,
    boundSource: 'voyage schedule — a season slip beyond 120 d misses the window entirely',
    mechanism: 'Shifts both ends of the ship window later. Moves LSOD and the margin to ship.',
    baseline: () => 0,
  },
  {
    key: 'transitDays', group: 'logistics', label: 'Sea transit duration', unit: 'd',
    min: 8, max: 70, step: 1,
    boundSource: 'voyage config — Cape Town / Goa departure to station',
    mechanism: 'Overrides logistics.transitDays, one of the four lead times subtracted in computeLSOD.',
    baseline: (c) => p('logistics.transitDays', c.stationId),
  },
  {
    key: 'consumptionMult', group: 'logistics', label: 'Consumption rate', unit: '×',
    min: 0.5, max: 2, step: 0.05, precision: 2,
    boundSource: 'operational range, 0.5–2.0 × the modelled rate',
    mechanism:
      'Divides the stock the engine sees. Mathematically identical to multiplying burn rate, '
      + 'since autonomy = stock ÷ burn.',
    baseline: () => 1,
  },

  // ---- Crew / Ops ----------------------------------------------------------
  {
    key: 'crew', group: 'crew', label: 'Crew size', unit: 'people',
    min: 5, max: 50, step: 1,
    boundSource: 'NCPOR station profile — winter-over frame to summer capacity',
    mechanism:
      'Occupancy-driven share of baseline load: baseline = fixed + energy.perPersonLoadKw × crew. '
      + 'The per-person figure is an unconfirmed assumption, editable on /settings.',
    baseline: (c) => getStationSummary(c.stationId).crew,
  },
];

export const GROUP_LABEL: Record<ParamGroup, string> = {
  environmental: 'Environmental',
  energy: 'Energy',
  logistics: 'Logistics',
  crew: 'Crew / ops',
};

/** The untouched trace for a station — the BEFORE side of every diff. */
export function baselineTrace(stationId: StationId) {
  const input = causalTraceInput(stationId);
  return { input, result: runCausalTrace(input) };
}

export function baselineValues(stationId: StationId): ScenarioValues {
  const ctx: BaselineCtx = { stationId, input: causalTraceInput(stationId) };
  const out: ScenarioValues = {};
  for (const param of PARAMETERS) out[param.key] = param.baseline(ctx);
  return out;
}

/**
 * Build the SIM trace. Registry levers go through withSandboxParams so the
 * whole derivation — including anything causalTraceInput reads from the
 * registry — sees the scenario values, and nothing is persisted.
 */
export function scenarioTrace(stationId: StationId, values: ScenarioValues) {
  const base = baselineValues(stationId);

  const overrides: Record<string, ParamValue> = {
    'energy.generatorEfficiency': values.genEfficiencyPct / 100,
    'thermal.uValue': values.uValue,
    'logistics.transitDays': values.transitDays,
    'logistics.unloadingDays': p('logistics.unloadingDays', stationId) + values.stormDays,
    'energy.baselineLoadKw': baselineLoadFor(stationId, values, base),
  };

  return withSandboxParams(overrides, () => {
    const input = causalTraceInput(stationId, { provenanceOverride: 'SIM' });

    const scenarioInput: CausalTraceInput = {
      ...input,
      ambientTempC: effectiveTempC(values, base),
      windKmh: values.windKt * 1.852,
      // Dividing stock is the same operation as multiplying burn.
      stockUnits: input.stockUnits / values.consumptionMult,
      shipWindow: {
        earliestDay: input.shipWindow.earliestDay + values.resupplyDelayDays,
        latestDay: input.shipWindow.latestDay + values.resupplyDelayDays,
      },
    };

    return { input: scenarioInput, result: runCausalTrace(scenarioInput) };
  });
}

/**
 * Wind as a delta, so baseline wind produces no shift at all. Raw wind chill
 * would move the result the moment the page loaded, and the "0 of 10 changed"
 * counter would be lying.
 */
function effectiveTempC(values: ScenarioValues, base: ScenarioValues): number {
  const kmh = values.windKt * 1.852;
  const baseKmh = base.windKt * 1.852;
  const shift =
    computeWindChill(values.ambientC, kmh) - computeWindChill(values.ambientC, baseKmh);
  return values.ambientC + shift;
}

/**
 * Baseline load, decomposed so crew and renewables compose without either one
 * clobbering the registry figure. `fixed` is back-solved from the registry
 * value at baseline crew, which is what keeps scenario == baseline at rest.
 */
function baselineLoadFor(
  stationId: StationId, values: ScenarioValues, base: ScenarioValues
): number {
  const registryLoad = p('energy.baselineLoadKw', stationId);
  const perPerson = p('energy.perPersonLoadKw', stationId);
  const fixed = Math.max(0, registryLoad - perPerson * base.crew);

  const occupancyLoad = fixed + perPerson * values.crew;
  const renewableFactor = (1 - values.renewablePct / 100) / (1 - base.renewablePct / 100);

  return Math.max(0, occupancyLoad * renewableFactor);
}

// ---------------------------------------------------------------------------
// Zone impact (FR-8.1) — engine-derived, not a threshold on the slider value
// ---------------------------------------------------------------------------

export interface ZoneImpact {
  zone: Zone;
  before: Risk;
  after: Risk;
  worsened: boolean;
}

/**
 * Re-runs the trace once per zone with that zone's envelope penalty applied,
 * baseline and scenario, and reports where the scenario pushes the risk up.
 * Every value is engine output — the previous version hardcoded
 * `ambientTemp < -40 ? 'critical' : ...` against one zone.
 */
export function zoneImpacts(stationId: StationId, values: ScenarioValues): ZoneImpact[] {
  const base = baselineValues(stationId);

  return getZones(stationId).map((zone) => {
    const before = runCausalTrace(causalTraceInput(stationId, { zoneCode: zone.code })).risk;
    const after = zoneScenarioRisk(stationId, values, base, zone.code);
    return { zone, before, after, worsened: RISK_ORDER[after] > RISK_ORDER[before] };
  });
}

const RISK_ORDER: Record<Risk, number> = { ok: 0, watch: 1, warning: 2, critical: 3 };

function zoneScenarioRisk(
  stationId: StationId, values: ScenarioValues, base: ScenarioValues, zoneCode: string
): Risk {
  const overrides: Record<string, ParamValue> = {
    'energy.generatorEfficiency': values.genEfficiencyPct / 100,
    'thermal.uValue': values.uValue,
    'logistics.transitDays': values.transitDays,
    'logistics.unloadingDays': p('logistics.unloadingDays', stationId) + values.stormDays,
    'energy.baselineLoadKw': baselineLoadFor(stationId, values, base),
  };

  return withSandboxParams(overrides, () => {
    const input = causalTraceInput(stationId, { zoneCode, provenanceOverride: 'SIM' });
    return runCausalTrace({
      ...input,
      ambientTempC: effectiveTempC(values, base),
      stockUnits: input.stockUnits / values.consumptionMult,
      shipWindow: {
        earliestDay: input.shipWindow.earliestDay + values.resupplyDelayDays,
        latestDay: input.shipWindow.latestDay + values.resupplyDelayDays,
      },
    }).risk;
  });
}

// ---------------------------------------------------------------------------
// Saved scenarios (FR-2.5 / FR-7.3) — PARAMETERS ONLY, never results
// ---------------------------------------------------------------------------

export interface SavedScenario {
  id: string;
  name: string;
  stationId: StationId;
  values: ScenarioValues;
  savedAt: string;
}

const SCENARIO_KEY = 'sandboxScenarios';

/**
 * Scenarios live in their own bucket and hold parameters only. A saved
 * RESULT would be a simulated number sitting in storage where something
 * could later read it as fact — FR-2.5 forbids exactly that.
 */
export function getSavedScenarios(): SavedScenario[] {
  return readStore<SavedScenario[]>('hq', SCENARIO_KEY, []);
}

export function saveScenario(name: string, stationId: StationId, values: ScenarioValues): SavedScenario {
  const scenario: SavedScenario = {
    id: 'scn-' + Date.now().toString(36),
    name, stationId, values: { ...values }, savedAt: new Date().toISOString(),
  };
  writeStore('hq', SCENARIO_KEY, [scenario, ...getSavedScenarios()]);
  return scenario;
}

export function deleteScenario(id: string): void {
  writeStore('hq', SCENARIO_KEY, getSavedScenarios().filter((s) => s.id !== id));
}

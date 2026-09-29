// OWNER: Dev A
// zoneTrace — the "Why this matters" story for one zone.
//
// runCausalTrace() answers a station question: how long does the fuel last?
// Asked from a zone, that is the same answer everywhere, so every zone on the
// twin used to tell an identical fuel story. This module asks the zone's own
// questions, with the same engine and the same inputs:
//
//   1. What does this zone draw? Its share of the station's heat loss and
//      baseline load, run through computeHeatLoss → computeEnergyDemand →
//      computeFuelBurn, as a share of the station's burn.
//   2. What is its current fault costing? runCausalTrace() on the station as
//      it is now, and again with the fault fixed. The difference is days of
//      fuel (FR-10.3's "autonomy before → after, LSOD delta").
//
// The station trace is never altered by picking a zone: "now" is the input
// as given, which already includes every current fault. Only the "if fixed"
// run changes anything, so the station's own numbers stay identical on every
// zone and on every page (touchpoint #10).
//
// The split of load and envelope between zones is an assumption. Neither
// station has per-zone power metering, so the profiles in mock/*.json are
// SYNTH and every figure here lists that as a parent.

import {
  runCausalTrace,
  computeHDD,
  computeHeatLoss,
  computeEnergyDemand,
  computeFuelBurn,
  DEFAULT_ENGINE_CONFIG,
  type CausalTraceInput,
  type Measurement,
  type Provenance,
} from '@/shared/contracts';

/** A current fault that makes the station burn more fuel than it would if fixed. */
export type ZoneCondition =
  /** Generator efficiency lost, in percentage points (0.38 → 0.36 is 2). */
  | { kind: 'efficiency'; points: number; what: string }
  /** Extra heat escaping through this zone's share of the envelope, in %. */
  | { kind: 'heatLoss'; pct: number; what: string }
  /** Extra electrical load in this zone, in kW. */
  | { kind: 'load'; kw: number; what: string };

export interface ZoneTraceProfile {
  /** Share of the station's baseline electrical load drawn by this zone (0–1; zones sum to 1). */
  loadShare: number;
  /** Share of the station's heated envelope area in this zone (0–1; zones sum to 1). */
  envelopeShare: number;
  /** 'fuel' — the zone holds the station's fuel, so its story is the station fuel chain. */
  story?: 'fuel';
  condition?: ZoneCondition;
}

export interface ZoneTraceResult {
  /** The station as it is now: exactly runCausalTrace(input). */
  station: ReturnType<typeof runCausalTrace>;
  zone: {
    heatLossKw: Measurement;
    equipmentKw: Measurement;
    fuelBurn: Measurement;
    sharePct: Measurement;
  };
  condition?: {
    what: string;
    kind: ZoneCondition['kind'];
    /** Extra station fuel burn caused by the fault, units/day. */
    extraBurn: Measurement;
    /** Days of fuel the fault is costing (autonomy if fixed − autonomy now). */
    costDays: Measurement;
    autonomyNow: Measurement;
    autonomyIfFixed: Measurement;
    /** Days the order deadline would move later if fixed; null when either deadline is undefined. */
    lsodShiftDays: number | null;
  };
}

const SPLIT_PARENT = { name: 'zone split of power and heat (no per-zone meters)', provenance: 'SYNTH' as Provenance };

/** The input with this zone's fault removed. */
function fixedInput(input: CausalTraceInput, condition: ZoneCondition, envelopeShare: number): CausalTraceInput {
  const cfg = input.config ?? DEFAULT_ENGINE_CONFIG;
  switch (condition.kind) {
    case 'efficiency':
      return { ...input, config: { ...cfg, generatorEfficiency: cfg.generatorEfficiency + condition.points / 100 } };
    case 'heatLoss': {
      // The zone's slice of U·A currently carries the extra loss; take it back out.
      const extra = condition.pct / 100;
      return { ...input, uValue: input.uValue * (1 - (envelopeShare * extra) / (1 + extra)) };
    }
    case 'load':
      return { ...input, config: { ...cfg, baselineLoadKw: Math.max(0, cfg.baselineLoadKw - condition.kw) } };
  }
}

function burnOf(result: ReturnType<typeof runCausalTrace>): number {
  const step = result.steps.find((s) => s.label === '↓ FUEL BURN');
  return typeof step?.value.value === 'number' ? step.value.value : 0;
}

export function runZoneTrace(input: CausalTraceInput, profile: ZoneTraceProfile): ZoneTraceResult {
  const cfg = input.config ?? DEFAULT_ENGINE_CONFIG;
  const provenance: Provenance = input.provenanceOverride ?? 'MODELED';
  const assumption: Provenance = provenance === 'SIM' ? 'SIM' : 'SYNTH';
  const now = new Date().toISOString();
  const mk = (
    value: number,
    unit: string,
    model: string,
    parents: Measurement['parents']
  ): Measurement => ({
    value, unit, timestamp: now, source: 'coupling-engine · zone split', provenance, freshnessSeconds: 0, model, parents,
  });

  const station = runCausalTrace(input);
  const stationBurn = burnOf(station);

  const hdd = computeHDD(input.ambientTempC, cfg.degreeDayBaseC);
  const heatLossW = computeHeatLoss(input.uValue, input.areaM2 * profile.envelopeShare, hdd);
  const equipmentKw = cfg.baselineLoadKw * profile.loadShare;
  const demandKw = computeEnergyDemand(heatLossW, { ...cfg, baselineLoadKw: equipmentKw });
  const zoneBurn = computeFuelBurn(demandKw, cfg);
  const sharePct = stationBurn > 0 ? (zoneBurn / stationBurn) * 100 : 0;

  const zone: ZoneTraceResult['zone'] = {
    heatLossKw: mk(heatLossW / 1000, 'kW', 'zone heat loss = U × (A × envelope share) × ΔT', [
      { name: 'outside temperature', provenance },
      { name: 'building insulation and heated area', provenance: assumption },
      SPLIT_PARENT,
    ]),
    equipmentKw: mk(equipmentKw, 'kW', 'zone equipment = baseline station load × load share', [
      { name: 'baseline station load', provenance: assumption },
      SPLIT_PARENT,
    ]),
    fuelBurn: mk(zoneBurn, 'units/day', 'zone burn = (zone equipment + zone heat loss) / generator efficiency', [
      { name: 'heat escaping this zone', provenance },
      { name: 'equipment running here', provenance },
      { name: 'generator efficiency', provenance: assumption },
    ]),
    sharePct: mk(sharePct, '%', 'share = zone burn / station burn', [
      { name: 'fuel burned for this zone', provenance },
      { name: 'fuel burned by the station', provenance },
    ]),
  };

  if (!profile.condition) return { station, zone };

  const fixed = runCausalTrace(fixedInput(input, profile.condition, profile.envelopeShare));
  const faultParent = { name: profile.condition.what, provenance: assumption };
  const lsodShiftDays =
    station.lsodDays !== null && fixed.lsodDays !== null ? fixed.lsodDays - station.lsodDays : null;

  return {
    station,
    zone,
    condition: {
      what: profile.condition.what,
      kind: profile.condition.kind,
      extraBurn: mk(stationBurn - burnOf(fixed), 'units/day', 'extra burn = station burn now − station burn with the fault fixed', [
        { name: 'fuel burned by the station', provenance },
        faultParent,
      ]),
      costDays: mk(fixed.autonomyDays - station.autonomyDays, 'd', 'cost = days of fuel if fixed − days of fuel now', [
        { name: 'days of fuel left now', provenance },
        { name: 'days of fuel left if fixed', provenance },
      ]),
      autonomyNow: mk(station.autonomyDays, 'd', 'autonomyDays = stock / burnRate', [
        { name: 'fuel burned by the station', provenance },
        { name: 'fuel in stock', provenance: assumption },
      ]),
      autonomyIfFixed: mk(fixed.autonomyDays, 'd', 'autonomyDays = stock / burnRate, with the fault fixed', [
        { name: 'fuel in stock', provenance: assumption },
        faultParent,
      ]),
      lsodShiftDays,
    },
  };
}

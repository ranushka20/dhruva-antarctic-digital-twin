import {
  autonomyVerdict,
  isolationState,
  lastSafeOrderDate,
  nextCargoCutoff,
  projectDepletion,
  resupplyOutlook,
} from "./autonomy";
import { electricalLoad, energyBalance, heatDemand, waterBalance, wasteGeneration } from "./coupling";
import { dispatchHeadroom, rotationState } from "./rotation";
import { classifyStaleness, outboxState } from "./sync";
import { q } from "./util";
import { drumProjection, inspectionStatus, reportingStatus } from "./waste";
import { TASK_CLASSES, monthlyWorkOutlook, workFeasibility } from "./work-window";

/* =========================================================
   STATION STATE — composition

   One call assembles the whole model from the three exogenous drivers
   that actually have published values (temperature, wind, population)
   plus whatever the caller can supply about stock and sync. Anything
   the caller cannot supply comes back as an explicit absence rather
   than as a default that looks like a reading.

   zoneStatus is deliberately mostly `unknown`. Six of Bharati's
   thirteen zones have no feed and no model behind them, and inventing
   a green tick for those six would undo the only claim this project
   makes. An unknown is a finding: it names an integration boundary
   where NCPOR's real systems would plug in.
========================================================= */

/** Mirrors ZONES in stationData.js. Kept literal so the state layer stays dependency-free. */
export const ZONE_IDS = [
  "Access",
  "Communications",
  "Environment",
  "Fuel",
  "Labs",
  "Living",
  "Logistics",
  "Operations",
  "Power",
  "Structure",
  "Utilities",
  "Waste",
  "Workshop",
];

export function computeStationState({
  population = null,
  conditions = {},
  resources = {},
  lastSyncAt = null,
  now,
}) {
  const month = new Date(now).getUTCMonth() + 1;
  const { windKt = null, tempC = null } = conditions;

  const energy =
    population == null
      ? null
      : {
          load: electricalLoad(population),
          balance: tempC == null ? null : energyBalance({ population, outdoorTempC: tempC }),
          headroom: dispatchHeadroom(electricalLoad(population).value, {
            runningUnits: resources.runningChpUnits ?? 1,
          }),
        };

  const thermal = tempC == null ? null : heatDemand(tempC);

  const water = population == null ? null : waterBalance(population, resources.water ?? {});

  const work =
    windKt == null
      ? null
      : {
          byTask: Object.entries(TASK_CLASSES).map(([id, task]) => ({
            id,
            ...workFeasibility({ windKt, task }),
          })),
          outlook: monthlyWorkOutlook(month),
        };

  const rotation = resources.chpUnits ? rotationState(resources.chpUnits) : null;

  const fuel = resources.fuel
    ? (() => {
        const arrival = resupplyOutlook({ now, plannedArrival: resources.fuel.plannedArrival ?? null });
        const depletion = projectDepletion({
          stock: resources.fuel.stock,
          burnPerDay: resources.fuel.burnPerDay,
          now,
          unit: resources.fuel.unit ?? "L",
          cls: resources.fuel.cls ?? "S",
        });
        return { arrival, depletion, verdict: autonomyVerdict({ depletion, arrival }) };
      })()
    : null;

  const logistics = {
    isolation: isolationState(now),
    cargoCutoff: nextCargoCutoff(now),
    lastSafeOrder: lastSafeOrderDate({
      now,
      procurementLeadDays: resources.procurementLeadDays ?? null,
    }),
  };

  const wasteState =
    population == null
      ? null
      : {
          generation: wasteGeneration(population),
          drums: resources.waste?.retroCargoDate
            ? drumProjection({
                population,
                now,
                retroCargoDate: resources.waste.retroCargoDate,
                drumsOnHand: resources.waste.drumsOnHand ?? 0,
                kgPerDrum: resources.waste.kgPerDrum ?? null,
                capacityDrums: resources.waste.capacityDrums ?? null,
              })
            : null,
          inspection: inspectionStatus({
            lastInspectionAt: resources.waste?.lastInspectionAt ?? null,
            now,
          }),
          reporting: resources.waste?.permitYearEnd
            ? reportingStatus({
                permitYearEnd: resources.waste.permitYearEnd,
                now,
                submittedAt: resources.waste.reportSubmittedAt ?? null,
              })
            : null,
        };

  const sync = {
    staleness: classifyStaleness({ lastSyncAt, now }),
    outbox: outboxState(resources.outbox ?? [], { byteBudget: resources.byteBudget ?? null }),
  };

  return {
    now,
    month,
    population: q(
      population,
      "people",
      "S",
      "MoES Annual Reports give real headcounts (96 summer 41-ISEA; 49 wintering 2023 = 25 Maitri + 24 Bharati)",
      "There is no live roster feed. Real aggregate headcounts exist and are citable; the value in play here is whatever the caller set.",
    ),
    conditions: {
      windKt: q(windKt, "kt", windKt == null ? "B" : "A", "Bharati AWS", "The only live variable in this twin."),
      tempC: q(tempC, "C", tempC == null ? "B" : "A", "Bharati AWS", "Live 1-minute feed, 2015-2026."),
    },
    energy,
    thermal,
    water,
    work,
    rotation,
    fuel,
    logistics,
    waste: wasteState,
    sync,
  };
}

const UNKNOWN_REASONS = {
  Access:
    "Door state, movement and access control are not instrumented in any public source. Nothing to model.",
  Labs:
    "Instrument classes are catalogued but their operational state sits behind NPDC's gated tier.",
  Living:
    "Headcount is modellable; occupancy comfort, room state and welfare are not, and no threshold for them is documented.",
  Operations:
    "Bharati-TIMES tracks life-support issues internally. No public feed, so no operational state to report.",
  Structure:
    "The building is documented in design terms only (134 ISO containers, -40 C design case). There is no structural monitoring feed.",
  Workshop:
    "Vehicle fleet counts are published; vehicle hours, faults and workshop load are not.",
};

/**
 * A status per zone. `unknown` is the expected answer, not a failure of
 * the model: it means there is neither a feed nor a defensible model
 * behind that zone, and stating that is the discipline the whole twin
 * rests on.
 */
export function zoneStatus(stationState) {
  const out = {};
  const unknown = (zone, reason) =>
    q("unknown", null, "B", null, reason ?? UNKNOWN_REASONS[zone] ?? "No feed and no model behind this zone.");

  for (const zone of ZONE_IDS) out[zone] = unknown(zone);

  // Environment — the one zone with a live measurement behind it.
  const work = stationState.work;
  if (work) {
    const tiers = work.byTask.map((t) => t.tier.value);
    const status = tiers.includes("stopped") ? "risk" : tiers.includes("restricted") ? "watch" : "ok";
    out.Environment = q(
      status,
      null,
      "D",
      "Bharati AWS + SIH dossier R1",
      "Derived from live wind against the 25 kt / 34 kt thresholds. The reading is measured; the task envelopes are ours.",
    );
  }

  // Power — derived load against a documented 100 kW unit, plus the 200 h rule.
  const energy = stationState.energy;
  if (energy) {
    const loading = energy.headroom.state.value;
    const due = stationState.rotation?.anyDue;
    const status =
      loading === "over-capacity" ? "risk" : loading === "high" || due ? "watch" : "ok";
    out.Power = q(
      status,
      null,
      "D",
      "ATCM36 (3 x 100 kW CHP, 200 h rotation) + the two-point load fit",
      "Modelled, not metered. Bharati publishes no load or runtime feed; both inputs are derived or simulated.",
    );
  }

  // Utilities — modelled water demand against the RO plant's design output.
  const water = stationState.water;
  if (water) {
    const buffer = water.bufferDays.value;
    const status = water.deficit.value <= 0 ? "ok" : buffer != null && buffer < 1 ? "risk" : "watch";
    out.Utilities = q(
      status,
      null,
      "D",
      "OMRC 2.5 (RO 2,000 L/day design, 12,000 L stored) + per-capita rate",
      "Watch means modelled demand exceeds the RO plant's DESIGN output and the store is being drawn down. Design ratings are not meter readings.",
    );
  }

  // Waste — statutory duties first, capacity second. A generation rate
  // alone is not grounds for a green tick: without an inspection record
  // or a drum projection there is nothing to be compliant WITH, and the
  // honest answer stays unknown.
  const waste = stationState.waste;
  const hasWasteRecord =
    waste != null &&
    (waste.inspection?.overdue != null || waste.drums != null || waste.reporting != null);
  if (hasWasteRecord) {
    const overdue = waste.inspection?.overdue;
    const breached = waste.reporting?.state?.value === "breached";
    const drumBreach = waste.drums?.breaches;
    const status = overdue || breached ? "risk" : drumBreach ? "watch" : "ok";
    out.Waste = q(
      status,
      null,
      "D",
      "Act s.37(2)(d); IAEP Rules 2023 r.38(2); OMRC 2.6",
      "Risk here means a statutory duty is past its date, which is a compliance fact rather than an equipment one. Quantities behind it are simulated.",
    );
  }

  // Communications — staleness of the last sync.
  const state = stationState.sync?.staleness?.state?.value;
  if (state) {
    const status = state === "LIVE" ? "ok" : state === "LAGGING" ? "watch" : "risk";
    out.Communications = q(
      status,
      null,
      "D",
      "ncpor.res.in/news/view/196; Bharati AWS dropout statistics",
      "DARK is measured against the documented five-day outage of 7-12 October 2013, whose cause was administrative rather than technical.",
    );
  }

  // Fuel — cover against the one delivery a year.
  const fuel = stationState.fuel;
  if (fuel?.verdict?.value) {
    const v = fuel.verdict.value;
    const status = v === "covered" ? "ok" : v === "at-risk" ? "watch" : "risk";
    out.Fuel = q(
      status,
      null,
      "D",
      "SIH dossier R4, R8",
      "Depletion band against the arrival band. Tank telemetry is confirmed to exist at Bharati and is not published, so the stock figure behind this is simulated.",
    );
  }

  // Logistics — calendar position, which is always computable.
  const logistics = stationState.logistics;
  if (logistics) {
    const isolated = logistics.isolation.isolated.value;
    const shortfall = fuel?.verdict?.value === "shortfall";
    const status = shortfall ? "risk" : isolated ? "watch" : "ok";
    out.Logistics = q(
      status,
      null,
      "D",
      "39-ISEA 4.0; AL-01 4.2",
      isolated
        ? "April-October: no scheduled transport in or out. A documented standing condition, not a fault."
        : "Inside the November-March access window.",
    );
  }

  return out;
}

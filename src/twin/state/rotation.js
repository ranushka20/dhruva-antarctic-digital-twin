import { q, round } from "./util";

/* =========================================================
   ROTATION — R3: generator duty cycle to maintenance calendar

   Bharati runs three 100 kW CHP units as one running, one sleep, one
   standby, rotated every 200 hours. That fixed interval is what turns
   runtime into a forecastable maintenance calendar, and maintenance
   consumes spares that cannot be resupplied for eight months.

   The STRUCTURE here is documented and class A. Every hour counter is
   class S and is marked as such on the way out: generator runtime and
   telemetry are confirmed to exist at Bharati and are not published,
   so a twin that shows an hours-to-swap figure without the S is
   claiming a feed it does not have.
========================================================= */

const ATCM36 = "ATCM36 Joint Inspection (Russia-US), 2012";
const OMRC = "OMRC tender NCAOR/LH(20)/2013";
const OEM = "domain-research-synthesis.md, Domain 2 — Caterpillar whitepaper; NFPA 110";

export const ROTATION_INTERVAL_HOURS = 200;

export const CHP_FLEET = {
  units: 3,
  ratedKwEach: 100,
  roles: ["running", "sleep", "standby"],
  backupKw: 75,
  fieldGensetKw: [2, 2],
  cls: "A",
  source: `${ATCM36}; ${OMRC} 2.3-2.4`,
  note: "ATCM36 states 3 x 100 kW; NCPOR's own page says 100 kVA. The unit discrepancy is in the sources, not in this model.",
};

/**
 * running -> sleep -> standby -> running. The three roles are
 * documented; the ORDER of succession is our inference from how a
 * three-unit hot/warm/cold set is normally cycled. No NCPOR document
 * states it, so it is class D.
 */
export const ROLE_SUCCESSION = { running: "sleep", sleep: "standby", standby: "running" };

/**
 * Per-unit rotation state.
 *
 * @param units [{ id, role, hoursSinceSwap }] — hoursSinceSwap is
 *        whatever the caller has; there is no feed, so it is S.
 */
export function rotationState(units, { intervalHours = ROTATION_INTERVAL_HOURS } = {}) {
  const rows = units.map((u) => {
    const hours = u.hoursSinceSwap ?? 0;
    const toSwap = intervalHours - hours;
    return {
      id: u.id,
      role: q(
        u.role,
        null,
        "A",
        ATCM36,
        "One running, one sleep, one standby is Bharati's documented arrangement.",
      ),
      ratedKw: q(CHP_FLEET.ratedKwEach, "kW", "A", CHP_FLEET.source, CHP_FLEET.note),
      hoursSinceSwap: q(
        round(hours, 1),
        "h",
        "S",
        null,
        "SIMULATED. Generator runtime exists at Bharati (a Generator Mechanic/Operator role and an OMRC maintenance regime both depend on it) but is not published. This counter carries no claim about the station.",
      ),
      hoursToSwap: q(
        round(toSwap, 1),
        "h",
        "D",
        ATCM36,
        "The 200-hour interval is documented; the remaining hours are only as real as the simulated counter they are subtracted from.",
      ),
      due: toSwap <= 0,
    };
  });

  const running = rows.find((r) => r.role.value === "running") ?? rows[0];
  return {
    intervalHours: q(
      intervalHours,
      "h",
      intervalHours === ROTATION_INTERVAL_HOURS ? "A" : "S",
      ATCM36,
      "Bharati's CHP units are rotated every 200 hours.",
    ),
    units: rows,
    nextSwap: running
      ? {
          unit: running.id,
          hoursToSwap: running.hoursToSwap,
          becomes: q(
            ROLE_SUCCESSION[running.role.value] ?? null,
            null,
            "D",
            ATCM36,
            "Roles are documented; the succession order is our inference.",
          ),
        }
      : null,
    anyDue: rows.some((r) => r.due),
  };
}

/**
 * Loading of the running set, against the band diesel gensets are
 * actually meant to sit in. Below ~30% of rating they wet-stack; the
 * recommended band is 50-85%. These are OEM and NFPA figures, not
 * NCPOR's, so A-ext.
 *
 * This matters at Bharati specifically: the derived load at a summer
 * headcount of 47 is ~96 kW, which is essentially one 100 kW unit flat
 * out. The headroom question is a real one, not a decorative gauge.
 */
export const LOADING_BAND = { wetStackingFloor: 0.3, recommended: [0.5, 0.85] };

export function dispatchHeadroom(loadKw, { runningUnits = 1 } = {}) {
  const capacity = runningUnits * CHP_FLEET.ratedKwEach;
  const loading = loadKw / capacity;
  let state = "in-band";
  if (loading > 1) state = "over-capacity";
  else if (loading > LOADING_BAND.recommended[1]) state = "high";
  else if (loading < LOADING_BAND.wetStackingFloor) state = "wet-stacking";
  else if (loading < LOADING_BAND.recommended[0]) state = "low";

  return {
    capacity: q(capacity, "kW", "A", CHP_FLEET.source, `${runningUnits} x 100 kW CHP running.`),
    loading: q(
      round(loading, 2),
      "fraction",
      "D",
      OEM,
      "Derived load over running capacity. The load itself is a two-point fit, so this is a modelled ratio, not a meter reading.",
    ),
    state: q(
      state,
      null,
      "D",
      OEM,
      "Bands are OEM/NFPA 110 industry figures (wet-stacking below 30% of rating, 50-85% recommended), not an NCPOR specification.",
    ),
  };
}

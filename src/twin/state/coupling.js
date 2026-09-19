import { q, round } from "./util";

/* =========================================================
   COUPLING — the first-principles layer

   Three exogenous drivers have real published values: outdoor
   temperature, wind and population. Everything in this file derives
   from those three and nothing else, which is the difference between a
   model and four panels of decoration.

   The one finding this module exists to protect: electrical load and
   heat demand peak in OPPOSITE seasons at an Indian Antarctic station.
   Load is occupancy-dominated, heat is temperature-dominated. A
   dashboard wired to "cold therefore more energy" would be wrong, and
   would be wrong in a way that looks plausible.
========================================================= */

const DERIV = "coupling-model-derivations.md (Maitri 1990-2010, 60,817 obs)";
const ATCM36 = "ATCM36 Joint Inspection (Russia-US), 2012";
const OMRC = "OMRC tender NCAOR/LH(20)/2013";
const ENERGY = "domain-research-synthesis.md, Domain 2";
const LOGI = "domain-research-synthesis.md, Domain 3";

/* ---------------------------------------------------------
   ELECTRICAL LOAD
--------------------------------------------------------- */

/**
 * The two documented Maitri points the load law is fitted through.
 * A-ext, not A: these are Maitri's numbers from a Treaty inspection,
 * and Maitri is not Bharati.
 */
export const LOAD_ANCHORS = [
  { population: 80, loadKw: 120, season: "summer" },
  { population: 25, loadKw: 80, season: "winter" },
];

/**
 * L_kW = 61.8 + 0.727 x population.
 *
 * TWO POINTS. This is a two-point fit through the pair above, solved
 * exactly, not a regression over a sample — there is no residual, no
 * confidence interval and no evidence the relationship is linear at
 * all. It is a structural hypothesis: roughly 62 kW of standing plant
 * (life support, comms, labs) plus roughly 0.73 kW per person. Present
 * it as DERIVED everywhere it surfaces, never as a measured law, and
 * never as a Bharati measurement — Bharati publishes no load figure.
 */
export const LOAD_LAW = { baseKw: 61.8, kwPerPerson: 0.727 };

export function electricalLoad(population) {
  const kw = LOAD_LAW.baseKw + LOAD_LAW.kwPerPerson * population;
  return q(
    round(kw, 1),
    "kW",
    "D",
    `${DERIV} FINDING 1, from ${ATCM36}`,
    "Two-point fit through Maitri 120 kW @ 80 pax and 80 kW @ 25 pax. A hypothesis about structure, not a measured law, and not a Bharati figure.",
  );
}

/** The split the fit implies: standing plant versus marginal occupancy. */
export function loadDecomposition(population) {
  return {
    base: q(
      LOAD_LAW.baseKw,
      "kW",
      "D",
      `${DERIV} FINDING 1`,
      "Intercept of the two-point fit — read as standing plant, not as a metered base load.",
    ),
    occupancy: q(
      round(LOAD_LAW.kwPerPerson * population, 1),
      "kW",
      "D",
      `${DERIV} FINDING 1`,
      `${LOAD_LAW.kwPerPerson} kW per person x ${population}.`,
    ),
    total: electricalLoad(population),
  };
}

/* ---------------------------------------------------------
   HEATING DEGREE DAYS
--------------------------------------------------------- */

/**
 * Measured from NCPOR's published Maitri archive at a 20 C indoor
 * setpoint. Real, but it is Maitri climatology 1990-2010 — it is not a
 * forecast and it is not Bharati, whose coastal regime differs.
 */
export const HDD_SETPOINT_C = 20;

export const MAITRI_HDD_MONTHLY = [
  { month: 1, meanTempC: 0.4, deltaT: 19.6, hdd: 608 },
  { month: 2, meanTempC: -2.5, deltaT: 22.5, hdd: 636 },
  { month: 3, meanTempC: -7.2, deltaT: 27.2, hdd: 843 },
  { month: 4, meanTempC: -11.6, deltaT: 31.6, hdd: 948 },
  { month: 5, meanTempC: -13.4, deltaT: 33.4, hdd: 1035 },
  { month: 6, meanTempC: -14.1, deltaT: 34.1, hdd: 1022 },
  { month: 7, meanTempC: -16.5, deltaT: 36.5, hdd: 1130 },
  { month: 8, meanTempC: -17.5, deltaT: 37.5, hdd: 1162 },
  { month: 9, meanTempC: -16.2, deltaT: 36.2, hdd: 1086 },
  { month: 10, meanTempC: -11.7, deltaT: 31.7, hdd: 982 },
  { month: 11, meanTempC: -5.2, deltaT: 25.2, hdd: 756 },
  { month: 12, meanTempC: -0.3, deltaT: 20.3, hdd: 629 },
];

export const MAITRI_ANNUAL_HDD = 10838;

/**
 * Seasonal swing is only 1.91x. Antarctic coastal stations are
 * persistently cold rather than extremely cold, so heat demand never
 * reaches zero: heating is a year-round baseload, not a winter event,
 * and every month of a fuel model must carry a thermal term.
 */
export const HDD_SEASONAL_SWING = 1.91;

export function heatingDegreeDays(month) {
  const row = MAITRI_HDD_MONTHLY.find((m) => m.month === month);
  if (!row) return q(null, "C.day", "B", null, `No HDD row for month ${month}.`);
  return q(
    row.hdd,
    "C.day",
    "A-ext",
    `${DERIV} FINDING 2`,
    "Measured from NCPOR's Maitri 3-hourly archive at a 20 C setpoint. Maitri climatology, not a Bharati value and not a forecast.",
  );
}

/* ---------------------------------------------------------
   HEAT DEMAND — and why the textbook form is not enough
--------------------------------------------------------- */

export const THERMAL_ANCHORS = {
  /** Bharati's documented maximum thermal demand. */
  maxThermalKwth: 155,
  /** Fabric conduction as a share of that load, bottom-up. */
  fabricShare: 0.17,
  /** Ventilation and snowmelt/DHW together are 75-83% of the real load. */
  ventilationKw: 43,
  snowmeltDhwKw: 34,
  bottomUpTotalKw: 103,
  /** Bharati's own architect, 170 mm panel, -40 C ext / +20 C int design case. */
  wallRoofUValueWm2K: 0.135,
};

/**
 * UA back-solved so that Q(August) lands on the documented 155 kWth.
 * It reproduces the peak and nothing else: it attributes the entire
 * load to conduction, so it collapses to zero as outdoor temperature
 * approaches the setpoint, which is false — ventilation and snowmelt
 * do not stop in January. Kept as a labelled anchor, never dispatched
 * as the model.
 */
export const UA_CALIBRATED_KW_PER_C = 4.1;

/**
 * The honest conduction term: 17% of 155 kWth spread over August's
 * 37.5 C delta. Roughly 0.70 kW/C, about six times smaller than the
 * calibrated figure above — which is exactly the dossier's warning
 * that a UA-only model under-predicts real thermal load by ~6x.
 */
export const UA_FABRIC_KW_PER_C = round(
  (THERMAL_ANCHORS.fabricShare * THERMAL_ANCHORS.maxThermalKwth) / 37.5,
  3,
);

export const UA_ONLY_UNDERPREDICTION = round(
  UA_CALIBRATED_KW_PER_C / UA_FABRIC_KW_PER_C,
  1,
);

/**
 * Q = UA x dT, fabric only. Exported so the UI can SHOW the naive
 * answer next to the corrected one — that contrast is the teaching
 * point — but it is never the number to act on.
 */
export function fabricConduction(outdoorTempC, { setpointC = HDD_SETPOINT_C } = {}) {
  const deltaT = setpointC - outdoorTempC;
  return q(
    round(UA_FABRIC_KW_PER_C * Math.max(deltaT, 0), 1),
    "kW",
    "D",
    `${ENERGY} correction (b); U-value from bof architekten`,
    `Q = UA x dT with UA = ${UA_FABRIC_KW_PER_C} kW/C. Conduction ONLY — about 17% of real thermal load. Displaying this as station heat demand under-predicts by roughly ${UA_ONLY_UNDERPREDICTION}x.`,
  );
}

/**
 * The corrected picture: conduction scales with outdoor temperature,
 * but ventilation (~43 kW) and snowmelt/DHW (~34 kW) dominate and are
 * broadly temperature-independent. At August's -17.5 C this sums to
 * ~103 kW against a documented 155 kWth maximum — same order, which is
 * the sanity check the bottom-up build is for.
 */
export function heatDemand(outdoorTempC, { setpointC = HDD_SETPOINT_C } = {}) {
  const fabric = fabricConduction(outdoorTempC, { setpointC });
  const total =
    fabric.value + THERMAL_ANCHORS.ventilationKw + THERMAL_ANCHORS.snowmeltDhwKw;
  return {
    deltaT: q(
      round(setpointC - outdoorTempC, 1),
      "C",
      "D",
      `${DERIV} FINDING 2`,
      `Indoor setpoint ${setpointC} C minus outdoor temperature.`,
    ),
    fabric,
    ventilation: q(
      THERMAL_ANCHORS.ventilationKw,
      "kW",
      "D",
      `${ENERGY} correction (b)`,
      "Bottom-up ventilation term. Broadly temperature-independent, which is why a UA-only model cannot reproduce it.",
    ),
    snowmeltDhw: q(
      THERMAL_ANCHORS.snowmeltDhwKw,
      "kW",
      "D",
      `${ENERGY} correction (b)`,
      "Snowmelt and domestic hot water. Driven by occupancy and water production, not by outdoor temperature.",
    ),
    total: q(
      round(total, 1),
      "kW",
      "D",
      `${ENERGY} correction (b), calibrated against ${OMRC}`,
      "Bottom-up sum. Conduction is the smallest of the three terms; the two service terms carry 75-83% of the load.",
    ),
    documentedMax: q(
      THERMAL_ANCHORS.maxThermalKwth,
      "kWth",
      "A",
      `${ATCM36}; ${OMRC} 2.3-2.4`,
      "Bharati's documented maximum thermal demand. The bottom-up total should sit at or under this.",
    ),
  };
}

/* ---------------------------------------------------------
   THE OPPOSITE-SEASON FINDING
--------------------------------------------------------- */

export const SEASONAL_OPPOSITION = {
  electrical: { peak: "summer", driver: "occupancy", summerKw: 120, winterKw: 80 },
  heat: { peak: "August", driver: "outdoor temperature", winterOverSummer: 1.91 },
  meetingPoint: "fuel burn",
};

/**
 * Both demands at once, so a caller cannot accidentally plot one and
 * label it the other. Bharati and Maitri heat from generator waste
 * heat rather than electrically, and summer population is roughly 3x
 * winter, which is why the electrical peak lands in the warm months
 * while the thermal peak lands in August. Fuel burn is the only place
 * the two curves meet.
 */
export function energyBalance({ population, outdoorTempC }) {
  return {
    electrical: electricalLoad(population),
    heat: heatDemand(outdoorTempC).total,
    opposition: SEASONAL_OPPOSITION,
    note: "Electrical load is occupancy-dominated and peaks in summer; heat demand is temperature-dominated and peaks in August. They are not the same curve and must never be drawn as one.",
  };
}

/* ---------------------------------------------------------
   PER-CAPITA DEMAND
--------------------------------------------------------- */

export const WATER_RATES = {
  /** Bharati: 1,000 L/day observed for a 13-person crew. The raw pair is citable; the rate is our division. */
  bharatiObservation: { litresPerDay: 1000, crew: 13 },
  bharatiLitresPerPersonDay: round(1000 / 13, 0),
  /** Maitri's measured rate. Frugal against peers (Wasa 100-135, Ferraz ~105). */
  maitriLitresPerPersonDay: 40,
};

export const BHARATI_WATER_PLANT = {
  /** RO design output and stored volume. Design figures, not meter readings. */
  roDesignLitresPerDay: 2000,
  storedLitres: 12000,
};

export function waterDemand(
  population,
  { litresPerPersonDay = WATER_RATES.bharatiLitresPerPersonDay } = {},
) {
  return q(
    round(population * litresPerPersonDay, 0),
    "L/day",
    "D",
    `${ATCM36}; ${OMRC} 2.5`,
    `${litresPerPersonDay} L/person/day x ${population}. The Bharati rate is one observed snapshot (1,000 L/day for 13 people) divided out, not a metered series — there is no public water feed.`,
  );
}

/**
 * Demand against the RO plant's design output. At any summer headcount
 * this goes negative, which is a real derived tension worth surfacing:
 * the 12,000 L store is the buffer that absorbs it, and how long that
 * buffer lasts is the number to show.
 */
export function waterBalance(population, options = {}) {
  const demand = waterDemand(population, options);
  const production = options.productionLitresPerDay ?? BHARATI_WATER_PLANT.roDesignLitresPerDay;
  const deficit = demand.value - production;
  const bufferDays =
    deficit > 0 ? round(BHARATI_WATER_PLANT.storedLitres / deficit, 1) : null;
  return {
    demand,
    production: q(
      production,
      "L/day",
      options.productionLitresPerDay == null ? "A" : "S",
      `${OMRC} 2.5`,
      options.productionLitresPerDay == null
        ? "RO plant DESIGN output. Actual production is not published — treat as a rating, not a reading."
        : "Caller-supplied production figure.",
    ),
    stored: q(
      BHARATI_WATER_PLANT.storedLitres,
      "L",
      "A",
      `${OMRC} 2.5; ${ATCM36}`,
      "Stored volume at Bharati.",
    ),
    deficit: q(
      round(deficit, 0),
      "L/day",
      "D",
      `${OMRC} 2.5`,
      "Positive means demand exceeds the RO plant's design output.",
    ),
    bufferDays: q(
      bufferDays,
      "days",
      "D",
      `${OMRC} 2.5`,
      bufferDays == null
        ? "Production covers modelled demand, so the store is not being drawn down."
        : "Stored volume divided by the modelled shortfall. Ignores lake/ice melt top-up, for which no figure is published.",
    ),
  };
}

/**
 * ~0.97 kg/person/day, derived at Syowa (Japan, 37 winterers) and
 * reported through COMNAP. Another station's number: use it as an
 * order-of-magnitude anchor, not as Bharati's rate. Bharati's own CEE
 * design estimate (~15 kg/day winter, ~20 summer) lives in waste.js.
 */
export const WASTE_KG_PER_PERSON_DAY = 0.97;

export function wasteGeneration(
  population,
  { kgPerPersonDay = WASTE_KG_PER_PERSON_DAY } = {},
) {
  return q(
    round(population * kgPerPersonDay, 1),
    "kg/day",
    "D",
    `${LOGI} — COMNAP 2006, Syowa`,
    `${kgPerPersonDay} kg/person/day x ${population}. Combustible plus food waste, derived at another station. Bharati publishes no waste tonnage — the records exist because the law compels them, which is exactly why they are not public.`,
  );
}

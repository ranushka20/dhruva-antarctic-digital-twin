import { q, round } from "./util";

/* =========================================================
   WORK WINDOW — R1: weather to outdoor work feasibility

   "Everything depends on the weather", including waste handling and
   instrument checks, which are rescheduled daily. So a maintenance
   backlog at Bharati is a weather function, not a staffing one.

   Two exceedance datasets appear below. They are NOT interchangeable
   and are deliberately kept in separate constants with separate
   classes: one is 3 months of Bharati's own AWS, the other is 21 years
   of Maitri climatology. Conflating them would turn a measurement into
   a fabrication, and Maitri's wind regime is roughly three times
   harsher at the 25 kt threshold.
========================================================= */

const AWS = "data.ncpor.res.in — Bharati AWS, measured first-hand";
const DERIV = "coupling-model-derivations.md FINDING 3 (Maitri 1990-2010)";

/**
 * The dossier works to two thresholds throughout. 25 kt is where
 * outdoor work starts being restricted, 34 kt is the gale line above
 * which it stops. They are conventional (Beaufort-aligned) operational
 * thresholds, not an NCPOR-published limit, so A-ext rather than A.
 */
export const WIND_THRESHOLDS = { cautionKt: 25, stopKt: 34 };

/** Bharati's OWN measurement. Three months only. Do not extrapolate to a year. */
export const BHARATI_WIND_EXCEEDANCE = {
  window: "Jan-Mar 2024",
  station: "Bharati",
  ge25kt: 0.0807,
  ge34kt: 0.0193,
  cls: "A",
  source: AWS,
  note: "Measured at Bharati over three summer months. Summer is the calmest part of the year, so this understates an annual figure.",
};

/** Maitri, 21 years, 3-hourly. A different station and a full-year sample. */
export const MAITRI_WIND_CLIMATOLOGY = {
  window: "1990-2010",
  station: "Maitri",
  ge25kt: 0.264,
  ge34kt: 0.09,
  peakMonth: 5,
  peakGe25kt: 0.38,
  cls: "A-ext",
  source: DERIV,
  note: "Maitri climatology, not a Bharati value and not a forecast. Bharati is coastal and its regime differs; never transfer these rates without saying so.",
};

/** Monthly calm availability at Maitri. Availability fraction x 24, not contiguous hours. */
export const MAITRI_MONTHLY_CALM = [
  { month: 1, belowCaution: 0.897, belowStop: 0.982, usableHoursPerDay: 21.5 },
  { month: 2, belowCaution: 0.811, belowStop: 0.956, usableHoursPerDay: 19.5 },
  { month: 3, belowCaution: 0.741, belowStop: 0.928, usableHoursPerDay: 17.8 },
  { month: 4, belowCaution: 0.662, belowStop: 0.892, usableHoursPerDay: 15.9 },
  { month: 5, belowCaution: 0.62, belowStop: 0.849, usableHoursPerDay: 14.9 },
  { month: 6, belowCaution: 0.639, belowStop: 0.849, usableHoursPerDay: 15.3 },
  { month: 7, belowCaution: 0.648, belowStop: 0.869, usableHoursPerDay: 15.6 },
  { month: 8, belowCaution: 0.683, belowStop: 0.859, usableHoursPerDay: 16.4 },
  { month: 9, belowCaution: 0.745, belowStop: 0.912, usableHoursPerDay: 17.9 },
  { month: 10, belowCaution: 0.733, belowStop: 0.909, usableHoursPerDay: 17.6 },
  { month: 11, belowCaution: 0.782, belowStop: 0.943, usableHoursPerDay: 18.8 },
  { month: 12, belowCaution: 0.866, belowStop: 0.972, usableHoursPerDay: 20.8 },
];

/**
 * Good weather arrives in blocks, which is what makes scheduling against
 * it realistic rather than fantasy: 86.6% of calm hours sit inside runs
 * of 24 h or more.
 */
export const CALM_RUNS = {
  runs: 3611,
  medianHours: 15,
  meanHours: 37.2,
  longestHours: 1317,
  shareInRunsOfAtLeast: { 6: 0.979, 12: 0.943, 24: 0.866, 48: 0.744 },
  cls: "A-ext",
  source: DERIV,
};

/** The constraint side: roughly nine day-long lockdowns and two multi-day ones a year. */
export const STORM_EPISODES = {
  episodes: 1590,
  medianHours: 6,
  meanHours: 10.3,
  longestHours: 111,
  perYearAtLeast: { 12: 22, 24: 9, 48: 2, 72: 0.3 },
  cls: "A-ext",
  source: DERIV,
};

/**
 * Bharati's AWS carries temperature, pressure, wind speed, wind
 * direction and humidity. It has NO visibility sensor and there is no
 * WMO station at Bharati (Zhongshan and Progress, 8-10 km away, are
 * proxies and must be labelled as such). A USAP-style Condition
 * I/II/III tier needs visibility, so it cannot honestly be computed
 * here. The correct output is this refusal, not a wind-only imitation
 * of a tier that means something else.
 */
export const CONDITION_TIER_UNAVAILABLE = {
  value: null,
  unit: null,
  cls: "B",
  source: AWS,
  note: "Condition I/II/III requires visibility. Bharati's AWS has no visibility variable and Bharati has no WMO station, so the tier cannot be computed for this station.",
};

export function conditionTier() {
  return CONDITION_TIER_UNAVAILABLE;
}

/**
 * Task classes. The two wind thresholds are the dossier's; WHICH task
 * sits at which threshold is our assignment, so the envelope carries
 * class D and a caller can override any of it. The dossier names
 * weather-gated activities (cargo, helicopter, field work, waste
 * handling, instrument checks) but publishes no per-task wind limit.
 */
export const TASK_CLASSES = {
  "instrument-check": { label: "Instrument check", windMaxKt: 25, durationHours: 2 },
  "waste-handling": { label: "Waste handling", windMaxKt: 25, durationHours: 3 },
  "vehicle-convoy": { label: "Vehicle convoy", windMaxKt: 34, durationHours: 12 },
  "cargo-lift": { label: "Cargo / sling lift", windMaxKt: 25, durationHours: 6 },
  "field-party": { label: "Field party", windMaxKt: 25, durationHours: 24 },
};

export const TASK_ENVELOPE_NOTE =
  "Thresholds are the dossier's 25 kt / 34 kt; the assignment of a task class to a threshold and its duration are ours. Override per task where a real SOP is known.";

/**
 * Feasibility for one task against one wind reading.
 * open       below 25 kt
 * restricted 25-34 kt, above the task limit but below the gale line
 * stopped    at or above 34 kt, or above the task's own limit
 */
export function workFeasibility({ windKt, task = TASK_CLASSES["instrument-check"] }) {
  const limit = task.windMaxKt ?? WIND_THRESHOLDS.cautionKt;
  let tier = "open";
  if (windKt >= WIND_THRESHOLDS.stopKt) tier = "stopped";
  else if (windKt >= limit) tier = "stopped";
  else if (windKt >= WIND_THRESHOLDS.cautionKt) tier = "restricted";

  return {
    task: task.label ?? "Outdoor task",
    tier: q(
      tier,
      null,
      "D",
      "SIH dossier R1",
      TASK_ENVELOPE_NOTE,
    ),
    wind: q(
      round(windKt, 1),
      "kt",
      "A",
      AWS,
      "Live Bharati AWS wind speed. The only variable in this whole twin that streams.",
    ),
    limitKt: q(limit, "kt", "D", "SIH dossier R1", TASK_ENVELOPE_NOTE),
    feasible: tier !== "stopped",
    visibility: CONDITION_TIER_UNAVAILABLE,
  };
}

/**
 * Climatological outlook for a month. This is Maitri, and it is a
 * 21-year average — it says what usually happens, never what will
 * happen. Returned labelled so a UI cannot quietly present it as a
 * Bharati forecast.
 */
export function monthlyWorkOutlook(month) {
  const row = MAITRI_MONTHLY_CALM.find((m) => m.month === month);
  if (!row) return q(null, null, "B", null, `No climatology row for month ${month}.`);
  return {
    month,
    belowCaution: q(
      row.belowCaution,
      "fraction",
      "A-ext",
      DERIV,
      "Share of Maitri observations below 25 kt. Climatology, not a forecast, and not Bharati.",
    ),
    belowStop: q(row.belowStop, "fraction", "A-ext", DERIV, "Share below 34 kt at Maitri."),
    usableHoursPerDay: q(
      row.usableHoursPerDay,
      "h/day",
      "D",
      DERIV,
      "Availability fraction x 24. An expected total, not a contiguous block — see calmWindowShare for contiguity.",
    ),
  };
}

/**
 * Share of calm hours that fall inside runs long enough for a task of
 * the given length. Only four run-lengths were computed, so this snaps
 * DOWN to the nearest documented one rather than interpolating a
 * number nobody measured.
 */
export function calmWindowShare(hoursNeeded) {
  const buckets = Object.keys(CALM_RUNS.shareInRunsOfAtLeast)
    .map(Number)
    .sort((a, b) => a - b);
  const bucket = buckets.filter((b) => b <= hoursNeeded).pop() ?? buckets[0];
  return q(
    CALM_RUNS.shareInRunsOfAtLeast[bucket],
    "fraction",
    "A-ext",
    DERIV,
    `Share of Maitri calm hours sitting in runs of at least ${bucket} h (nearest computed run-length at or below the ${hoursNeeded} h requested; the intermediate values were never measured).`,
  );
}

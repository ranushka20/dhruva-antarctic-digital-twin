import { addDays, daysBetween, isoDate, q, round, toDate, utcDate } from "./util";

/* =========================================================
   AUTONOMY — R4 and R8: days of cover against the one ship a year

   The load-bearing fact of Indian Antarctic logistics: there is ONE
   expedition per year. It launches in the last week of October, the
   vessel is back in Cape Town in the first week of April, and entry
   and exit are restricted to November-March — roughly eight months a
   year with no scheduled transport at all.

   That makes criticality a function of the calendar, not only of the
   stock level. A spare consumed in April cannot be replaced until the
   following January, and the order that would have replaced it had to
   reach NCPOR by 31 August of the previous year.

   Nothing here returns a single depletion date. Arrival is uncertain
   by +/-30% (voyage 10-16 days, itineraries that differ by 6 days
   between published seasons), so a forecast drawn as a line is a
   forecast drawn wrong.
========================================================= */

const AL01 = "NCPOR AL-01 (expedition advisory)";
const AL02 = "NCPOR AL-02";
const ISEA39 = "39-ISEA handbook 4.0";

export const RESUPPLY_CALENDAR = {
  /** HARD. "Cargo reaching NCPOR after 31 August shall not be accepted and returned to the owners at their cost." */
  seaCargoCutoff: { month: 8, day: 31, cls: "A", source: `${AL01} 4.2` },
  /** Early-summer scientific cargo by airlift via Cape Town. */
  airliftCargoCutoff: { month: 7, day: 31, cls: "A", source: `${AL01} 4.1` },
  /** Direct delivery to Cape Town. */
  capeTownDirectCutoff: { month: 12, day: 1, cls: "A", source: `${AL01} 4.3` },
  /** Expedition launched from Goa, consistently in the last week of October. */
  launchWindow: { month: 10, fromDay: 25, toDay: 31, cls: "A", source: AL01 },
  /** Vessel de-charter / return Cape Town, 4 Apr in 2022, 2023 and planned 2026. */
  capeTownReturn: { month: 4, fromDay: 1, toDay: 7, documentedDay: 4, cls: "A", source: AL01 },
  /** Voyage Cape Town - India Bay - Larsemann Hills, Dec through Mar. */
  stationCallWindow: { fromMonth: 12, toMonth: 3, cls: "A", source: `${AL01} 2.1` },
  /** 10-16 days depending on sea ice; the voyage plan varies annually. */
  voyageDays: { min: 10, max: 16, cls: "A", source: AL02 },
  /** Goa - Mumbai - Cape Town commercial liner, including customs. */
  mainlandTransitDays: 45,
  /** "Entry and exit to Antarctica is restricted between November to March." */
  isolationMonths: { fromMonth: 4, toMonth: 10, cls: "A", source: ISEA39 },
};

/**
 * +/-30%. Every depletion forecast is anchored to an arrival date that
 * is itself uncertain by this much, so the uncertainty propagates
 * forward into every downstream deadline rather than being rounded
 * away at the first step.
 */
export const ARRIVAL_UNCERTAINTY = 0.3;

/** Apr-Oct: no scheduled transport in or out. This is why the twin is offline-first. */
export function isolationState(now) {
  const month = toDate(now).getUTCMonth() + 1;
  const isolated = month >= 4 && month <= 10;
  return {
    isolated: q(
      isolated,
      null,
      "A",
      ISEA39,
      "Entry and exit are restricted to November-March, so April-October has no scheduled transport access.",
    ),
    month,
  };
}

/**
 * The next hard cargo cut-off. Rolls to next year once passed, because
 * a missed 31 August means waiting a full cycle — the deadline does not
 * soften, the cargo is returned at the owner's expense.
 */
export function nextCargoCutoff(now) {
  const d = toDate(now);
  const year = d.getUTCFullYear();
  const thisYear = utcDate(year, 8, 31);
  const cutoff = d <= thisYear ? thisYear : utcDate(year + 1, 8, 31);
  return {
    date: q(
      isoDate(cutoff),
      null,
      "A",
      `${AL01} 4.2`,
      "Hard deadline. Cargo arriving at NCPOR after this date is refused and returned at the owner's cost.",
    ),
    daysRemaining: q(
      Math.max(0, Math.ceil(daysBetween(d, cutoff))),
      "days",
      "D",
      `${AL01} 4.2`,
      "Days from the supplied `now` to the published cut-off.",
    ),
  };
}

/**
 * Last safe order date: the cargo cut-off walked back by however long
 * procurement and inland movement take. The dossier publishes the
 * cut-off and the 45-day Goa-to-Cape Town sea leg, but NOT a
 * procurement lead time for any part — that is programme-internal. So
 * the lead time is a caller-supplied parameter and the answer inherits
 * its class.
 */
export function lastSafeOrderDate({ now, procurementLeadDays = null }) {
  const cutoff = nextCargoCutoff(now);
  if (procurementLeadDays == null) {
    return {
      cutoff,
      date: q(
        null,
        null,
        "B",
        `${AL01} 4.2`,
        "Cannot be computed: the dossier is silent on procurement lead time for any part. Supply `procurementLeadDays` to walk the 31 August cut-off backwards.",
      ),
    };
  }
  const cutoffDate = toDate(cutoff.date.value);
  const lsod = addDays(cutoffDate, -procurementLeadDays);
  return {
    cutoff,
    date: q(
      isoDate(lsod),
      null,
      "S",
      `${AL01} 4.2 + caller-supplied lead time`,
      `31 August cut-off minus ${procurementLeadDays} days. The cut-off is documented; the lead time is not published anywhere, so this date is only as real as the number supplied.`,
    ),
    daysRemaining: q(
      Math.ceil(daysBetween(toDate(now), lsod)),
      "days",
      "S",
      `${AL01} 4.2 + caller-supplied lead time`,
      "Negative means the order window for this resupply cycle has already closed.",
    ),
    passed: daysBetween(toDate(now), lsod) < 0,
  };
}

/**
 * The window in which the vessel could call at the station. If a
 * published itinerary gives a planned arrival, it is widened by the
 * documented +/-30%; otherwise the honest answer is the whole Dec-Mar
 * voyage season.
 */
export function resupplyOutlook({ now, plannedArrival = null }) {
  const d = toDate(now);
  if (plannedArrival == null) {
    const year = d.getUTCFullYear();
    const seasonStart =
      d.getUTCMonth() + 1 >= 4 ? utcDate(year, 12, 1) : utcDate(year - 1, 12, 1);
    const start = seasonStart > d ? seasonStart : d;
    const end = utcDate(seasonStart.getUTCFullYear() + 1, 3, 31);
    return {
      earliest: q(
        isoDate(start),
        null,
        "D",
        `${AL01} 2.1, 6.1`,
        "No planned arrival supplied, so the window is the published Dec-Mar voyage season rather than a date.",
      ),
      latest: q(isoDate(end), null, "D", `${AL01} 2.1`, "End of the published voyage season."),
      planned: q(null, null, "B", null, "No itinerary supplied."),
    };
  }
  const planned = toDate(plannedArrival);
  const lead = Math.max(1, daysBetween(d, planned));
  const spread = lead * ARRIVAL_UNCERTAINTY;
  return {
    earliest: q(
      isoDate(addDays(planned, -spread)),
      null,
      "D",
      `${AL02}; SIH dossier R8`,
      `Planned arrival less ${Math.round(ARRIVAL_UNCERTAINTY * 100)}% of the remaining lead time. Voyage is 10-16 days depending on sea ice and two published itineraries differ by six days.`,
    ),
    planned: q(
      isoDate(planned),
      null,
      "A",
      "Published itinerary",
      "Planned arrival as published. Planned dates are real; actual dates are not published.",
    ),
    latest: q(
      isoDate(addDays(planned, spread)),
      null,
      "D",
      `${AL02}; SIH dossier R8`,
      "Planned arrival plus the same band. Show resource risk against this range, never against the planned date alone.",
    ),
    spreadDays: q(round(spread, 0), "days", "D", "SIH dossier R8", "Half-width of the arrival band."),
  };
}

/**
 * Days of cover. Stock levels and burn rates are exactly the telemetry
 * NCPOR does not publish — fuel tank levels, generator runtime and the
 * inventory database are all confirmed to exist and all closed. So the
 * caller declares the class of what it fed in and the answer inherits
 * it; the default is S because a demo number is the usual case.
 */
export function daysOfCover({ stock, burnPerDay, cls = "S", unit = "units", source = null }) {
  if (!burnPerDay || burnPerDay <= 0) {
    return q(null, "days", "B", source, "No burn rate: days of cover is undefined.");
  }
  return q(
    round(stock / burnPerDay, 1),
    "days",
    cls,
    source,
    `${stock} ${unit} at ${burnPerDay} ${unit}/day. Inherits the class of the inputs — there is no public feed for either.`,
  );
}

/**
 * Depletion as a BAND. The dossier gives no variance for any burn
 * rate, so the band defaults to the same +/-30% the arrival date
 * carries: it is a demo width chosen to stop the forecast being drawn
 * as a line, not a measured spread. Narrow it the moment a real burn
 * series exists.
 */
export function projectDepletion({
  stock,
  burnPerDay,
  now,
  uncertainty = ARRIVAL_UNCERTAINTY,
  cls = "S",
  unit = "units",
}) {
  if (!burnPerDay || burnPerDay <= 0) {
    return {
      cover: q(null, "days", "B", null, "No burn rate supplied."),
      earliest: q(null, null, "B", null, "No burn rate supplied."),
      latest: q(null, null, "B", null, "No burn rate supplied."),
    };
  }
  const nominalDays = stock / burnPerDay;
  const fastDays = stock / (burnPerDay * (1 + uncertainty));
  const slowDays = stock / (burnPerDay * (1 - uncertainty));
  const note = `Burn band +/-${Math.round(uncertainty * 100)}%. The dossier publishes no burn-rate variance; this width mirrors the documented arrival uncertainty so the result is a band rather than a false-precision date.`;
  return {
    cover: daysOfCover({ stock, burnPerDay, cls, unit }),
    earliest: q(isoDate(addDays(now, fastDays)), null, cls, null, note),
    nominal: q(isoDate(addDays(now, nominalDays)), null, cls, null, "Central estimate. Do not display without the band."),
    latest: q(isoDate(addDays(now, slowDays)), null, cls, null, note),
    coverDaysRange: q(
      [round(fastDays, 1), round(slowDays, 1)],
      "days",
      cls,
      null,
      note,
    ),
  };
}

/**
 * Does the cover reach the ship? Compares the depletion band against
 * the arrival band, which is the only comparison that matters when
 * there is one delivery a year.
 */
export function autonomyVerdict({ depletion, arrival }) {
  if (depletion?.earliest?.value == null || arrival?.latest?.value == null) {
    return q(null, null, "B", null, "Not enough information to judge cover against arrival.");
  }
  const runsOutEarliest = toDate(depletion.earliest.value);
  const runsOutLatest = toDate(depletion.latest.value);
  const shipEarliest = toDate(arrival.earliest.value);
  const shipLatest = toDate(arrival.latest.value);

  let verdict = "covered";
  if (runsOutLatest < shipEarliest) verdict = "shortfall";
  else if (runsOutEarliest < shipLatest) verdict = "at-risk";

  return q(
    verdict,
    null,
    "D",
    "SIH dossier R4, R8",
    verdict === "shortfall"
      ? "Stock is exhausted before the earliest possible arrival, and there is no second delivery."
      : verdict === "at-risk"
        ? "The depletion band overlaps the arrival band. Whether this holds depends on sea ice."
        : "Cover extends past the latest plausible arrival.",
  );
}

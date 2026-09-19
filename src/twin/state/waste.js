import { wasteGeneration } from "./coupling";
import { addDays, daysBetween, isoDate, q, round, toDate } from "./util";

/* =========================================================
   WASTE — R5: generation to drums to retro-cargo to the law

   This is where operations and compliance become the same object.
   Waste is drummed in 200 L units and leaves on the annual vessel, so
   storage capacity is finite and the removal opportunity comes round
   once a year. Miss it and the drums stay for another cycle.

   Three duties are statutory and dated, and the twin treats them as
   deadlines rather than as text:
     - six waste categories                Act s.34(2) / IAEP Rules 2023 r.29
     - hazardous containers inspected and
       documented at least weekly          Act s.37(2)(d)
     - removals and disposal locations
       filed within 30 days                IAEP Rules 2023 r.38(2)

   What is NOT here: a tamper-evident hash chain, a retention period,
   or any claim that automated capture is required. None of those
   appear in the Act, the Rules, the Protocol or any Annex.
========================================================= */

const ACT = "Indian Antarctic Act 2022 (13 of 2022)";
const RULES = "IAEP Rules 2023";
const OMRC = "OMRC tender NCAOR/LH(20)/2013 2.6";
const CEE = "Bharati CEE design estimate";

export const DRUM_LITRES = 200;

/** Act s.34(2) and Rules r.29 reproduce Annex III Art.8(1) almost verbatim. */
export const WASTE_CATEGORIES = [
  { code: "WASTE-1", label: "Sewage and domestic liquid waste", annexIII: "Group 1" },
  {
    code: "WASTE-2",
    label: "Other liquid waste including medical, chemical, fuels and lubricants",
    annexIII: "Group 2",
  },
  { code: "WASTE-3", label: "Solids to be incinerated, including organic waste", annexIII: "Group 3" },
  { code: "WASTE-4", label: "Other solid waste", annexIII: "Group 4" },
  { code: "WASTE-5", label: "Radioactive material", annexIII: "Group 5" },
  { code: "WASTE-6", label: "Any other waste as may be prescribed", annexIII: "India-specific open category" },
];

export const WASTE_CATEGORY_SOURCE = `${ACT} s.34(2); ${RULES} r.29; Annex III Art.8(1)`;

/** Bharati's CEE design estimate. A design figure, never a measurement. */
export const CEE_DESIGN_KG_PER_DAY = { winter: 15, summer: 20 };

export const INSPECTION_INTERVAL_DAYS = 7;
export const REPORTING_WINDOW_DAYS = 30;

/**
 * Accumulation over a period.
 *
 * Two things the dossier is silent on and which therefore stay as
 * caller-supplied parameters:
 *   kgPerDrum      — mass of a filled 200 L drum depends entirely on
 *                    the stream. No figure is published anywhere, so
 *                    without it the drum count is simply not computed.
 *   categorySplit  — no per-category breakdown exists for either
 *                    station. Supply fractions or get the total only.
 */
export function wasteAccumulation({
  population,
  days,
  kgPerDrum = null,
  kgPerPersonDay,
  categorySplit = null,
}) {
  const rate = wasteGeneration(population, kgPerPersonDay ? { kgPerPersonDay } : {});
  const totalKg = rate.value * days;

  const drums =
    kgPerDrum == null
      ? q(
          null,
          "drums",
          "B",
          OMRC,
          "The 200 L drum is documented; the mass of a filled drum is not, for any stream. Supply `kgPerDrum` to convert, and label the result simulated.",
        )
      : q(
          round(totalKg / kgPerDrum, 1),
          "drums",
          "S",
          `${OMRC} + caller-supplied fill mass`,
          `Kilograms divided by a caller-supplied ${kgPerDrum} kg per 200 L drum. The drum size is real; the fill mass is not published.`,
        );

  return {
    ratePerDay: rate,
    totalKg: q(
      round(totalKg, 1),
      "kg",
      "D",
      rate.source,
      `${days} days at the modelled per-capita rate. Compare against Bharati's CEE design estimate of ${CEE_DESIGN_KG_PER_DAY.winter}-${CEE_DESIGN_KG_PER_DAY.summer} kg/day as a sanity check.`,
    ),
    designRange: q(
      [CEE_DESIGN_KG_PER_DAY.winter, CEE_DESIGN_KG_PER_DAY.summer],
      "kg/day",
      "D",
      CEE,
      "Winter and summer design estimates from Bharati's CEE. A design figure, not a measured tonnage.",
    ),
    drums,
    byCategory:
      categorySplit == null
        ? q(
            null,
            null,
            "B",
            WASTE_CATEGORY_SOURCE,
            "The six categories are statutory; the split between them at Bharati is not published. Supply fractions to break the total down.",
          )
        : q(
            WASTE_CATEGORIES.map((c) => ({
              code: c.code,
              label: c.label,
              kg: round(totalKg * (categorySplit[c.code] ?? 0), 1),
            })),
            "kg",
            "S",
            `${WASTE_CATEGORY_SOURCE} + caller-supplied split`,
            "Categories are statutory; the proportions are the caller's.",
          ),
  };
}

/**
 * Drums on the floor at the moment the ship arrives, against capacity.
 * Storage capacity in drums is nowhere in the dossier, so it is a
 * caller parameter; without it there is no breach date to compute and
 * saying so is the correct output.
 */
export function drumProjection({
  drumsOnHand = 0,
  population,
  now,
  retroCargoDate,
  kgPerDrum = null,
  capacityDrums = null,
  kgPerPersonDay,
}) {
  const days = Math.max(0, Math.ceil(daysBetween(now, retroCargoDate)));
  const acc = wasteAccumulation({ population, days, kgPerDrum, kgPerPersonDay });

  if (acc.drums.value == null || capacityDrums == null) {
    return {
      daysToRetroCargo: q(
        days,
        "days",
        "D",
        "NCPOR AL-01 2.1",
        "Days to the next retro-cargo sailing. Waste leaves on the same vessel that delivers, once a year.",
      ),
      accumulation: acc,
      projectedDrums: q(
        null,
        "drums",
        "B",
        null,
        capacityDrums == null
          ? "No storage capacity figure exists for Bharati's waste store, so a breach cannot be projected."
          : "No drum fill mass supplied.",
      ),
      breachDate: q(null, null, "B", null, "Not computable without both a fill mass and a capacity."),
    };
  }

  const projected = drumsOnHand + acc.drums.value;
  const drumsPerDay = acc.drums.value / Math.max(days, 1);
  const daysToBreach =
    drumsPerDay > 0 ? (capacityDrums - drumsOnHand) / drumsPerDay : null;
  const breaches = projected > capacityDrums;

  return {
    daysToRetroCargo: q(days, "days", "D", "NCPOR AL-01 2.1", "Days to the next retro-cargo sailing."),
    accumulation: acc,
    projectedDrums: q(
      round(projected, 1),
      "drums",
      "S",
      `${OMRC} + caller-supplied fill mass`,
      "Drums on hand plus modelled accumulation to the vessel date.",
    ),
    capacity: q(capacityDrums, "drums", "S", null, "Caller-supplied. Bharati's waste-store capacity is not published."),
    breaches,
    breachDate:
      breaches && daysToBreach != null && daysToBreach >= 0
        ? q(
            isoDate(addDays(now, daysToBreach)),
            null,
            "S",
            null,
            "Date storage fills at the modelled rate, before the vessel arrives. Inherits the class of the supplied capacity and fill mass.",
          )
        : q(null, null, "D", null, "Storage is projected to hold until the retro-cargo window."),
  };
}

/**
 * Act s.37(2)(d): hazardous-waste containers "shall be inspected at
 * least once in a week for identifying any leakage and deterioration
 * thereof and shall be documented." A legal duty with a cadence, so
 * the twin can hold it as a countdown.
 */
export function inspectionStatus({ lastInspectionAt, now }) {
  if (lastInspectionAt == null) {
    return {
      due: q(null, null, "B", `${ACT} s.37(2)(d)`, "No inspection record supplied."),
      overdue: null,
    };
  }
  const due = addDays(lastInspectionAt, INSPECTION_INTERVAL_DAYS);
  const overdueDays = daysBetween(due, now);
  return {
    interval: q(
      INSPECTION_INTERVAL_DAYS,
      "days",
      "A",
      `${ACT} s.37(2)(d)`,
      "Weekly documented inspection of hazardous-waste containers is a statutory duty, not a housekeeping convention.",
    ),
    lastInspection: q(isoDate(lastInspectionAt), null, "S", null, "Inspection records exist because the law compels them, which is precisely why they are not public."),
    due: q(isoDate(due), null, "D", `${ACT} s.37(2)(d)`, "Last inspection plus seven days."),
    overdue: overdueDays > 0,
    overdueDays: q(
      overdueDays > 0 ? round(overdueDays, 1) : 0,
      "days",
      "D",
      `${ACT} s.37(2)(d)`,
      "Days past the weekly duty.",
    ),
  };
}

/**
 * Rules r.38(2): removal and disposal details, including incineration
 * and disposal locations, go to the Committee within 30 days of each
 * permit-year completion, and no later than 30 days before permit
 * expiry.
 */
export function reportingStatus({ permitYearEnd, now, submittedAt = null }) {
  if (permitYearEnd == null) {
    return q(null, null, "B", `${RULES} r.38(2)`, "No permit-year end supplied.");
  }
  const dueBy = addDays(permitYearEnd, REPORTING_WINDOW_DAYS);
  const submitted = submittedAt != null && toDate(submittedAt) <= dueBy;
  const daysRemaining = daysBetween(now, dueBy);
  return {
    dueBy: q(
      isoDate(dueBy),
      null,
      "A",
      `${RULES} r.38(2)`,
      "Within 30 days of each permit-year completion, and at least 30 days before permit expiry.",
    ),
    daysRemaining: q(round(daysRemaining, 0), "days", "D", `${RULES} r.38(2)`, "Negative means the statutory window has closed."),
    submitted,
    state: q(
      submitted ? "filed" : daysRemaining < 0 ? "breached" : "open",
      null,
      "D",
      `${RULES} r.38(2)`,
      "Derived from the supplied filing record. Whether NCPOR has actually filed is not public.",
    ),
  };
}

import { hoursBetween, q, round } from "./util";

/* =========================================================
   SYNC — R6: outage to local autonomy to HQ staleness

   Offline-first here is not an architectural preference. On 7 October
   2013 the Station Leader at Bharati cut power to the NRSC-run
   satellite ground station during a personnel dispute, and the station
   was totally dark to HQ until 12 October — five days, caused
   administratively rather than by equipment or weather. Redundancy
   planning that only covers technical failure would not have helped.

   The tiering is ours, but the law implies it: emergency duties are
   "without delay" while compliance duties run to 30, 60 and 90 days.
   Store-and-forward with a priority lane is the correct fit, not a
   compromise.
========================================================= */

const OUTAGE_2013 = "ncpor.res.in/news/view/196 — Bharati, 7-12 October 2013";
const AWS = "data.ncpor.res.in — Bharati AWS, measured first-hand";
const CONNECTIVITY = "domain-research-synthesis.md, Domain 5";

/**
 * T0 must clear on any link at all; T3 waits for a wide window and, at
 * some stations, for an aircraft. Each tier names the duty that
 * justifies its position rather than a made-up SLA.
 */
export const SYNC_TIERS = [
  {
    tier: 0,
    id: "life-safety",
    label: "Life safety and medical",
    basis: "Act s.39(1) emergency response without delay; s.49 offence reported immediately; Annex III Art.12(2)",
    cls: "A",
  },
  {
    tier: 1,
    id: "critical-ops",
    label: "Critical operations",
    basis: "Incidents must be reported to the station manager, who transmits to NCAOR (ATCM36). No statutory clock, but operationally immediate.",
    cls: "A",
  },
  {
    tier: 2,
    id: "compliance-logistics",
    label: "Compliance and logistics",
    basis: "IAEP Rules r.38(2) 30 days; Act s.40 proviso 60 days; Rules r.10(1)(e) 3 months. Day-scale duties, so they can queue.",
    cls: "A",
  },
  {
    tier: 3,
    id: "bulk-science",
    label: "Bulk science",
    basis: "No deadline in any instrument. At South Pole, bulk science still flies out on disks once a year.",
    cls: "A-ext",
  },
];

export const TIER_DESIGN_NOTE =
  "The four tiers are our design. What is documented is the asymmetry they exploit: emergency duties are immediate and compliance duties are 30-90 days.";

/**
 * Link figures, kept apart so none of them can be mistaken for a
 * committed NCPOR throughput. Bandwidth specifications are not
 * publicly verified for either Indian station.
 */
export const LINK_FACTS = {
  maitriSatcomRfMhz: q(
    4,
    "MHz",
    "A-ext",
    "NCPOR Significant Achievements",
    "A published RF bandwidth for Maitri's SATCOM facility. It is not an IP throughput figure and must not be converted to Mbps.",
  ),
  pressQuotedLine: q(
    2,
    "Mbps",
    "C",
    "Frontline 2023, quoting Dr Shailendra Saini, NCPOR",
    "A journalist's quote of a named official, not a technical specification.",
  ),
  iridiumFallbackKbps: q(
    [128, 200],
    "kbps",
    "A-ext",
    CONNECTIVITY,
    "Iridium OpenPort era. This, not NCPOR, is where the 128 kbps demo figure actually comes from — it is a legitimate deep-fallback tier number and nothing more.",
  ),
  committedThroughput: q(
    null,
    null,
    "B",
    "NCPOR tenders, GeM, CPPP searched",
    "Bandwidth specifications not publicly verified. No document states a committed VSAT or transponder capacity in Mbps for either station.",
  ),
  latency: q(null, "ms", "B", null, "No public latency figure found for either station at any date."),
};

/**
 * The documented worst case: five days, administrative cause.
 * Everything the staleness classifier calls DARK is measured against
 * this, because it is the only total-outage duration this programme
 * has actually published.
 */
export const DARK_REFERENCE_EVENT = {
  station: "Bharati",
  from: "2013-10-07",
  to: "2013-10-12",
  hours: 120,
  cause: "administrative",
  cls: "A",
  source: OUTAGE_2013,
  note: "Power to the NRSC-run satellite ground station was cut during a dispute between the Station Leader and the ground-station team. HQ had no in-band signal that it had gone blind.",
};

/**
 * The measured normal dropout envelope at Bharati: 75 discrete
 * station-level data outages in 69 days, longest 6.6 h. An age inside
 * this is unremarkable; an age outside it is structural.
 */
export const MEASURED_DROPOUT = {
  outages: 75,
  overDays: 69,
  longestHours: 6.6,
  cls: "A",
  source: AWS,
};

/**
 * LIVE / LAGGING / DARK from the age of the last sync.
 *
 * LAGGING is bounded by the measured 6.6 h longest dropout rather than
 * by a round number, so the boundary means something. The LIVE bound
 * has no evidence behind it at all — the dossier says nothing about an
 * acceptable freshness for an operational feed — so it is a caller
 * parameter defaulting to one hour and is labelled S.
 */
export function classifyStaleness({ lastSyncAt, now, liveToleranceHours = 1 }) {
  if (lastSyncAt == null) {
    return {
      state: q(null, null, "B", null, "No sync record supplied."),
      ageHours: q(null, "h", "B", null, "No sync record supplied."),
    };
  }
  const age = hoursBetween(lastSyncAt, now);
  const state =
    age <= liveToleranceHours
      ? "LIVE"
      : age <= MEASURED_DROPOUT.longestHours
        ? "LAGGING"
        : "DARK";

  const note =
    state === "LIVE"
      ? `Inside the ${liveToleranceHours} h freshness bound. That bound is a demo parameter — the dossier states no acceptable freshness for any feed.`
      : state === "LAGGING"
        ? `Stale, but still inside the measured dropout envelope at Bharati (75 outages in 69 days, longest ${MEASURED_DROPOUT.longestHours} h). Normal, not alarming.`
        : `Past anything measured as a routine dropout. The documented worst case is the five-day total outage of 7-12 October 2013 at Bharati, cause administrative.`;

  return {
    state: q(state, null, state === "LIVE" ? "S" : "A", state === "DARK" ? OUTAGE_2013 : AWS, note),
    ageHours: q(round(age, 2), "h", "D", null, "Age of the last sync at the supplied `now`."),
    hqBehindBy: q(
      round(age, 1),
      "h",
      "D",
      OUTAGE_2013,
      "How far behind HQ's view is. In 2013 this number would have read 120 h and nobody at HQ could see it.",
    ),
    darkReference:
      state === "DARK"
        ? q(
            round(age / DARK_REFERENCE_EVENT.hours, 2),
            "x 2013 outage",
            "D",
            OUTAGE_2013,
            "Current outage as a fraction of the documented five-day event.",
          )
        : null,
  };
}

/**
 * Outbox drain under a byte budget, strictly T0 first. The budget is
 * always simulated: no committed throughput is published for either
 * station, so any byte figure here is a demo parameter chosen to make
 * the behaviour observable.
 */
export function outboxState(items = [], { byteBudget = null } = {}) {
  const byTier = SYNC_TIERS.map((t) => {
    const mine = items.filter((i) => i.tier === t.tier);
    return {
      ...t,
      count: mine.length,
      bytes: mine.reduce((n, i) => n + (i.bytes ?? 0), 0),
    };
  });

  let remaining = byteBudget;
  const drain = byTier.map((t) => {
    if (remaining == null) return { tier: t.tier, sends: null, bytes: t.bytes };
    const sends = Math.min(t.bytes, remaining);
    remaining -= sends;
    return { tier: t.tier, sends, bytes: t.bytes };
  });

  return {
    tiers: byTier,
    totalBytes: q(
      byTier.reduce((n, t) => n + t.bytes, 0),
      "bytes",
      "S",
      null,
      TIER_DESIGN_NOTE,
    ),
    budget: q(
      byteBudget,
      "bytes",
      "S",
      "domain-research-synthesis.md, Domain 5",
      "SIMULATED. Bandwidth specifications not publicly verified for Maitri or Bharati; the only defensible real figure is the Iridium fallback tier at 128-200 kbps.",
    ),
    drain,
    fullyDrained: remaining == null ? null : byTier.every((t, i) => drain[i].sends >= t.bytes),
  };
}

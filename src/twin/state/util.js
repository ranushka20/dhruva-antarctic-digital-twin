/* =========================================================
   STATE LAYER — shared plumbing

   The only thing every module in this folder agrees on: a number is
   never returned on its own. The twin's whole claim is that it knows
   which of its numbers are measured, which are modelled and which are
   invented, so the provenance class travels with the value instead of
   being reattached in the UI where it can be forgotten.

   Class vocabulary is evidence.js's, unchanged:
     A     directly citable public Bharati figure
     A-ext real and citable, but another station, an OEM or a standard
     B     documented to exist, no public feed — an integration boundary
     C     existence confirmed, details not public
     D     derived or modelled from verified anchors
     S     synthetic / demo, carries no claim about the station

   Every function here is pure. Nothing in this folder reads the clock;
   `now` is always a parameter, because a twin that cannot be replayed
   against a past timestamp cannot be tested.
========================================================= */

/** A quantity with its provenance attached. `unit` may be null for enums. */
export function q(value, unit, cls, source, note) {
  return { value, unit, cls, source, note };
}

/**
 * A value the station genuinely does not publish. Class B rather than a
 * zero or a guess, because an absent feed is a finding, not a reading.
 */
export function absent(unit, reason) {
  return { value: null, unit, cls: "B", source: null, note: reason };
}

/** Accepts a Date, an ISO string or epoch ms. All date maths here is UTC. */
export function toDate(value) {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

export function addDays(value, days) {
  return new Date(toDate(value).getTime() + days * 86400000);
}

export function daysBetween(from, to) {
  return (toDate(to).getTime() - toDate(from).getTime()) / 86400000;
}

export function hoursBetween(from, to) {
  return (toDate(to).getTime() - toDate(from).getTime()) / 3600000;
}

/** YYYY-MM-DD, UTC. Dates leave this folder as strings so they stay plain data. */
export function isoDate(value) {
  return toDate(value).toISOString().slice(0, 10);
}

/** Calendar date in UTC, month is 1-12 so the dossier's tables read literally. */
export function utcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function round(value, dp = 1) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

// OWNER: Dev B
// provenance — constructors for the Measurement atom.
//
// NFR-G3: every displayed value carries a provenance class. A missing class
// is a build failure, never a silent default to LIVE — so there is no
// "make a Measurement" helper here that lets you skip the class.
//
// Derivation rule (§7.1): a value computed from mixed-class inputs is MODELED
// and must list every parent with that parent's own class. `derived()` is the
// only sanctioned way to build one, and it requires the parents.

import type { Measurement, Provenance } from '@/shared/contracts';
import { ageSeconds } from '@/lib/time';

interface BaseOpts {
  timestamp?: string;
  confidence?: number;
}

/** A real external/public feed. */
export function live(
  value: number | string | null,
  unit: string,
  source: string,
  opts: BaseOpts = {}
): Measurement {
  const timestamp = opts.timestamp ?? new Date().toISOString();
  return {
    value, unit, timestamp, source,
    provenance: 'LIVE',
    confidence: opts.confidence,
    freshnessSeconds: ageSeconds(timestamp),
  };
}

/** Derived or replayed. `model` and `parents` are both mandatory. */
export function derived(
  value: number | string | null,
  unit: string,
  source: string,
  model: string,
  parents: { name: string; provenance: Provenance }[],
  opts: BaseOpts = {}
): Measurement {
  const timestamp = opts.timestamp ?? new Date().toISOString();
  return {
    value, unit, timestamp, source,
    provenance: 'MODELED',
    model,
    parents,
    confidence: opts.confidence,
    freshnessSeconds: ageSeconds(timestamp),
  };
}

/** Prototype placeholder. `awaiting` names the feed we do not yet have. */
export function synth(
  value: number | string | null,
  unit: string,
  awaiting: string,
  opts: BaseOpts & { source?: string } = {}
): Measurement {
  const timestamp = opts.timestamp ?? new Date().toISOString();
  return {
    value, unit, timestamp,
    source: opts.source ?? 'prototype placeholder',
    provenance: 'SYNTH',
    awaiting,
    confidence: opts.confidence,
    freshnessSeconds: ageSeconds(timestamp),
  };
}

/** Sandbox what-if output. Violet, and only ever on /sandbox. */
export function sim(
  value: number | string | null,
  unit: string,
  model: string,
  opts: BaseOpts = {}
): Measurement {
  const timestamp = opts.timestamp ?? new Date().toISOString();
  return {
    value, unit, timestamp,
    source: 'sandbox simulation',
    provenance: 'SIM',
    model,
    freshnessSeconds: 0,
    confidence: opts.confidence,
  };
}

/**
 * NFR-G6: malformed or missing data renders an em dash with an UNKNOWN badge.
 * Never 0, never blank. UNKNOWN is carried as a SYNTH measurement with a null
 * value — the badge component renders that pair as UNKNOWN.
 */
export function unknown(unit: string, reason: string): Measurement {
  return {
    value: null, unit,
    timestamp: new Date().toISOString(),
    source: reason,
    provenance: 'SYNTH',
    awaiting: reason,
    freshnessSeconds: 0,
  };
}

/** True when the badge should read UNKNOWN rather than its provenance class. */
export function isUnknown(m: Measurement | undefined | null): boolean {
  return !m || m.value === null || m.value === undefined || (typeof m.value === 'number' && !isFinite(m.value));
}

/** The class a derived value inherits from its inputs. Mixed input = MODELED. */
export function combineProvenance(parents: Provenance[]): Provenance {
  if (parents.length === 0) return 'SYNTH';
  if (parents.includes('SIM')) return 'SIM';
  if (parents.every((p) => p === 'LIVE')) return 'MODELED';
  return 'MODELED';
}

/** Display helper — numbers only, always rendered in the mono typeface. */
export function formatValue(m: Measurement | undefined | null, digits = 1): string {
  if (isUnknown(m)) return '—';
  const v = m!.value;
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(digits);
  }
  return String(v);
}

export function formatWithUnit(m: Measurement | undefined | null, digits = 1): string {
  if (isUnknown(m)) return '—';
  return formatValue(m, digits) + (m!.unit ? ' ' + m!.unit : '');
}

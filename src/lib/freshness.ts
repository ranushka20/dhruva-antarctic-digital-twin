// OWNER: Dev B
// freshness — the one place that turns an age in seconds into a sync state,
// using the thresholds exposed on /settings (never hard-coded here).
//
// The rule that matters most: a stale input must never produce a confident
// derived deadline (FRONTEND.md §7.2). `canDeriveDeadline` is what every LSOD
// call site checks before it renders a number instead of "stale".

import type { SyncState } from '@/shared/contracts';
import { syncThresholds } from '@/state/params';

export function freshnessState(ageInSeconds: number): SyncState {
  const { laggingAfterSeconds, darkAfterSeconds } = syncThresholds();
  if (ageInSeconds >= darkAfterSeconds) return 'DARK';
  if (ageInSeconds >= laggingAfterSeconds) return 'LAGGING';
  return 'LIVE';
}

/** LIVE inputs only. LAGGING and DARK both render "stale", not a number. */
export function canDeriveDeadline(state: SyncState): boolean {
  return state === 'LIVE';
}

/**
 * How far a stale row or surface is pushed back. §7.2 of FRONTEND.md
 * tabulates 0.62 / 0.40; those are DELIBERATELY not the values here.
 *
 * At 0.40 a `--text-3` label lands near 1.6:1 against the page — a DARK
 * station's rows stopped being readable rather than merely de-emphasised,
 * which is what made Maitri look broken next to Bharati. Legibility is not
 * the channel that should carry freshness, so the dim is now gentle and
 * SYNC_SATURATION carries the weight instead: draining the colour out of a
 * 31-hour-old reading says "do not trust this" without hiding it.
 *
 * Restore 0.62 / 0.40 here for the literal spec.
 */
export const SYNC_OPACITY: Record<SyncState, number> = {
  LIVE: 1,
  LAGGING: 0.9,
  DARK: 0.78,
};

/** Colour confidence, 1 = full, 0 = greyscale. Pairs with SYNC_OPACITY. */
export const SYNC_SATURATION: Record<SyncState, number> = {
  LIVE: 1,
  LAGGING: 0.6,
  DARK: 0.3,
};

/** `filter` value for a surface at this state, or undefined when LIVE. */
export function syncFilter(state: SyncState): string | undefined {
  const s = SYNC_SATURATION[state];
  return s < 1 ? `saturate(${s})` : undefined;
}

export const SYNC_LABEL: Record<SyncState, string> = {
  LIVE: 'LIVE',
  LAGGING: 'LAGGING',
  DARK: 'DARK',
};

/** Colour token per state. Never used alone — always paired with the label. */
export const SYNC_COLOR: Record<SyncState, string> = {
  LIVE: 'var(--ok)',
  LAGGING: 'var(--watch)',
  DARK: 'var(--unknown)',
};

/** The worst state across a set — used for cross-station summary chips. */
export function worstSyncState(states: SyncState[]): SyncState {
  if (states.includes('DARK')) return 'DARK';
  if (states.includes('LAGGING')) return 'LAGGING';
  return 'LIVE';
}

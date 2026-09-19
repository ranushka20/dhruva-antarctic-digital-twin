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

export const SYNC_OPACITY: Record<SyncState, number> = {
  LIVE: 1,
  LAGGING: 0.62,
  DARK: 0.4,
};

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

// OWNER: Dev B
// risk — the colour a deadline wears.
//
// One implementation, shared by every surface that shows an LSOD, and the
// thresholds come from /settings rather than being hard-coded at each call
// site (NFR-B1). Two pages disagreeing about what counts as urgent would be
// the same class of bug as two pages computing autonomy two ways.

import { getParamValue } from '@/state/params';

export function lsodColor(lsodDays: number | null): string {
  if (lsodDays === null) return 'var(--text-3)';
  if (lsodDays <= getParamValue<number>('logistics.lsodWarningDays')) return 'var(--act-soft)';
  if (lsodDays <= getParamValue<number>('logistics.lsodWatchDays')) return 'var(--watch-soft)';
  return 'var(--text-2)';
}

/** Word form, for the cases where colour alone would not carry the meaning. */
export function lsodUrgency(lsodDays: number | null): 'unknown' | 'warning' | 'watch' | 'ok' {
  if (lsodDays === null) return 'unknown';
  if (lsodDays <= getParamValue<number>('logistics.lsodWarningDays')) return 'warning';
  if (lsodDays <= getParamValue<number>('logistics.lsodWatchDays')) return 'watch';
  return 'ok';
}

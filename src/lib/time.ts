// OWNER: Dev B
// Time helpers. Every displayed time is IST (NFR-G7). Ages are computed from
// station-stamped timestamps, and clock skew is surfaced rather than hidden.

const IST_OFFSET_MINUTES = 330; // UTC+05:30

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function toIST(d: Date): Date {
  return new Date(d.getTime() + (IST_OFFSET_MINUTES + d.getTimezoneOffset()) * 60_000);
}

/** "19 SEP 2026 · 14:22 IST" — the HQ clock format (FR-2.3). */
export function formatClockIST(date: Date = new Date()): string {
  const d = toIST(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm} IST`;
}

/** "19 SEP · 14:22" — compact form for table cells and timelines. */
export function formatShortIST(iso: string | Date): string {
  const d = toIST(new Date(iso));
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} · ${hh}:${mm}`;
}

/** "19 SEP 2026" — date only. */
export function formatDateIST(iso: string | Date): string {
  const d = toIST(new Date(iso));
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Compact duration: 45s / 12m / 4h 12m / 31h 40m / 6d 3h. */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '—';
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 48) return remM ? `${h}h ${remM}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return remH ? `${d}d ${remH}h` : `${d}d`;
}

/** "4h 12m ago" */
export function formatAge(seconds: number): string {
  return `${formatDuration(seconds)} ago`;
}

export function ageSeconds(iso: string, now: number = Date.now()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.round((now - t) / 1000));
}

export function daysFromNow(iso: string, now: number = Date.now()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return (t - now) / 86_400_000;
}

export function addDays(iso: string | Date, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

/** Signed day count rendered with an explicit sign, e.g. "+12 d" / "−3 d". */
export function signedDays(days: number): string {
  const r = Math.round(days);
  return `${r < 0 ? '−' : '+'}${Math.abs(r)} d`;
}

/**
 * Clock skew between the station-stamped time and this client's clock
 * (NFR-6.5). Surfaced on /comms and /station rather than silently corrected.
 */
export function clockSkewSeconds(stationStampedIso: string, hqReceiptIso: string): number {
  return Math.round((new Date(hqReceiptIso).getTime() - new Date(stationStampedIso).getTime()) / 1000);
}

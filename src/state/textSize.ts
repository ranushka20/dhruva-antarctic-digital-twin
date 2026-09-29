// Text size preference — a per-viewer reading-comfort setting.
// Every type-scale step and every spacing utility is in rem, so scaling the
// root font size enlarges text AND the space around it together, the way
// browser zoom does, without anyone reaching for Cmd +.
// Stored in localStorage: it is a convenience for this browser only, and a
// missing/blocked store simply falls back to Standard.

import { useSyncExternalStore } from 'react';

export type TextSize = 'standard' | 'large' | 'xlarge';

export const TEXT_SIZES: { id: TextSize; label: string; scale: string }[] = [
  { id: 'standard', label: 'Standard', scale: '100%' },
  { id: 'large', label: 'Large', scale: '112.5%' },
  { id: 'xlarge', label: 'Larger', scale: '125%' },
];

const KEY = 'dhruva:text-size';
const listeners = new Set<() => void>();

function isTextSize(v: unknown): v is TextSize {
  return TEXT_SIZES.some((s) => s.id === v);
}

export function readTextSize(): TextSize {
  try {
    const v = localStorage.getItem(KEY);
    if (isTextSize(v)) return v;
  } catch {
    /* private window / blocked storage */
  }
  return 'standard';
}

export function applyTextSize(size: TextSize) {
  const entry = TEXT_SIZES.find((s) => s.id === size) ?? TEXT_SIZES[0];
  document.documentElement.style.fontSize = entry.scale;
  document.documentElement.dataset.textSize = entry.id;
}

export function setTextSize(size: TextSize) {
  try {
    localStorage.setItem(KEY, size);
  } catch {
    /* still apply for this session */
  }
  applyTextSize(size);
  listeners.forEach((l) => l());
}

export function useTextSize(): TextSize {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (document.documentElement.dataset.textSize as TextSize) ?? 'standard',
  );
}

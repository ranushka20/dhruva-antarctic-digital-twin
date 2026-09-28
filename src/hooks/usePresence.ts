// usePresence — keeps an overlay mounted for `exitMs` after `open` turns
// false, so it can play its exit transition instead of vanishing.
// Pair with the `data-state` exit rules in styles/motion.css.

import { useEffect, useState } from 'react';

export type PresenceState = 'open' | 'closed';

export function usePresence(open: boolean, exitMs = 160): { mounted: boolean; state: PresenceState } {
  const [mounted, setMounted] = useState(open);

  // Mount synchronously on open — adjusting state during render is the
  // React-sanctioned way to derive it from a prop, and it avoids a frame
  // where the overlay is open but not yet in the DOM.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open || !mounted) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => setMounted(false), reduced ? 0 : exitMs);
    return () => window.clearTimeout(id);
  }, [open, mounted, exitMs]);

  return { mounted, state: open ? 'open' : 'closed' };
}

/**
 * While an overlay plays its exit, its parent has usually already cleared the
 * data it was showing (`open={!!record}` → record is null). This holds the
 * last value seen while open, so the panel slides out with its content.
 */
export function useLastWhileOpen<T>(open: boolean, value: T): T {
  const [last, setLast] = useState(value);
  if (open && value !== last) setLast(value);
  return open ? value : last;
}

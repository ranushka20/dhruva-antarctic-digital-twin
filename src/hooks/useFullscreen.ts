// useFullscreen — puts one element into the browser's full-screen mode.
// Esc and the browser's own controls can end it too, so `active` follows the
// `fullscreenchange` event rather than the last toggle.

import { useCallback, useEffect, useState, type RefObject } from 'react';

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  // False on iPhone Safari, which only lets <video> go full screen.
  const supported = typeof document !== 'undefined' && document.fullscreenEnabled;

  useEffect(() => {
    const sync = () => setActive(!!ref.current && document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [ref]);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else ref.current?.requestFullscreen().catch(() => {});
  }, [ref]);

  return { supported, active, toggle };
}

// OWNER: Dev B
// ActiveIndicator — the pill that slides behind the active segment of a tab
// bar or segmented control. Drop it inside a `relative isolate` container
// whose direct children carry aria-selected / aria-pressed / aria-current;
// it finds the active one itself, so call sites keep their own buttons.
//
// Position is written straight to the element's style (no React state), so
// a tab change costs one transform write, not a re-render.

import { useLayoutEffect, useRef, type CSSProperties } from 'react';

const ACTIVE =
  ':scope > [aria-selected="true"], :scope > [aria-pressed="true"], :scope > [aria-current="page"]';

interface ActiveIndicatorProps {
  className?: string;
  style?: CSSProperties;
}

export function ActiveIndicator({ className = '', style }: ActiveIndicatorProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const place = () => {
      const active = parent.querySelector<HTMLElement>(ACTIVE);
      if (!active) {
        el.style.opacity = '0';
        return;
      }
      el.style.width = active.offsetWidth + 'px';
      el.style.height = active.offsetHeight + 'px';
      el.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
      el.style.opacity = '1';
    };

    place();
    // Transitions switch on only after the first placement has painted.
    const raf = requestAnimationFrame(() => el.setAttribute('data-ready', ''));

    const resize = new ResizeObserver(place);
    resize.observe(parent);
    const mutations = new MutationObserver(place);
    mutations.observe(parent, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-selected', 'aria-pressed', 'aria-current'],
    });

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      mutations.disconnect();
    };
  }, []);

  return <span ref={ref} aria-hidden className={`m-indicator ${className}`} style={style} />;
}

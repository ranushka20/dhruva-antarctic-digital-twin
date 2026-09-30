// OWNER: Dev B
// ProvenanceBadge — the trust primitive (FRONTEND.md §7.1).
//
// Four classes, one per value, no exceptions. The badge sits adjacent to its
// value, never in a corner legend, and the hover card explains where the
// number came from — including every parent of a derived value, with that
// parent's own class. Silently blending a LIVE input with a SYNTH input into
// an unlabelled number is a spec violation, so MODELED without parents
// renders a visible warning rather than passing quietly.
//
// The hover card is portalled to <body> with fixed positioning. Rendered in
// place, it was clipped by any scrolling ancestor — the twin's zone inspector
// and the Action Centre drawer are both overflow-y-auto, which clips the x
// axis too — so the card's far side was cut off. It is placed from the
// badge's own rectangle, kept inside the viewport, and flips above the badge
// when there is no room below.

import { createPortal } from 'react-dom';
import { useCallback, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Measurement, Provenance } from '@/shared/contracts';
import { isUnknown } from '@/lib/provenance';
import { formatShortIST, formatDuration } from '@/lib/time';

type BadgeClass = Provenance | 'UNKNOWN';

interface ProvenanceBadgeProps {
  measurement: Measurement;
  /** What the value IS — shown as the hover card's second line. */
  label?: string;
  /**
   * Three-letter face for tiles too narrow to hold the full word — MODELED
   * alone is wider than a third of the Overview right rail, and a badge that
   * overflows its card is worse than an abbreviated one. The full class name
   * still reaches the screen reader and the hover card, so nothing is lost.
   */
  abbreviated?: boolean;
  /** Which edge the hover card hangs from. 'right' keeps it inside a narrow rail. */
  align?: 'left' | 'right';
  className?: string;
}

const BADGE_STYLES: Record<BadgeClass, { bg: string; border: string; text: string; long: string }> = {
  LIVE: {
    bg: 'rgba(79,174,133,0.12)',
    border: '1px solid var(--ok)',
    text: 'var(--ok-soft)',
    long: 'LIVE — real external feed',
  },
  MODELED: {
    bg: 'rgba(139,154,148,0.12)',
    border: '1px solid var(--unknown)',
    text: 'var(--text-2)',
    long: 'MODELED — derived from documented real information',
  },
  SYNTH: {
    bg: 'transparent',
    border: '1px dashed var(--unknown)',
    text: 'var(--text-3)',
    long: 'SYNTHETIC — prototype placeholder',
  },
  SIM: {
    bg: 'rgba(155,132,196,0.12)',
    border: '1px solid var(--sim)',
    text: 'var(--sim-soft)',
    long: 'SIM — sandbox what-if output',
  },
  UNKNOWN: {
    bg: 'transparent',
    border: '1px dashed var(--line-strong)',
    text: 'var(--text-3)',
    long: 'UNKNOWN — no value reported',
  },
};

const SHORT_FACE: Record<BadgeClass, string> = {
  LIVE: 'LIVE', MODELED: 'MDL', SYNTH: 'SYN', SIM: 'SIM', UNKNOWN: 'UNK',
};

export function badgeClassOf(measurement: Measurement): BadgeClass {
  if (isUnknown(measurement)) return 'UNKNOWN';
  return measurement.provenance;
}

export function ProvenanceBadge({
  measurement, label, abbreviated = false, align = 'left', className = '',
}: ProvenanceBadgeProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLSpanElement>(null);
  const id = useId();
  const cls = badgeClassOf(measurement);
  const style = BADGE_STYLES[cls];

  const place = useCallback(() => {
    const button = buttonRef.current;
    const card = cardRef.current;
    if (!button || !card) return;
    const anchor = button.getBoundingClientRect();
    const { width, height } = card.getBoundingClientRect();
    const EDGE = 8;
    const GAP = 6;
    const maxLeft = Math.max(EDGE, window.innerWidth - width - EDGE);
    const left = Math.min(Math.max(EDGE, align === 'right' ? anchor.right - width : anchor.left), maxLeft);
    const below = anchor.bottom + GAP;
    const above = anchor.top - GAP - height;
    const fitsBelow = below + height <= window.innerHeight - EDGE;
    const top = fitsBelow || above < EDGE
      ? Math.max(EDGE, Math.min(below, window.innerHeight - height - EDGE))
      : above;
    setPos({ top, left });
  }, [align]);

  // Layout effect, so the card is measured and placed before it paints —
  // it never flashes at a stale spot. Scroll is captured so scrolling any
  // ancestor (not just the window) keeps the card on its badge.
  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const cardStyle: CSSProperties = {
    backgroundColor: 'var(--panel-alt)',
    border: '1px solid var(--line-strong)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    borderRadius: 'var(--r-inner)',
  };

  const missingParents = measurement.provenance === 'MODELED' && !measurement.parents?.length;

  return (
    <span className={'relative inline-flex ' + className}>
      <button
        ref={buttonRef}
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label={'Provenance: ' + style.long}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className={
          'inline-flex items-center font-mono text-micro tracking-[0.06em] py-0.5 rounded cursor-help '
          + (abbreviated ? 'px-1' : 'px-1.5')
        }
        style={{ backgroundColor: style.bg, border: style.border, color: style.text }}
      >
        {abbreviated ? SHORT_FACE[cls] : cls}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <span
          id={id}
          ref={cardRef}
          role="tooltip"
          // z-[60] clears the drawer and modal layers (z-50).
          className="fixed z-[60] block w-80 max-w-[calc(100vw-16px)] p-3.5"
          style={{
            ...cardStyle,
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            visibility: pos ? 'visible' : 'hidden',
          }}
        >
          <span
            className="block font-mono text-micro uppercase tracking-label pb-1.5 mb-1.5"
            style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--line)' }}
          >
            Provenance
          </span>

          <span className="block text-body-sm mb-1" style={{ color: style.text, fontFamily: 'var(--font-body)' }}>
            {style.long}
          </span>

          {label && (
            <span className="block text-body-sm mb-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
              {label}
            </span>
          )}

          {measurement.awaiting && (
            <span className="block font-mono text-caption mb-1" style={{ color: 'var(--text-3)' }}>
              awaiting: {measurement.awaiting}
            </span>
          )}

          {measurement.model && (
            <span className="block font-mono text-caption mb-1" style={{ color: 'var(--text-3)' }}>
              model: {measurement.model}
            </span>
          )}

          {measurement.parents?.map((p) => (
            <span key={p.name} className="block font-mono text-caption mb-1" style={{ color: 'var(--text-3)' }}>
              parent: {p.name} ({p.provenance})
            </span>
          ))}

          {missingParents && (
            <span className="block font-mono text-caption mb-1" style={{ color: 'var(--act-soft)' }}>
              derived value with no declared parents — report this
            </span>
          )}

          {measurement.confidence !== undefined && (
            <span className="block font-mono text-caption mb-1" style={{ color: 'var(--text-3)' }}>
              confidence: {(measurement.confidence * 100).toFixed(0)}%
            </span>
          )}

          <span
            className="block text-caption pt-2 mt-2"
            style={{ color: 'var(--text-3)', borderTop: '1px solid var(--line)' }}
          >
            {measurement.source} · {formatShortIST(measurement.timestamp)} IST ·{' '}
            {formatDuration(measurement.freshnessSeconds)} old
          </span>
        </span>,
        document.body,
      )}
    </span>
  );
}

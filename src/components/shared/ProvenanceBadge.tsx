// OWNER: Dev B
// ProvenanceBadge — the trust primitive (FRONTEND.md §7.1).
//
// Four classes, one per value, no exceptions. The badge sits adjacent to its
// value, never in a corner legend, and the hover card explains where the
// number came from — including every parent of a derived value, with that
// parent's own class. Silently blending a LIVE input with a SYNTH input into
// an unlabelled number is a spec violation, so MODELED without parents
// renders a visible warning rather than passing quietly.

import { useId, useState, type CSSProperties } from 'react';
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
  const id = useId();
  const cls = badgeClassOf(measurement);
  const style = BADGE_STYLES[cls];

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
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label={'Provenance: ' + style.long}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className={
          'inline-flex items-center font-mono text-[8.5px] tracking-[0.06em] py-0.5 rounded cursor-help '
          + (abbreviated ? 'px-1' : 'px-1.5')
        }
        style={{ backgroundColor: style.bg, border: style.border, color: style.text }}
      >
        {abbreviated ? SHORT_FACE[cls] : cls}
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          className={'absolute top-full mt-1 z-50 block w-64 p-2.5 ' + (align === 'right' ? 'right-0' : 'left-0')}
          style={cardStyle}
        >
          <span
            className="block font-mono text-[8.5px] uppercase tracking-[0.12em] pb-1.5 mb-1.5"
            style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--line)' }}
          >
            Provenance
          </span>

          <span className="block text-[11px] mb-1" style={{ color: style.text, fontFamily: 'var(--font-body)' }}>
            {style.long}
          </span>

          {label && (
            <span className="block text-[11px] mb-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
              {label}
            </span>
          )}

          {measurement.awaiting && (
            <span className="block font-mono text-[9.5px] mb-0.5" style={{ color: 'var(--text-3)' }}>
              awaiting: {measurement.awaiting}
            </span>
          )}

          {measurement.model && (
            <span className="block font-mono text-[9.5px] mb-0.5" style={{ color: 'var(--text-3)' }}>
              model: {measurement.model}
            </span>
          )}

          {measurement.parents?.map((p) => (
            <span key={p.name} className="block font-mono text-[9.5px] mb-0.5" style={{ color: 'var(--text-3)' }}>
              parent: {p.name} ({p.provenance})
            </span>
          ))}

          {missingParents && (
            <span className="block font-mono text-[9.5px] mb-0.5" style={{ color: 'var(--act-soft)' }}>
              derived value with no declared parents — report this
            </span>
          )}

          {measurement.confidence !== undefined && (
            <span className="block font-mono text-[9.5px] mb-0.5" style={{ color: 'var(--text-3)' }}>
              confidence: {(measurement.confidence * 100).toFixed(0)}%
            </span>
          )}

          <span
            className="block font-mono text-[9px] pt-1.5 mt-1.5"
            style={{ color: 'var(--text-4)', borderTop: '1px solid var(--line)' }}
          >
            {measurement.source} · {formatShortIST(measurement.timestamp)} IST ·{' '}
            {formatDuration(measurement.freshnessSeconds)} old
          </span>
        </span>
      )}
    </span>
  );
}

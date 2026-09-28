// OWNER: Dev B
// DegradableSurface — the freshness primitive (FRONTEND.md §7.2).
//
// A stale panel must LOOK stale without becoming unreadable. Three things
// carry that message here, and only the first is opacity:
//
//   1. a small dim, enough to push the surface behind a live one;
//   2. desaturation — this design system makes colour mean something, so a
//      mint "nominal" dot read 31 hours ago should not be presented in the
//      same confident mint as one read 4 minutes ago. Draining the colour is
//      the honest signal, and unlike opacity it costs no legibility;
//   3. a dashed ring and a diagonal hatch over the surface.
//
// DEPARTURE FROM SPEC, DELIBERATE. §7.2 tabulates 62% / 40% opacity. Applied
// to a whole panel those numbers drop --text-3 body copy to roughly 1.6:1
// against the page — below any readable threshold, and the reason Maitri's
// zone grid was unreadable while Bharati's was fine. The corrected values
// live in lib/freshness (SYNC_OPACITY / SYNC_SATURATION), shared with the
// table rows so one sync state degrades identically everywhere.

import { type SyncState } from '@/shared/contracts';
import { type CSSProperties, type ReactNode } from 'react';
import { SYNC_OPACITY, syncFilter } from '@/lib/freshness';

interface DegradableSurfaceProps {
  syncState: SyncState;
  children: ReactNode;
  /** Shown in the banner after the state, e.g. "31h". */
  ageLabel?: string;
  /**
   * Border radius of the wrapped surface, so the hatch and the dashed ring
   * trace its actual outline. The zones panel is the light-cone shape, not a
   * plain card, and a square ring around it reads as a rendering fault.
   */
  surfaceRadius?: string;
  className?: string;
}

// The dim and the desaturation come from lib/freshness so a surface and a
// table row at the same sync state degrade by exactly the same amount.
const NOTE: Record<SyncState, string | undefined> = {
  LIVE: undefined,
  LAGGING: 'View may be stale — last sync',
  DARK: 'Station link down — last known state',
};

/** Low-alpha diagonal hatch: "there is a gap between this and now". */
const HATCH =
  'repeating-linear-gradient(135deg, rgba(139,154,148,0.07) 0 6px, rgba(139,154,148,0) 6px 13px)';

export function DegradableSurface({
  syncState, children, ageLabel, surfaceRadius = 'var(--r-card)', className = '',
}: DegradableSurfaceProps) {
  const degraded = syncState !== 'LIVE';
  const note = NOTE[syncState];

  return (
    // Step every muted text token up one rung inside a degraded surface. The
    // dim then pulls it back down to roughly where the token sits at full
    // opacity, so the panel reads as faded without its smallest labels
    // falling through the contrast floor, and nothing downstream has to know
    // it is being degraded.
    //
    // The two re-points sit on DIFFERENT elements on purpose: a custom
    // property is substituted where it is declared, so `--text-4:
    // var(--text-3)` alongside `--text-3: var(--text-2)` would read the
    // already-overridden --text-3 and collapse both rungs onto one colour.
    // Declaring --text-4 out here reads the root value first.
    <div
      className={`relative flex flex-col ${className}`}
      style={degraded ? ({ '--text-4': 'var(--text-3)' } as CSSProperties) : undefined}
    >
      <div
        className="relative"
        style={{
          opacity: SYNC_OPACITY[syncState],
          filter: syncFilter(syncState),
          transition: 'opacity 300ms ease, filter 300ms ease',
          ...(degraded ? ({ '--text-3': 'var(--text-2)' } as CSSProperties) : null),
        }}
      >
        {children}

        {degraded && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: HATCH,
              border: '1px dashed var(--line-strong)',
              borderRadius: surfaceRadius,
            }}
          />
        )}
      </div>

      {/* Outside the dimmed layer and in normal flow: the one line that
          EXPLAINS the degradation must never itself be degraded, and it must
          not sit on top of the data it is describing. It used to be absolutely
          positioned inside the faded wrapper, so it covered the bottom row of
          zone cells and was the hardest thing on the panel to read. */}
      {note && (
        <p
          role="status"
          className="flex items-center justify-center gap-1.5 mt-1.5 px-2 py-1 font-mono text-micro uppercase tracking-label"
          style={{
            backgroundColor: syncState === 'DARK' ? 'rgba(139,154,148,0.10)' : 'rgba(217,164,65,0.10)',
            border: `1px dashed ${syncState === 'DARK' ? 'var(--unknown)' : 'var(--watch)'}`,
            borderRadius: 'var(--r-inner)',
            color: syncState === 'DARK' ? 'var(--text-2)' : 'var(--watch-soft)',
          }}
        >
          {note}
          {ageLabel ? ` ${ageLabel} ago` : ''}
        </p>
      )}
    </div>
  );
}

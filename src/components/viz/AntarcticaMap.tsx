// OWNER: Dev B
// AntarcticaMap — inline SVG only (FR-5.1). No tile server, no Leaflet, no
// Mapbox: this is a stylised south-polar index to two stations, not a
// geographic product, and pretending otherwise would cost 300 KB for nothing.
//
// The continent is generated from a radius profile sampled every 10° and
// smoothed, so the Weddell and Ross embayments and the Peninsula are where a
// viewer expects them without shipping a coastline dataset.

import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { SyncState } from '@/shared/contracts';
import type { StationId } from '@/state/connectivity';
import { formatDuration } from '@/lib/time';
import { useTextSize, TEXT_SIZES } from '@/state/textSize';

const VIEW_W = 1000;
const VIEW_H = 620;
const CX = 500;

/** Station chip size in CSS px — it is counter-scaled, so this is what the reader sees. */
// Chip box at the Standard text size. Scaled by the root font size below, so
// the rem-sized text inside never outgrows its foreignObject at Large/Larger.
const CHIP_W_PX = 250;
const CHIP_H_PX = 62;

const LINK_WORD: Record<string, string> = { LIVE: 'Live', LAGGING: 'Delayed', DARK: 'Offline' };

/**
 * viewBox units per CSS pixel. The map is drawn at 1000 units but usually
 * rendered ~500px wide, so anything sized in viewBox units — text, the HTML
 * chips — would come out at half size. Labels multiply by this to stay at
 * their real type-scale size whatever the panel width.
 */
function useViewBoxUnit(ref: RefObject<SVGSVGElement | null>) {
  const [unit, setUnit] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setUnit(Math.max(VIEW_W / width, VIEW_H / height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return unit;
}
const CY = 300;

/** Radius (in px) every 10° clockwise from grid north. */
const RADIUS_PROFILE = [
  208, 214, 220, 224, 226, 224, 220, 214, 206, 198, 190, 186,
  188, 196, 206, 214, 220, 222, 220, 214, 204, 190, 174, 162,
  158, 164, 176, 190, 202, 210, 214, 214, 212, 210, 208, 207,
];

function polar(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + Math.cos(rad) * radius * 1.32, CY + Math.sin(rad) * radius * 0.92];
}

/** Closed Catmull-Rom spline through the sampled coastline points. */
function coastlinePath(): string {
  const pts = RADIUS_PROFILE.map((r, i) => polar(i * 10, r));
  const n = pts.length;
  const at = (i: number) => pts[((i % n) + n) % n];
  let d = `M ${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}

/** The Antarctic Peninsula, reaching towards South America (lower left). */
const PENINSULA =
  'M 230 392 C 196 424, 166 456, 150 486 C 144 498, 154 508, 166 500 ' +
  'C 196 478, 232 446, 262 420 Z';

export interface MapStation {
  id: StationId;
  code: string;
  name: string;
  x: number;              // 0–1 across the viewBox
  y: number;              // 0–1 down the viewBox
  syncState: SyncState;
  ageSeconds: number;
  warnings: number;
  /** Worst active state — drives marker colour (FR-5.3). */
  tone: 'ok' | 'watch' | 'act';
}

const TONE_COLOR = { ok: 'var(--ok)', watch: 'var(--watch)', act: 'var(--act)' } as const;
const SYNC_COLOR: Record<SyncState, string> = {
  LIVE: 'var(--ok)', LAGGING: 'var(--watch)', DARK: 'var(--unknown)',
};

interface AntarcticaMapProps {
  stations: MapStation[];
  primaryId: StationId;
  onSelect: (id: StationId) => void;
  /**
   * Open that station's 3D twin. Bound to double-click on the marker and on
   * the chip, and to the explicit "3D" button on the chip — double-click
   * alone is undiscoverable and unreachable from a keyboard, so it is the
   * shortcut, never the only way in.
   */
  onOpenTwin?: (id: StationId) => void;
  className?: string;
}

export function AntarcticaMap({
  stations, primaryId, onSelect, onOpenTwin, className = '',
}: AntarcticaMapProps) {
  const coast = useMemo(coastlinePath, []);
  const hq = { x: 892, y: 84 };
  const svgRef = useRef<SVGSVGElement>(null);
  const u = useViewBoxUnit(svgRef);
  // Root font scale from the Text size setting (1, 1.125, 1.25).
  const textSize = useTextSize();
  const textScale = parseFloat(TEXT_SIZES.find((t) => t.id === textSize)?.scale ?? '100') / 100;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={'w-full h-full ' + className}
      role="img"
      aria-label="Antarctica with Bharati and Maitri station markers and their links to NCPOR Goa"
    >
      <defs>
        <radialGradient id="map-glow" cx="50%" cy="46%" r="58%">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.16" />
          <stop offset="55%" stopColor="var(--glow)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ice-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--panel-raised)" />
          <stop offset="100%" stopColor="var(--panel-deep)" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#map-glow)" />

      {/* Three concentric ellipses — latitude rings, not decoration */}
      {[1, 0.68, 0.36].map((scale, i) => (
        <ellipse
          key={scale}
          cx={CX}
          cy={CY}
          rx={264 * scale}
          ry={186 * scale}
          fill="none"
          stroke="var(--grid-line)"
          strokeWidth={1}
          strokeDasharray={i === 0 ? undefined : '3 5'}
        />
      ))}

      {/* Graticule — meridians every 30° */}
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = polar(i * 30, 300);
        return (
          <line
            key={i}
            x1={CX} y1={CY} x2={x} y2={y}
            stroke="var(--grid-line)"
            strokeWidth={0.8}
            strokeDasharray="2 6"
          />
        );
      })}

      {/* Continent */}
      <path d={coast} fill="url(#ice-fill)" stroke="var(--line-strong)" strokeWidth={1.2} />
      <path d={PENINSULA} fill="url(#ice-fill)" stroke="var(--line-strong)" strokeWidth={1.2} />

      {/* NCPOR Goa node, off-continent */}
      <g>
        <circle cx={hq.x} cy={hq.y} r={5} fill="var(--text-2)" />
        <circle cx={hq.x} cy={hq.y} r={11} fill="none" stroke="var(--line-strong)" strokeWidth={1} />
        <text
          x={hq.x} y={hq.y - 20}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={11 * u}
          letterSpacing={0.66 * u}
          fill="var(--text-3)"
        >
          NCPOR GOA
        </text>
      </g>

      {stations.map((s) => {
        const sx = s.x * VIEW_W;
        const sy = s.y * VIEW_H;
        const linkColor = SYNC_COLOR[s.syncState];
        const dark = s.syncState === 'DARK';
        const isPrimary = s.id === primaryId;

        // Chip placement: keep both chips inside the frame at any width.
        const chipW = CHIP_W_PX * textScale * u;
        const chipH = CHIP_H_PX * textScale * u;
        const chipLeft = Math.max(4, sx + 26 + chipW > VIEW_W ? sx - 26 - chipW : sx + 26);
        const chipTop = Math.min(VIEW_H - chipH - 4, Math.max(4, sy - chipH / 2));

        return (
          <g key={s.id}>
            {/* Link path to HQ (FR-5.4) */}
            <path
              d={`M ${sx} ${sy} Q ${(sx + hq.x) / 2} ${Math.min(sy, hq.y) - 70}, ${hq.x} ${hq.y}`}
              fill="none"
              stroke={linkColor}
              strokeWidth={1.4}
              strokeDasharray="6 7"
              opacity={dark ? 0.25 : 0.75}
            />

            {/* Marker: coloured core in a low-alpha halo, ringed with the panel */}
            <circle cx={sx} cy={sy} r={17} fill={TONE_COLOR[s.tone]} opacity={0.16} />
            <circle cx={sx} cy={sy} r={10} fill="var(--panel-deep)" />
            <circle cx={sx} cy={sy} r={6.5} fill={TONE_COLOR[s.tone]} />
            {isPrimary && (
              <circle
                cx={sx} cy={sy} r={21}
                fill="none" stroke="var(--text)" strokeWidth={1.4} strokeDasharray="7 6"
              />
            )}

            {/* Floating chip (FR-5.5) — dashed border when LAGGING or DARK */}
            <foreignObject x={chipLeft} y={chipTop} width={chipW} height={chipH}>
              <div
                style={{ width: CHIP_W_PX * textScale, transform: `scale(${u})`, transformOrigin: '0 0' }}
              >
              <div
                onDoubleClick={() => onOpenTwin?.(s.id)}
                className="flex items-center gap-2 px-3 py-2"
                style={{
                  backgroundColor: 'var(--panel-alt)',
                  border: `1px ${s.syncState === 'LIVE' ? 'solid' : 'dashed'} var(--line-strong)`,
                  borderRadius: 'var(--r-inner)',
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="flex-1 min-w-0 text-left"
                  title={`Make ${s.name} primary — double-click to open its 3D twin`}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{ width: 6, height: 6, backgroundColor: TONE_COLOR[s.tone] }}
                    />
                    <span className="text-body font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                      {s.name}
                    </span>
                    <span className="font-mono text-micro ml-auto" style={{ color: 'var(--text-3)' }}>
                      {s.code}
                    </span>
                  </span>
                  <span className="flex items-center gap-2.5 mt-1 text-caption whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                    <span title={`Link state: ${s.syncState}`}>{LINK_WORD[s.syncState] ?? s.syncState}</span>
                    <span><span className="font-mono">{formatDuration(s.ageSeconds)}</span> ago</span>
                    <span style={{ color: s.warnings > 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
                      <span className="font-mono">{s.warnings}</span> warning{s.warnings === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>

                {onOpenTwin && (
                  <button
                    type="button"
                    onClick={() => onOpenTwin(s.id)}
                    className="shrink-0 px-2 py-1 rounded-full text-caption font-semibold"
                    style={{ backgroundColor: 'var(--text)', color: 'var(--bg)', fontFamily: 'var(--font-body)' }}
                    aria-label={`Open the ${s.name} 3D twin`}
                    title={`Open the ${s.name} 3D twin`}
                  >
                    3D
                  </button>
                )}
              </div>
              </div>
            </foreignObject>

            {/* Invisible hit target on the marker itself. Single click selects,
                double click opens the twin — the same gesture pair as the chip. */}
            <circle
              cx={sx} cy={sy} r={22}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(s.id)}
              onDoubleClick={() => onOpenTwin?.(s.id)}
            >
              <title>{`${s.name} — click to select, double-click to open the 3D twin`}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

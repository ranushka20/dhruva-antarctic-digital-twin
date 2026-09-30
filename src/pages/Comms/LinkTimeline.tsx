// OWNER: Dev B
// Link timeline strip — a horizontal 24 h / 7 d band, each interval coloured
// by link state, so the gaps are obvious at a glance (FR-1.2). State is
// never carried by colour alone: every segment is labelled in its tooltip
// and the legend spells out the mapping.

import type { SyncState } from '@/shared/contracts';
import type { LinkSegment } from '@/state/connectivity';
import { formatDuration, formatShortIST } from '@/lib/time';

const SEGMENT_COLOR: Record<SyncState, string> = {
  LIVE: 'var(--ok)',
  LAGGING: 'var(--watch)',
  DARK: 'var(--unknown)',
};

interface Props {
  segments: LinkSegment[];
  windowHours: number;
  now?: number;
}

export function LinkTimeline({ segments, windowHours, now = Date.now() }: Props) {
  const windowStart = now - windowHours * 3600_000;
  const span = now - windowStart;

  return (
    <div>
      <div
        className="relative w-full overflow-hidden flex"
        style={{ height: 26, backgroundColor: 'var(--track)', borderRadius: 'var(--r-pill)' }}
        role="img"
        aria-label={`Link state over the last ${windowHours} hours`}
      >
        {segments.length === 0 && (
          <span className="m-auto text-body-sm" style={{ color: 'var(--text-3)' }}>
            No link history in this window
          </span>
        )}
        {segments.map((segment, i) => {
          const left = ((segment.fromMs - windowStart) / span) * 100;
          const width = ((segment.toMs - segment.fromMs) / span) * 100;
          const isDark = segment.state === 'DARK';
          return (
            <span
              key={i}
              title={`${segment.state} · ${formatShortIST(new Date(segment.fromMs).toISOString())} → ${formatShortIST(new Date(segment.toMs).toISOString())} · ${formatDuration(segment.durationSeconds)}${segment.cause ? ' · ' + segment.cause : ''}`}
              className="absolute top-0 bottom-0"
              style={{
                left: left + '%',
                width: Math.max(width, 0.4) + '%',
                backgroundColor: isDark ? 'transparent' : SEGMENT_COLOR[segment.state],
                backgroundImage: isDark
                  ? 'repeating-linear-gradient(45deg, var(--unknown) 0 3px, transparent 3px 7px)'
                  : undefined,
                opacity: segment.state === 'LIVE' ? 0.85 : 1,
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2 text-caption" style={{ color: 'var(--text-3)' }} aria-hidden>
        <span>
          <span className="font-mono tabular-nums">{windowHours >= 48 ? Math.round(windowHours / 24) : windowHours}</span>
          {windowHours >= 48 ? ' days ago' : ' hours ago'}
        </span>
        <span>Now</span>
      </div>

      <div className="flex items-center gap-x-6 gap-y-2 flex-wrap mt-2.5 text-body-sm" style={{ color: 'var(--text-3)' }}>
        <Legend color="var(--ok)" label="Live" />
        <Legend color="var(--watch)" label="Lagging" />
        <Legend color="var(--unknown)" label="Dark (no link)" hatched />
        <span className="ml-auto">Hover the bar for exact times</span>
      </div>
    </div>
  );
}

function Legend({ color, label, hatched }: { color: string; label: string; hatched?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        style={{
          width: 18, height: 12, borderRadius: 3,
          backgroundColor: hatched ? 'transparent' : color,
          backgroundImage: hatched ? `repeating-linear-gradient(45deg, ${color} 0 2px, transparent 2px 5px)` : undefined,
        }}
      />
      {label}
    </span>
  );
}

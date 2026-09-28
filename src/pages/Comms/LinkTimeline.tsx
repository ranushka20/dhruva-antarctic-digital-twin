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
        style={{ height: 22, backgroundColor: 'var(--track)', borderRadius: 'var(--r-pill)' }}
        role="img"
        aria-label={`Link state over the last ${windowHours} hours`}
      >
        {segments.length === 0 && (
          <span className="m-auto font-mono text-micro" style={{ color: 'var(--text-4)' }}>
            no link history in this window
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

      <div className="flex items-center gap-3 mt-1.5 font-mono text-micro tracking-[0.06em]" style={{ color: 'var(--text-4)' }}>
        <Legend color="var(--ok)" label="LIVE" />
        <Legend color="var(--watch)" label="LAGGING" />
        <Legend color="var(--unknown)" label="DARK (hatched)" hatched />
        <span className="ml-auto">{windowHours >= 48 ? `${Math.round(windowHours / 24)} d window` : `${windowHours} h window`}</span>
      </div>
    </div>
  );
}

function Legend({ color, label, hatched }: { color: string; label: string; hatched?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span
        style={{
          width: 10, height: 8, borderRadius: 2,
          backgroundColor: hatched ? 'transparent' : color,
          backgroundImage: hatched ? `repeating-linear-gradient(45deg, ${color} 0 2px, transparent 2px 4px)` : undefined,
        }}
      />
      {label}
    </span>
  );
}

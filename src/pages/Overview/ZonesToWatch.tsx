// OWNER: Dev B
// Zones to watch — both stations, side by side, the same way the rest of the
// Overview treats them. Only zones that are NOT normal are listed, in words,
// with their current reading; everything normal folds into one line. Each
// zone opens that station's 3D twin on the zone, which is where a zone is
// actually inspected. The outside conditions (FR-8) ride along in each
// station's header rather than as separate tiles.

import { ChevronRight } from 'lucide-react';
import type { StationSummary, Zone } from '@/shared/contracts';
import type { envSnapshot } from '@/state/data';
import { StatusDot } from '@/components/shared/StatusDot';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { DegradableSurface } from '@/components/shared/DegradableSurface';
import { formatDuration } from '@/lib/time';

type Env = ReturnType<typeof envSnapshot>;

interface Props {
  stations: { summary: StationSummary; env: Env }[];
  onOpenZone: (stationId: StationSummary['id'], zoneCode: string) => void;
}

const STATUS_WORD: Record<Zone['status'], string> = {
  warning: 'Warning',
  watch: 'Running low',
  unknown: 'No recent data',
  ok: 'Normal',
};

const STATUS_COLOR: Record<Zone['status'], string> = {
  warning: 'var(--act-soft)',
  watch: 'var(--watch-soft)',
  unknown: 'var(--text-3)',
  ok: 'var(--ok-soft)',
};

const RANK: Record<Zone['status'], number> = { warning: 0, watch: 1, unknown: 2, ok: 3 };

export function ZonesToWatch({ stations, onOpenZone }: Props) {
  return (
    <section
      className="@container flex flex-col min-w-0 p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Zones to watch"
    >
      <h2 className="text-title font-semibold" style={{ color: 'var(--text)' }}>Zones to watch</h2>
      <p className="text-body-sm mt-1 mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        Zones that are not normal, on both stations. Select one to open it in the 3D twin.
      </p>

      <div className="grid grid-cols-1 gap-4 @min-[38rem]:grid-cols-2">
        {stations.map(({ summary, env }) => (
          <DegradableSurface
            key={summary.id}
            syncState={summary.sync.state}
            ageLabel={formatDuration(summary.sync.ageSeconds)}
          >
            <StationZones station={summary} env={env} onOpenZone={onOpenZone} />
          </DegradableSurface>
        ))}
      </div>
    </section>
  );
}

function StationZones({
  station, env, onOpenZone,
}: { station: StationSummary; env: Env; onOpenZone: Props['onOpenZone'] }) {
  const flagged = station.zones
    .filter((z) => z.status !== 'ok')
    .sort((a, b) => RANK[a.status] - RANK[b.status]);
  const normal = station.zones.length - flagged.length;

  return (
    <div
      className="p-4 h-full"
      style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)' }}
    >
      <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1.5 mb-3">
        <h3 className="text-body font-semibold" style={{ color: 'var(--text)' }}>{station.name}</h3>
        <span className="ml-auto inline-flex items-center flex-wrap gap-x-2 gap-y-1 text-body-sm" style={{ color: 'var(--text-3)' }}>
          <span title="Outside air temperature">
            <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{env.ambientC.value}</span> °C
          </span>
          <ProvenanceBadge measurement={env.ambientC} label="Outside temperature" abbreviated align="right" />
          <span aria-hidden>·</span>
          <span title="Wind speed">
            wind <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{env.windKt.value}</span> kt
          </span>
          <ProvenanceBadge measurement={env.windKt} label="Wind speed" abbreviated align="right" />
        </span>
      </div>

      {flagged.length > 0 && (
        <ul className="flex flex-col gap-1.5 mb-2.5">
          {flagged.map((zone) => {
            const hasValue = zone.summary?.value !== null && zone.summary?.value !== undefined;
            return (
              <li key={zone.code}>
                <button
                  type="button"
                  onClick={() => onOpenZone(station.id, zone.code)}
                  className="group w-full flex items-center gap-3 px-3 min-h-11 text-left rounded-lg hover:bg-[var(--panel-alt)]"
                  style={{ border: '1px solid var(--line)' }}
                  title={`Open ${zone.code} ${zone.name} in the ${station.name} 3D twin`}
                >
                  <StatusDot status={zone.status} size={9} />
                  <span className="font-mono text-body-sm shrink-0" style={{ color: 'var(--text-3)' }}>{zone.code}</span>
                  <span className="text-body font-medium min-w-0 truncate" style={{ color: 'var(--text)' }}>{zone.name}</span>
                  {hasValue && (
                    <span className="text-body-sm shrink-0" style={{ color: 'var(--text-3)' }}>
                      <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{zone.summary.value}</span>{' '}
                      {zone.summary.unit}
                    </span>
                  )}
                  <span className="ml-auto text-body-sm shrink-0" style={{ color: STATUS_COLOR[zone.status] }}>
                    {STATUS_WORD[zone.status]}
                  </span>
                  <ChevronRight
                    size={16}
                    className="shrink-0 transition-transform group-hover:translate-x-0.5"
                    style={{ color: 'var(--text-3)' }}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-center gap-2 text-body-sm" style={{ color: 'var(--text-3)' }}>
        <StatusDot status="ok" size={8} />
        {flagged.length === 0 ? (
          <>All <span className="font-mono tabular-nums">{station.zones.length}</span> zones normal</>
        ) : (
          <>
            <span className="font-mono tabular-nums">{normal}</span> other zone{normal === 1 ? '' : 's'} normal
          </>
        )}
      </p>
    </div>
  );
}

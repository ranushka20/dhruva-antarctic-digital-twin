// OWNER: Dev B
// Station zones panel — the signature light-cone container (§5) with a
// floating station chip and a zone grid that adapts from 4 to 9 cells
// without breaking (FR-7.6), because the zone set is data-driven per station.

import type { Zone } from '@/shared/contracts';
import { StatusDot } from '@/components/shared/StatusDot';

interface Props {
  stationName: string;
  zones: Zone[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

const CELL_BG: Record<Zone['status'], string> = {
  ok: 'var(--panel-alt)',
  watch: 'rgba(217,164,65,0.10)',
  warning: 'rgba(242,107,33,0.10)',
  unknown: 'var(--panel-alt)',
};

const CELL_BORDER: Record<Zone['status'], string> = {
  ok: 'var(--line)',
  watch: 'rgba(217,164,65,0.42)',
  warning: 'rgba(242,107,33,0.45)',
  unknown: 'var(--line)',
};

export function StationZonesPanel({ stationName, zones, selectedCode, onSelect }: Props) {
  const counts = {
    ok: zones.filter((z) => z.status === 'ok').length,
    watch: zones.filter((z) => z.status === 'watch').length,
    warning: zones.filter((z) => z.status === 'warning').length,
  };
  const columns = zones.length <= 4 ? 2 : 3;

  return (
    <section className="glow-lightcone pt-7 px-4 pb-4" aria-label={`${stationName} zones`}>
      <div className="flex justify-center -mt-3 mb-4">
        <span
          className="font-mono text-[9.5px] tracking-[0.14em] px-3 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--line-strong)',
            color: 'var(--text-2)',
          }}
        >
          {stationName.toUpperCase()}
        </span>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {zones.map((zone) => {
          const selected = zone.code === selectedCode;
          return (
            <button
              key={zone.code}
              type="button"
              onClick={() => onSelect(zone.code)}
              className="p-2.5 text-left min-h-[64px]"
              style={{
                backgroundColor: CELL_BG[zone.status],
                border: `${selected ? '2px dashed var(--text)' : '1px solid ' + CELL_BORDER[zone.status]}`,
                borderRadius: 'var(--r-inner)',
              }}
              aria-pressed={selected}
            >
              <span className="flex items-center gap-1.5 mb-1">
                <span className="font-mono text-[9px] tracking-[0.10em]" style={{ color: 'var(--text-3)' }}>
                  {zone.code}
                </span>
                <StatusDot status={zone.status} size={6} />
                {zone.openActionCount > 0 && (
                  <span className="font-mono text-[8.5px] ml-auto" style={{ color: 'var(--act-soft)' }}>
                    {zone.openActionCount}
                  </span>
                )}
              </span>
              <span
                className="block text-[11px]"
                style={{ color: 'var(--text)', fontWeight: zone.status === 'warning' ? 600 : 400 }}
              >
                {zone.name}
              </span>
              <span className="block font-mono text-[9px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                {zone.summary?.value !== null && zone.summary?.value !== undefined
                  ? `${zone.summary.value} ${zone.summary.unit}`
                  : '—'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-3 font-mono text-[9px] tracking-[0.06em]" style={{ color: 'var(--text-3)' }}>
        <LegendSwatch color="var(--ok)" label={`${counts.ok} nominal`} />
        <LegendSwatch color="var(--watch)" label={`${counts.watch} low`} />
        <LegendSwatch color="var(--act)" label={`${counts.warning} warning`} />
      </div>
    </section>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ width: 8, height: 8, backgroundColor: color, borderRadius: 2 }} />
      {label}
    </span>
  );
}

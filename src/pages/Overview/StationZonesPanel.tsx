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
    // px-5, not px-4: where the first row of cells sits, the cone's 130px
    // shoulders are still ~17px inside the panel, so 16px of padding left
    // those cells painting over the curve. The extra 4px plus the
    // --cone-clear band below turns ~3px of overlap into ~6px of clearance.
    <section className="glow-lightcone px-5 pb-4" aria-label={`${stationName} zones`}>
      {/* A band exactly as tall as the cone's shoulders. The chip floats
          inside it, near the flat top; the grid begins where it ends. Both
          are measured from the panel's top edge, so this holds at any panel
          width — the arc depends on the radius, not the width. */}
      <div
        className="flex justify-center items-start pt-2.5"
        style={{ height: 'var(--cone-clear)' }}
      >
        <span
          className="font-mono text-[9.5px] tracking-[0.14em] px-3 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--line-strong)',
            color: 'var(--text-2)',
          }}
        >
          <span className="uppercase">{stationName}</span>
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
              // min-w-0 + overflow-hidden: the zone set is data-driven
              // (FR-7.6), so a longer name or unit than today's seed must
              // clip inside the cell rather than push the grid wider.
              className="p-2.5 text-left min-h-[64px] min-w-0 overflow-hidden"
              style={{
                backgroundColor: CELL_BG[zone.status],
                border: `${selected ? '2px dashed var(--text)' : '1px solid ' + CELL_BORDER[zone.status]}`,
                borderRadius: 'var(--r-inner)',
              }}
              aria-pressed={selected}
            >
              <span className="flex items-center gap-1.5 mb-1 min-w-0">
                <span className="font-mono text-[9px] tracking-[0.10em] shrink-0" style={{ color: 'var(--text-3)' }}>
                  {zone.code}
                </span>
                <StatusDot status={zone.status} size={6} />
                {zone.openActionCount > 0 && (
                  <span className="font-mono text-[8.5px] ml-auto shrink-0" style={{ color: 'var(--act-soft)' }}>
                    {zone.openActionCount}
                  </span>
                )}
              </span>
              <span
                className="block text-[11px] truncate"
                style={{ color: 'var(--text)', fontWeight: zone.status === 'warning' ? 600 : 400 }}
              >
                {zone.name}
              </span>
              <span className="block font-mono text-[9px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>
                {zone.summary?.value !== null && zone.summary?.value !== undefined
                  ? `${zone.summary.value} ${zone.summary.unit}`
                  : '—'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-3 font-mono text-[9px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-3)' }}>
        <LegendSwatch color="var(--ok)" label={`${counts.ok} nominal`} />
        <LegendSwatch color="var(--watch)" label={`${counts.watch} low`} />
        <LegendSwatch color="var(--act)" label={`${counts.warning} warning`} />
      </div>
    </section>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span className="shrink-0" style={{ width: 8, height: 8, backgroundColor: color, borderRadius: 2 }} />
      {label}
    </span>
  );
}

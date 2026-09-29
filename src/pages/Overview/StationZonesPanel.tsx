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

const STATUS_WORD: Record<Zone['status'], string> = {
  ok: 'Normal',
  watch: 'Running low',
  warning: 'Warning',
  unknown: 'No recent data',
};

export function StationZonesPanel({ stationName, zones, selectedCode, onSelect }: Props) {
  const counts = {
    ok: zones.filter((z) => z.status === 'ok').length,
    watch: zones.filter((z) => z.status === 'watch').length,
    warning: zones.filter((z) => z.status === 'warning').length,
  };
  // Two columns in a rail, so names and readings get room to breathe; a
  // larger zone set only goes three-across when the panel itself is wide
  // enough (container query — it tracks the text-size setting too).
  const threeUp = zones.length > 4;

  return (
    // px-5, not px-4: where the first row of cells sits, the cone's 130px
    // shoulders are still ~17px inside the panel, so 16px of padding left
    // those cells painting over the curve. The extra 4px plus the
    // --cone-clear band below turns ~3px of overlap into ~6px of clearance.
    <section className="glow-lightcone @container px-5 pb-5" aria-label={`${stationName} zones`}>
      {/* A band exactly as tall as the cone's shoulders. The chip floats
          inside it, near the flat top; the grid begins where it ends. Both
          are measured from the panel's top edge, so this holds at any panel
          width — the arc depends on the radius, not the width. */}
      <div
        className="flex justify-center items-start pt-2.5"
        style={{ height: 'var(--cone-clear)' }}
      >
        <span
          className="text-body-sm font-medium px-4 py-1 rounded-full whitespace-nowrap"
          style={{
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--line-strong)',
            color: 'var(--text)',
          }}
        >
          {stationName} zones
        </span>
      </div>

      <div className={`grid grid-cols-2 gap-3 ${threeUp ? '@min-[32rem]:grid-cols-3' : ''}`}>
        {zones.map((zone) => {
          const selected = zone.code === selectedCode;
          const hasValue = zone.summary?.value !== null && zone.summary?.value !== undefined;
          return (
            <button
              key={zone.code}
              type="button"
              onClick={() => onSelect(zone.code)}
              // min-w-0 + break-words: the zone set is data-driven (FR-7.6),
              // so a longer name or unit than today's seed wraps inside the
              // cell rather than pushing the grid wider or being cut off.
              className="flex flex-col p-3 text-left min-h-[5.25rem] min-w-0 transition-colors"
              style={{
                backgroundColor: CELL_BG[zone.status],
                border: `${selected ? '2px dashed var(--text)' : '1px solid ' + CELL_BORDER[zone.status]}`,
                borderRadius: 'var(--r-inner)',
              }}
              aria-pressed={selected}
              title={`${zone.code} ${zone.name} — ${STATUS_WORD[zone.status]}${zone.openActionCount > 0 ? ` · ${zone.openActionCount} open action${zone.openActionCount === 1 ? '' : 's'}` : ''}`}
            >
              <span className="flex items-center gap-2 mb-1.5 min-w-0">
                <StatusDot status={zone.status} size={9} />
                <span className="font-mono text-caption shrink-0" style={{ color: 'var(--text-3)' }}>
                  {zone.code}
                </span>
                {zone.openActionCount > 0 && (
                  <span
                    className="font-mono text-caption tabular-nums ml-auto shrink-0 px-2 rounded-full"
                    style={{ color: 'var(--act-soft)', backgroundColor: 'rgba(242,107,33,0.12)' }}
                    aria-label={`${zone.openActionCount} open actions`}
                  >
                    {zone.openActionCount}
                  </span>
                )}
              </span>
              <span
                className="block text-body leading-snug line-clamp-2 break-words"
                style={{ color: 'var(--text)', fontWeight: zone.status === 'warning' ? 600 : 500 }}
              >
                {zone.name}
              </span>
              <span className="block text-body-sm mt-1 break-words" style={{ color: 'var(--text-3)' }}>
                {hasValue ? (
                  <>
                    <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>
                      {zone.summary.value}
                    </span>{' '}
                    {zone.summary.unit}
                  </>
                ) : (
                  <span className="font-mono">—</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center flex-wrap gap-x-5 gap-y-2 mt-4 text-body-sm" style={{ color: 'var(--text-3)' }}>
        <LegendSwatch color="var(--ok)" count={counts.ok} label="normal" />
        <LegendSwatch color="var(--watch)" count={counts.watch} label="low" />
        <LegendSwatch color="var(--act)" count={counts.warning} label="warning" />
      </div>
    </section>
  );
}

function LegendSwatch({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <span className="flex items-center gap-2 shrink-0">
      <span className="shrink-0" style={{ width: 10, height: 10, backgroundColor: color, borderRadius: 3 }} aria-hidden />
      <span>
        <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{count}</span> {label}
      </span>
    </span>
  );
}

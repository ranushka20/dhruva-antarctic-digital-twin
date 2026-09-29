// OWNER: Dev B
// Waste — answers "Is all waste accounted for?". For each station and type of
// waste, produced − shipped out should equal what is stored now (FR-3.4).
// Rows that don't add up sort first and can raise an action. The monthly
// chart and the full list of waste movements are folded away underneath.
// Every weight is SYNTH until the station's feed exists (FR-3.7).

import { useId, useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { CHART_DEFAULTS, ChartContainer, ChartLegend, ChartTooltipContent } from '@/components/shared/Chart';
import type { Measurement, WasteEvent } from '@/shared/contracts';
import { getVoyages, type WasteBalanceRow } from '@/state/data';
import { useStoreValue } from '@/state/useStore';
import { STATION_LABEL } from '@/state/stationScope';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { StatusDot } from '@/components/shared/StatusDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateIST } from '@/lib/time';
import { synth } from '@/lib/provenance';

/** Waste types in regulatory handling order (general → hazardous). */
export const STREAM_ORDER: WasteEvent['stream'][] = [
  'general', 'recyclable', 'food', 'sewage', 'scientific', 'medical', 'fuel_oily', 'hazardous',
];

export const STREAM_LABEL: Record<WasteEvent['stream'], string> = {
  general: 'General',
  recyclable: 'Recyclable',
  food: 'Food',
  sewage: 'Sewage',
  scientific: 'Scientific',
  medical: 'Medical',
  fuel_oily: 'Fuel / oily',
  hazardous: 'Hazardous',
};

interface Props {
  balance: WasteBalanceRow[];
  series: { month: string; byStream: Record<string, number>; cumulativeStoredKg: number }[];
  events: WasteEvent[];
  toleranceKg: number;
  onRaiseBalanceAction: (row: WasteBalanceRow) => void;
  onOpenVoyage: (voyageId: string) => void;
  canRaise: boolean;
}

const PANEL = {
  backgroundColor: 'var(--panel)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-card)',
} as const;

const kg = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

export function WasteLedger({
  balance, series, events, toleranceKg, onRaiseBalanceAction, onOpenVoyage, canRaise,
}: Props) {
  // One label for every weight on this tab; the timestamp is when it was shown.
  const sample = useMemo(() => synth(0, 'kg', "the station's waste records feed"), []);

  // Rows that don't add up first, then by station and handling order.
  const rows = [...balance].sort(
    (a, b) =>
      Number(a.withinTolerance) - Number(b.withinTolerance)
      || a.stationId.localeCompare(b.stationId)
      || STREAM_ORDER.indexOf(a.stream) - STREAM_ORDER.indexOf(b.stream),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Does each type of waste add up? (FR-3.1, FR-3.4) ---- */}
      <section className="@container p-5" style={PANEL} aria-label="Waste balance">
        <p className="text-body max-w-[70ch]" style={{ color: 'var(--text-2)' }}>
          Everything produced should either still be stored at the station or have been shipped out — each
          type of waste is checked.
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 mb-5 text-body-sm" style={{ color: 'var(--text-3)' }}>
          All weights are sample data until the station's feed is connected.
          <ProvenanceBadge measurement={sample} label="Every waste weight on this tab" />
        </p>

        {rows.length === 0 ? (
          <EmptyState reason="No waste has been recorded for this station yet." />
        ) : (
          <>
            {/* Wide: one table. */}
            <table className="hidden @min-[48rem]:table w-full border-collapse">
              <caption className="sr-only">Waste balance by station and type of waste</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH} style={TH_STYLE}>Station</th>
                  <th scope="col" className={TH} style={TH_STYLE}>Waste type</th>
                  <MassHeader label="Produced" sample={sample} />
                  <MassHeader label="Shipped out" sample={sample} />
                  <MassHeader label="Stored now" sample={sample} />
                  <th
                    scope="col"
                    className={TH + ' pl-8 min-w-[16rem]'}
                    style={TH_STYLE}
                    title={`Counts as adding up when the difference is ${toleranceKg} kg or less, to allow for weighing error.`}
                  >
                    Adds up?
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.stationId + row.stream}>
                    <td className="py-3.5 px-3 text-body align-middle" style={{ ...CELL, color: 'var(--text-2)' }}>
                      {STATION_LABEL[row.stationId]}
                    </td>
                    <td className="py-3.5 px-3 text-body font-medium align-middle" style={{ ...CELL, color: 'var(--text)' }}>
                      {STREAM_LABEL[row.stream]}
                    </td>
                    <MassCell value={row.generatedKg} />
                    <MassCell value={row.shippedKg} />
                    <MassCell value={row.storedKg} />
                    <td className="py-2.5 pl-8 pr-3 align-middle" style={CELL}>
                      <AddsUp row={row} canRaise={canRaise} onRaise={onRaiseBalanceAction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Narrow: the same rows as labelled cards — never a sideways scroll. */}
            <ul className="flex flex-col gap-3 @min-[48rem]:hidden" aria-label="Waste balance by station and type of waste">
              {rows.map((row) => (
                <li
                  key={row.stationId + row.stream}
                  className="p-4"
                  style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)' }}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-body">
                    <span style={{ color: 'var(--text-2)' }}>{STATION_LABEL[row.stationId]}</span>
                    <span aria-hidden style={{ color: 'var(--text-3)' }}>·</span>
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>{STREAM_LABEL[row.stream]}</span>
                    {/* The column-header badges are hidden at this width, so each card carries its own. */}
                    <span className="ml-auto">
                      <ProvenanceBadge measurement={sample} label={`${STREAM_LABEL[row.stream]} weights — sample data`} abbreviated align="right" />
                    </span>
                  </div>
                  <dl className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-x-4 gap-y-3 mt-3">
                    {([
                      ['Produced', row.generatedKg],
                      ['Shipped out', row.shippedKg],
                      ['Stored now', row.storedKg],
                    ] as const).map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-body-sm" style={{ color: 'var(--text-3)' }}>{label}</dt>
                        <dd className="font-mono text-body tabular-nums mt-0.5" style={{ color: 'var(--text)' }}>
                          {kg(value)} <span style={{ color: 'var(--text-3)' }}>kg</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 pt-3"
                    style={{ borderTop: '1px solid var(--line)' }}
                  >
                    <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>Adds up?</span>
                    <AddsUp row={row} canRaise={canRaise} onRaise={onRaiseBalanceAction} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ---- Monthly chart (FR-3.3), folded away ---- */}
      {series.length > 0 && (
        <Disclosure show="Show monthly chart" hide="Hide monthly chart">
          <MonthlyChart series={series} />
        </Disclosure>
      )}

      {/* ---- Every waste movement (FR-3.5, FR-3.6), folded away ---- */}
      {events.length > 0 && (
        <Disclosure
          show={<>Show all waste movements (<span className="font-mono tabular-nums">{events.length}</span>)</>}
          hide="Hide waste movements"
        >
          <Movements events={events} sample={sample} onOpenVoyage={onOpenVoyage} />
        </Disclosure>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Balance table pieces
// ---------------------------------------------------------------------------

const TH = 'pb-3 px-3 text-left text-body-sm font-medium whitespace-nowrap align-bottom';
const TH_STYLE = { color: 'var(--text-3)', borderBottom: '1px solid var(--line-strong)' } as const;
const CELL = { borderBottom: '1px solid var(--line)' } as const;

/** Mass column header — carries the one SYNTH badge for every figure below it. */
function MassHeader({ label, sample }: { label: string; sample: Measurement }) {
  return (
    <th scope="col" className={TH + ' text-right'} style={TH_STYLE}>
      <span className="inline-flex items-center justify-end gap-2">
        {label}
        <ProvenanceBadge measurement={sample} label={`${label} — sample weights`} abbreviated align="right" />
      </span>
    </th>
  );
}

function MassCell({ value }: { value: number }) {
  return (
    <td
      className="py-3.5 px-3 text-right font-mono text-body tabular-nums whitespace-nowrap align-middle"
      style={{ ...CELL, color: 'var(--text)' }}
    >
      {kg(value)} <span style={{ color: 'var(--text-3)' }}>kg</span>
    </td>
  );
}

/** "Yes" in mint, or the gap in orange with the one action it earns. */
function AddsUp({
  row, canRaise, onRaise,
}: { row: WasteBalanceRow; canRaise: boolean; onRaise: (row: WasteBalanceRow) => void }) {
  if (row.withinTolerance) {
    return (
      <span className="inline-flex items-center gap-2 text-body font-medium" style={{ color: 'var(--ok-soft)' }}>
        <StatusDot status="ok" size={9} />
        Yes
      </span>
    );
  }

  const missing = row.discrepancyKg > 0;
  const what = `${STATION_LABEL[row.stationId]} ${STREAM_LABEL[row.stream].toLowerCase()} waste`;
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span
        className="inline-flex items-center gap-2 text-body font-medium"
        style={{ color: 'var(--act-soft)' }}
        title={
          missing
            ? 'Less is stored and shipped out than was produced.'
            : 'More is stored and shipped out than was produced.'
        }
      >
        <StatusDot status="warning" size={9} />
        <span>
          <span className="font-mono tabular-nums">{kg(Math.abs(row.discrepancyKg))}</span> kg {missing ? 'missing' : 'extra'}
        </span>
      </span>
      {canRaise && (
        <button
          type="button"
          onClick={() => onRaise(row)}
          className="inline-flex items-center px-4 min-h-10 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
          style={{ border: '1px solid var(--act)', color: 'var(--act-soft)' }}
          aria-label={`Raise action: ${what} doesn't add up`}
        >
          Raise action
        </button>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Disclosure — a panel whose whole header row opens and closes it
// ---------------------------------------------------------------------------

function Disclosure({ show, hide, children }: { show: ReactNode; hide: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="@container" style={PANEL}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className="w-full flex items-center gap-3 px-5 min-h-14 text-left text-body font-medium hover:bg-[var(--panel-alt)]"
        style={{
          color: 'var(--text)',
          borderRadius: open ? 'var(--r-card) var(--r-card) 0 0' : 'var(--r-card)',
        }}
      >
        <ChevronDown
          size={18}
          aria-hidden
          className="shrink-0 transition-transform"
          style={{ color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : undefined }}
        />
        <span>{open ? hide : show}</span>
      </button>
      {open && (
        <div id={id} className="m-fade px-5 pb-5 pt-1">
          {children}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Monthly chart — how much was produced each month, stacked in three plain
// groups (eight types would be eight near-identical fills). Series colours
// are the chart tokens, never a status colour.
// ---------------------------------------------------------------------------

const WASTE_GROUPS = [
  { key: 'everyday', label: 'Everyday', streams: ['general', 'recyclable', 'food'], color: 'var(--chart-1)',
    hint: 'General, recyclable and food waste' },
  { key: 'sewage_lab', label: 'Sewage and lab', streams: ['sewage', 'scientific'], color: 'var(--chart-3)',
    hint: 'Sewage and scientific waste' },
  { key: 'hazardous', label: 'Hazardous', streams: ['medical', 'fuel_oily', 'hazardous'], color: 'var(--chart-2)',
    hint: 'Medical, fuel / oily and hazardous waste' },
] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonthlyChart({ series }: { series: Props['series'] }) {
  const rows = series.map((m) => {
    const [yy, mm] = m.month.split('-');
    const row: Record<string, string | number> = {
      month: MONTHS[Number(mm) - 1] ?? m.month,
      full: `${MONTHS[Number(mm) - 1] ?? ''} ${yy}`,
    };
    for (const g of WASTE_GROUPS) {
      row[g.key] = Math.round(g.streams.reduce((sum, st) => sum + (m.byStream[st] ?? 0), 0));
    }
    return row;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>Kilograms produced each month, by kind of waste.</p>
        <ChartLegend items={WASTE_GROUPS.map((g) => ({ label: g.label, color: g.color, hint: g.hint }))} />
      </div>
      <ChartContainer className="h-60" label="Kilograms of waste produced each month, stacked by kind of waste">
        <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid {...CHART_DEFAULTS.grid} />
          <XAxis dataKey="month" {...CHART_DEFAULTS.axis} interval={0} />
          <YAxis
            {...CHART_DEFAULTS.axis}
            width={44}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: 'var(--panel-raised)' }}
            content={
              <ChartTooltipContent
                unit="kg"
                hideZero
                labelFormatter={(l) => rows.find((r) => r.month === l)?.full ?? String(l)}
              />
            }
          />
          {WASTE_GROUPS.map((g) => (
            <Bar key={g.key} dataKey={g.key} name={g.label} stackId="waste" fill={g.color} maxBarSize={32} isAnimationActive={false} />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waste movements — one plain row each, newest first. A grid once the panel
// is wide enough; below that each row simply wraps.
// ---------------------------------------------------------------------------

const MOVE_GRID =
  '@min-[48rem]:grid @min-[48rem]:grid-cols-[8rem_minmax(7rem,1fr)_7rem_8rem_minmax(8rem,1fr)] @min-[48rem]:gap-x-4 @min-[48rem]:items-baseline';

function Movements({
  events, sample, onOpenVoyage,
}: { events: WasteEvent[]; sample: Measurement; onOpenVoyage: (voyageId: string) => void }) {
  const voyages = useStoreValue(getVoyages);
  const voyageName = (id: string) =>
    voyages.find((v) => v.id === id)?.name.replace(/^voyage\s+/i, '') ?? id;

  return (
    <div>
      <div
        className={`hidden ${MOVE_GRID} pb-2.5 text-body-sm`}
        style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--line-strong)' }}
      >
        <span>Date</span>
        <span>Waste type</span>
        <span className="flex items-center justify-end gap-2">
          Weight
          <ProvenanceBadge measurement={sample} label="Waste movement weights — sample data" abbreviated align="right" />
        </span>
        <span>Movement</span>
        <span>Handled by</span>
      </div>

      <ul aria-label="Waste movements, newest first">
        {events.map((e) => {
          const mass = typeof e.massKg.value === 'number' ? kg(e.massKg.value) : '—';
          const shipped = e.direction === 'shipped';
          return (
            <li key={e.id} className="flex flex-col gap-1.5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 ${MOVE_GRID}`}>
                <span className="font-mono text-body-sm tabular-nums" style={{ color: 'var(--text-2)' }}>
                  {formatDateIST(e.at)}
                </span>
                <span className="text-body" style={{ color: 'var(--text)' }}>{STREAM_LABEL[e.stream]}</span>
                <span className="font-mono text-body tabular-nums whitespace-nowrap @min-[48rem]:text-right" style={{ color: 'var(--text)' }}>
                  {mass} <span style={{ color: 'var(--text-3)' }}>kg</span>
                </span>
                <span className="text-body-sm" style={{ color: 'var(--text-2)' }}>
                  {shipped ? 'Shipped out' : 'Produced'}
                </span>
                <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>
                  <span className="@min-[48rem]:hidden">by </span>{e.handler}
                </span>
              </div>

              {(shipped || e.pendingSync) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 @min-[48rem]:pl-[9rem]">
                  {shipped && (e.voyageId ? (
                    <button
                      type="button"
                      onClick={() => onOpenVoyage(e.voyageId!)}
                      className="inline-flex items-center gap-1.5 min-h-10 text-body-sm text-left underline underline-offset-4 hover:text-[var(--text)]"
                      style={{ color: 'var(--text-2)' }}
                      title="Open this voyage's manifest in Logistics"
                    >
                      Shipped on voyage <span className="font-mono tabular-nums">{voyageName(e.voyageId)}</span> →
                    </button>
                  ) : (
                    <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>No voyage recorded</span>
                  ))}
                  {e.pendingSync && (
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-body-sm"
                      style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}
                      title="Filed at the station; waiting for the satellite link to reach HQ. Not late."
                    >
                      Waiting for the link
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

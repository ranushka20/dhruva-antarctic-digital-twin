// OWNER: Dev B
// Resupply table — ONE row per resource, and that row IS the timeline.
//
// This replaces what used to be two stacked panels: a full-width Gantt and a
// ten-column ledger showing the same thirteen resources twice. An operator
// scanning for "what do I order first" had to read both and hold the join in
// their head. Here the depletion bar, its uncertainty band, the ship window
// and the LSOD tick all live in one cell on a shared axis, so the answer is
// one left-to-right scan.
//
// Everything the ledger used to show on the surface — stock, burn rate and
// its trend, margin, reorder point, every provenance badge — is still here,
// one click down on the row. Detail on demand, not detail by default.

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Voyage } from '@/shared/contracts';
import type { DerivedResource } from '@/state/data';
import { shipWindowDays } from '@/state/data';
import { StatusDot } from '@/components/shared/StatusDot';
import { Sparkline } from '@/components/shared/Sparkline';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { SYNC_OPACITY } from '@/lib/freshness';
import { lsodColor, lsodUrgency } from '@/lib/risk';

const RISK_COLOR = {
  ok: 'var(--ok)',
  watch: 'var(--watch)',
  warning: 'var(--act)',
  critical: 'var(--act)',
} as const;

const TICK_COLOR = {
  unknown: 'var(--text-3)',
  warning: 'var(--act)',
  watch: 'var(--watch)',
  ok: 'var(--text-3)',
} as const;

interface Props {
  resources: DerivedResource[];
  voyage: Voyage | null;
  horizonDays: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRaiseAction: (resource: DerivedResource) => void;
  canRaise: boolean;
}

export function ResupplyTable({
  resources, voyage, horizonDays, selectedId, onSelect, onRaiseAction, canRaise,
}: Props) {
  if (resources.length === 0) {
    return (
      <section
        className="p-5"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <EmptyState reason="No resources in scope. Resupply is a shared constraint — set the scope to All to see both stations on one ship." />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col min-h-0"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Resupply table"
    >
      {/* ---- Card heading + legend for the timeline column ---- */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <h2 className="text-title font-semibold" style={{ color: 'var(--text)' }}>
          Supplies until the next ship
        </h2>
        <p className="text-body-sm mt-1 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
          Select any row to see stock, daily usage and to raise an action.
        </p>
        <ul className="flex items-center gap-x-6 gap-y-2 flex-wrap mt-3.5 text-body-sm" style={{ color: 'var(--text-3)' }}>
          <LegendItem label="Days of supply (lighter band = likely range)">
            <span className="block w-7 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ok)' }} />
          </LegendItem>
          <LegendItem label="When the ship can arrive">
            <span className="block w-7 h-4 rounded-sm" style={{ backgroundColor: 'var(--glow)', opacity: 0.3 }} />
          </LegendItem>
          <LegendItem label="Last safe date to order">
            <span className="block w-0.5 h-4" style={{ backgroundColor: 'var(--text-2)' }} />
          </LegendItem>
          <LegendItem label="Station not reporting">
            <span
              className="block w-7 h-1.5 rounded-full"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--text-3) 0 3px, transparent 3px 6px)' }}
            />
          </LegendItem>
        </ul>
      </div>

      {/* ---- Column header, with the shared day axis over the bar column ---- */}
      <div
        className="hidden lg:flex items-end gap-5 px-5 pt-3 pb-2.5 shrink-0 text-body-sm"
        style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line-strong)', color: 'var(--text-3)' }}
      >
        <span className="w-4 shrink-0" />
        <span className="w-[15rem] xl:w-[17rem] shrink-0">Resource</span>
        <span className="w-[8.5rem] shrink-0">Days of supply</span>
        <span className="flex-1 min-w-[12rem]">
          <span className="block mb-1.5">Supply compared with ship arrival</span>
          <Axis horizonDays={horizonDays} />
        </span>
        <span className="w-[7.5rem] shrink-0 text-right" title="Last safe order date — the latest an order can be placed and still arrive before stock runs out">
          Order within
        </span>
        <span className="w-5 shrink-0" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {resources.map((resource) => (
          <Row
            key={resource.id}
            resource={resource}
            voyage={voyage}
            horizonDays={horizonDays}
            expanded={resource.id === selectedId}
            onToggle={() => onSelect(resource.id === selectedId ? null : resource.id)}
            onRaiseAction={() => onRaiseAction(resource)}
            canRaise={canRaise}
          />
        ))}
      </div>

      <p className="text-body-sm px-5 py-3.5 shrink-0 max-w-[76ch]" style={{ color: 'var(--text-3)' }}>
        Days of supply always show a likely range, not a single number. When we cannot reach a
        station, its bar is hatched and no order date is given — old data never produces a
        confident deadline.
      </p>
    </section>
  );
}

function LegendItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex items-center justify-center w-7 h-4 shrink-0" aria-hidden>{children}</span>
      {label}
    </li>
  );
}

function Axis({ horizonDays }: { horizonDays: number }) {
  const ticks = [0, 90, 180, 270, 365].filter((t) => t <= horizonDays);
  return (
    <span className="relative block h-5" aria-hidden>
      {ticks.map((t) => (
        <span
          key={t}
          className="absolute text-caption whitespace-nowrap"
          style={{
            left: (t / horizonDays) * 100 + '%',
            transform: t === 0 ? undefined : t >= horizonDays ? 'translateX(-100%)' : 'translateX(-50%)',
            color: 'var(--text-3)',
          }}
        >
          {t === 0 ? 'Today' : <><span className="font-mono tabular-nums">{t}</span> days</>}
        </span>
      ))}
    </span>
  );
}

function Row({
  resource, voyage, horizonDays, expanded, onToggle, onRaiseAction, canRaise,
}: {
  resource: DerivedResource;
  voyage: Voyage | null;
  horizonDays: number;
  expanded: boolean;
  onToggle: () => void;
  onRaiseAction: () => void;
  canRaise: boolean;
}) {
  const window = shipWindowDays(resource.stationId, voyage);

  return (
    <div style={{ borderBottom: '1px solid var(--line)', opacity: SYNC_OPACITY[resource.syncState] }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex flex-wrap lg:flex-nowrap items-center gap-x-5 gap-y-2.5 px-5 py-3 text-left hover:bg-[var(--panel-raised)]"
        style={{ backgroundColor: expanded ? 'var(--panel-raised)' : 'transparent' }}
      >
        <span className="w-4 shrink-0 flex justify-center">
          <StatusDot status={resource.risk === 'critical' ? 'warning' : resource.risk} size={9} />
        </span>

        <span className="flex-1 lg:flex-none lg:w-[15rem] xl:w-[17rem] lg:shrink-0 min-w-0">
          <span className="block text-body font-medium break-words" style={{ color: 'var(--text)' }}>
            {resource.name}
          </span>
          <span className="flex items-center gap-2 flex-wrap mt-1">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-caption"
              style={{ backgroundColor: 'var(--panel-alt)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
              title={STATION_CODE[resource.stationId]}
            >
              {STATION_LABEL[resource.stationId]}
            </span>
            {resource.belowReorder && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-caption font-medium"
                style={{ color: 'var(--act-soft)', border: '1px solid rgba(242,107,33,0.45)' }}
                title="Stock is below the reorder point"
              >
                Reorder now
              </span>
            )}
          </span>
        </span>

        <span
          className="lg:w-[8.5rem] shrink-0 flex items-baseline gap-1.5 flex-wrap"
          title={`Autonomy: ${Math.round(resource.autonomyDays)} days, ±${Math.round(resource.autonomyBandDays)} days uncertainty`}
        >
          <span className="font-mono text-body font-medium tabular-nums" style={{ color: 'var(--text)' }}>
            {Math.round(resource.autonomyDays)}
          </span>
          <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>
            days <span className="font-mono tabular-nums">±{Math.round(resource.autonomyBandDays)}</span>
          </span>
        </span>

        <span className="order-last lg:order-none basis-full lg:basis-auto flex-1 min-w-[12rem] pl-9 lg:pl-0">
          <CoverBar resource={resource} window={window} horizonDays={horizonDays} />
        </span>

        <span
          className="lg:w-[7.5rem] shrink-0 text-right text-body"
          style={{ color: lsodColor(resource.lsodDays) }}
          title={
            resource.lsodDays === null
              ? resource.lsodUnavailableReason === 'no-voyage'
                ? 'No voyage is planned this season, so there is no order deadline'
                : 'Station link is stale — no order-by date can be computed'
              : 'Last safe order date'
          }
        >
          {resource.lsodDays === null
            ? (resource.lsodUnavailableReason === 'no-voyage' ? 'No ship' : 'Unknown')
            : <><span className="font-mono font-medium tabular-nums">{Math.round(resource.lsodDays)}</span> days</>}
        </span>

        <span className="w-5 shrink-0" style={{ color: 'var(--text-3)' }} aria-hidden>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {expanded && (
        <RowDetail resource={resource} onRaiseAction={onRaiseAction} canRaise={canRaise} />
      )}
    </div>
  );
}

/**
 * Depletion bar, uncertainty band, ship window and LSOD tick on one shared
 * scale. Each row draws its OWN station's arrival window, because Bharati and
 * Maitri are not reached on the same date by the same ship.
 */
function CoverBar({
  resource, window, horizonDays,
}: {
  resource: DerivedResource;
  window: { earliestDay: number; latestDay: number } | null;
  horizonDays: number;
}) {
  const pct = (days: number) => Math.max(0, Math.min(100, (days / horizonDays) * 100));
  const stale = resource.lsodDays === null && resource.lsodUnavailableReason === 'stale';
  const color = RISK_COLOR[resource.risk];

  const bandLow = Math.max(0, resource.autonomyDays - resource.autonomyBandDays);
  const bandHigh = resource.autonomyDays + resource.autonomyBandDays;

  return (
    <span
      className="relative block w-full"
      style={{ height: 24 }}
      title={
        stale
          ? 'Station link is stale — cover shown from last known state, no order-by date'
          : `Supply lasts ${Math.round(bandLow)}–${Math.round(bandHigh)} days` +
            (window ? ` · ship arrives between day ${window.earliestDay} and ${window.latestDay}` : '')
      }
    >
      {/* Ship window — the thing the bar has to reach */}
      {window && window.latestDay > 0 && (
        <span
          className="absolute top-0 bottom-0"
          style={{
            left: pct(window.earliestDay) + '%',
            width: Math.max(1.2, pct(window.latestDay) - pct(window.earliestDay)) + '%',
            backgroundColor: 'var(--glow)',
            opacity: 0.16,
            borderLeft: '1px solid rgba(79,209,165,0.5)',
            borderRadius: 3,
          }}
        />
      )}

      {/* Track */}
      <span
        className="absolute left-0 right-0"
        style={{ top: 9, height: 6, backgroundColor: 'var(--track)', borderRadius: 999 }}
      />

      {/* Uncertainty band — never a bare point estimate */}
      <span
        className="absolute"
        style={{
          left: pct(bandLow) + '%',
          width: Math.max(0.6, pct(bandHigh) - pct(bandLow)) + '%',
          top: 5, height: 14,
          backgroundColor: color, opacity: 0.2, borderRadius: 4,
        }}
      />

      {/* Depletion bar */}
      <span
        className="absolute left-0"
        style={{
          width: pct(resource.autonomyDays) + '%',
          top: 9, height: 6,
          borderRadius: 999,
          backgroundColor: stale ? 'transparent' : color,
          backgroundImage: stale
            ? `repeating-linear-gradient(45deg, ${color} 0 3px, transparent 3px 6px)`
            : undefined,
        }}
      />

      {/* LSOD tick — absent by design when we cannot compute one */}
      {resource.lsodDays !== null && (
        <span
          className="absolute"
          style={{
            left: pct(Math.max(0, resource.lsodDays)) + '%',
            top: 1, width: 3, height: 22, borderRadius: 2,
            backgroundColor: TICK_COLOR[lsodUrgency(resource.lsodDays)],
          }}
        />
      )}
    </span>
  );
}

/** Everything the old ten-column ledger showed, one click down. */
function RowDetail({
  resource, onRaiseAction, canRaise,
}: { resource: DerivedResource; onRaiseAction: () => void; canRaise: boolean }) {
  const series = resource.burnSeries12w ?? [];
  const trend = burnTrend(series);

  return (
    <div className="px-5 pb-5 pt-1" style={{ backgroundColor: 'var(--panel-raised)' }}>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 pl-9">
        <Detail label="In stock">
          <span className="font-mono text-body font-medium tabular-nums" style={{ color: 'var(--text)' }}>
            {typeof resource.stock.value === 'number' ? resource.stock.value.toLocaleString() : '—'}
          </span>
          <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>{resource.unit}</span>
          <ProvenanceBadge measurement={resource.stock} label={resource.name + ' stock'} />
        </Detail>

        <Detail label="Used per day" hint="Burn rate, with its 12-week trend">
          <span className="font-mono text-body font-medium tabular-nums" style={{ color: TREND_COLOR[trend] }}>
            {typeof resource.burnRate.value === 'number' ? resource.burnRate.value.toLocaleString() : '—'}
          </span>
          <Sparkline series={series} width={72} height={20} />
          <ProvenanceBadge measurement={resource.burnRate} label={resource.name + ' burn rate'} />
        </Detail>

        <Detail label="Spare days when ship arrives" hint="Margin to ship, worst case">
          <span className="font-mono text-body font-medium tabular-nums" style={{ color: 'var(--text)' }}>
            {resource.marginDays
              ? `${resource.marginDays.min < 0 ? '−' : '+'}${Math.abs(Math.round(resource.marginDays.min))}`
              : '—'}
          </span>
          {resource.marginDays && <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>days</span>}
        </Detail>

        <Detail label="Reorder point">
          <span className="font-mono text-body font-medium tabular-nums" style={{ color: 'var(--text)' }}>
            {resource.reorderPoint?.toLocaleString() ?? '—'}
          </span>
          <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>{resource.unit}</span>
        </Detail>

        <button
          type="button"
          disabled={!canRaise}
          onClick={onRaiseAction}
          className="ml-auto text-body-sm font-semibold px-5 min-h-10 rounded-full"
          style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', fontFamily: 'var(--font-body)', opacity: canRaise ? 1 : 0.4 }}
          title={canRaise ? 'Create an action to order this resource' : 'Your role cannot raise actions'}
        >
          Raise action
        </button>
      </div>

      {resource.lsodDays === null && (
        <p className="text-body-sm mt-4 pl-9 max-w-[70ch]" style={{ color: 'var(--watch-soft)' }}>
          {resource.lsodUnavailableReason === 'no-voyage'
            ? 'No voyage is planned for this season, so there is no order deadline to miss. Days of supply still compute.'
            : `${STATION_LABEL[resource.stationId]} has not reported since its last sync. The supply shown is the last known figure — an order date worked out from old data would be a guess presented as a deadline.`}
        </p>
      )}
    </div>
  );
}

function Detail({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div title={hint}>
      <p className="text-body-sm mb-1" style={{ color: 'var(--text-3)' }}>
        {label}
      </p>
      <div className="flex items-center gap-2.5">{children}</div>
    </div>
  );
}

/** Rising burn is amber; sharply rising is orange — it needs an operator. */
function burnTrend(series: { t: string; v: number }[]): 'flat' | 'rising' | 'sharp' {
  if (series.length < 4) return 'flat';
  const first = series[0].v;
  const last = series[series.length - 1].v;
  if (first <= 0) return 'flat';
  const change = (last - first) / first;
  if (change > 0.12) return 'sharp';
  if (change > 0.04) return 'rising';
  return 'flat';
}

const TREND_COLOR = { flat: 'var(--text-2)', rising: 'var(--watch-soft)', sharp: 'var(--act-soft)' } as const;

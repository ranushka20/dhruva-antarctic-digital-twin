// OWNER: Dev B
// Resupply table — ONE row per resource, and that row IS the timeline.
//
// This replaces what used to be two stacked panels: a full-width Gantt and a
// ten-column ledger showing the same thirteen resources twice. Here each row
// is one left-to-right scan: days of supply (± range as text), a bar showing
// how long it lasts against a dashed "ship arrives" line, and the order-by
// date. The bar deliberately carries only those two marks — the range and the
// order date are already the numbers on either side of it.
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
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { SYNC_OPACITY } from '@/lib/freshness';
import { lsodColor } from '@/lib/risk';

const RISK_COLOR = {
  ok: 'var(--ok)',
  watch: 'var(--watch)',
  warning: 'var(--act)',
  critical: 'var(--act)',
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
        <ul className="flex items-center gap-x-6 gap-y-2 flex-wrap mt-3 text-body-sm" style={{ color: 'var(--text-3)' }}>
          <LegendItem label="How long supply lasts">
            <span className="block w-7 h-2 rounded-full" style={{ backgroundColor: 'var(--ok)' }} />
          </LegendItem>
          <LegendItem label="Ship arrives">
            <span className="block h-4 border-l-2 border-dashed" style={{ borderColor: 'var(--text-2)' }} />
          </LegendItem>
          <LegendItem label="Station not reporting (last known)">
            <span
              className="block w-7 h-2 rounded-full"
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
          <span className="block mb-1.5">Supply lasts until…</span>
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
 * Two marks on a shared day axis: how long supply lasts (bar, coloured by
 * risk, hatched when the station is not reporting) and when the ship arrives
 * (dashed line). If the bar stops before the line, it runs out first. The
 * ± range and the order-by date are the numbers either side of the bar.
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
  const shipDay = window && window.latestDay > 0 ? window.earliestDay : null;

  return (
    <span
      className="relative block w-full"
      style={{ height: 20 }}
      title={
        (stale ? 'Last known figure — station not reporting. ' : '')
        + `Supply lasts about ${Math.round(resource.autonomyDays)} days`
        + (window ? `; ship arrives between day ${window.earliestDay} and ${window.latestDay}` : '; no ship scheduled')
      }
    >
      <span className="absolute left-0 right-0" style={{ top: 6, height: 8, backgroundColor: 'var(--track)', borderRadius: 999 }} />
      <span
        className="absolute left-0"
        style={{
          width: pct(resource.autonomyDays) + '%',
          top: 6, height: 8, borderRadius: 999,
          backgroundColor: stale ? 'transparent' : color,
          backgroundImage: stale ? `repeating-linear-gradient(45deg, ${color} 0 3px, transparent 3px 6px)` : undefined,
        }}
      />
      {shipDay !== null && (
        <span
          className="absolute top-0 bottom-0 border-l-2 border-dashed"
          style={{ left: pct(shipDay) + '%', borderColor: 'var(--text-2)' }}
        />
      )}
    </span>
  );
}

/** Everything the old ten-column ledger showed, one click down. */
function RowDetail({
  resource, onRaiseAction, canRaise,
}: { resource: DerivedResource; onRaiseAction: () => void; canRaise: boolean }) {
  const trend = burnTrend(resource.burnSeries12w ?? []);

  return (
    <div className="px-5 pb-5 pt-1" style={{ backgroundColor: 'var(--panel-raised)' }}>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4 pl-9">
        <Detail label="In stock" badge={<ProvenanceBadge measurement={resource.stock} label={resource.name + ' stock'} abbreviated />}>
          <span className="font-mono text-body font-medium tabular-nums" style={{ color: 'var(--text)' }}>
            {typeof resource.stock.value === 'number' ? resource.stock.value.toLocaleString() : '—'}
          </span>
          <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>{resource.unit}</span>
        </Detail>

        <Detail label="Used per day" badge={<ProvenanceBadge measurement={resource.burnRate} label={resource.name + ' burn rate'} abbreviated />}>
          <span className="font-mono text-body font-medium tabular-nums" style={{ color: 'var(--text)' }}>
            {typeof resource.burnRate.value === 'number' ? resource.burnRate.value.toLocaleString() : '—'}
          </span>
          <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>{resource.unit}</span>
          {trend !== 'flat' && (
            <span className="text-body-sm" style={{ color: 'var(--watch-soft)' }} title="Compared with 12 weeks ago">
              {trend === 'sharp' ? 'rising fast' : 'rising'}
            </span>
          )}
        </Detail>

        <Detail label="Left when the ship arrives" hint="Worst-case days of supply remaining at the ship's latest arrival">
          <span className="font-mono text-body font-medium tabular-nums" style={{ color: resource.marginDays && resource.marginDays.min < 0 ? 'var(--act-soft)' : 'var(--text)' }}>
            {resource.marginDays
              ? `${resource.marginDays.min < 0 ? '−' : '+'}${Math.abs(Math.round(resource.marginDays.min))}`
              : '—'}
          </span>
          {resource.marginDays && <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>days</span>}
        </Detail>

        <Detail label="Reorder at">
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

function Detail({ label, hint, badge, children }: { label: string; hint?: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div title={hint}>
      <p className="flex items-center gap-2 text-body-sm mb-1" style={{ color: 'var(--text-3)' }}>
        {label}
        {badge}
      </p>
      <div className="flex items-center gap-2.5">{children}</div>
    </div>
  );
}

/** Burn-rate trend over the last 12 weeks. */
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


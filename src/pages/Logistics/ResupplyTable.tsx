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
import { STATION_CODE } from '@/state/stationScope';
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
        className="p-4"
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
      {/* ---- Column header, with the shared day axis over the bar column ---- */}
      <div
        className="hidden md:flex items-end gap-3 px-4 pt-3 pb-2 shrink-0"
        style={{ borderBottom: '1px solid var(--line-strong)' }}
      >
        <span className="w-[13px] shrink-0" />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] w-[190px] shrink-0" style={{ color: 'var(--text-4)' }}>
          Resource
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] w-[96px] shrink-0" style={{ color: 'var(--text-4)' }}>
          Autonomy
        </span>
        <span className="flex-1 min-w-[180px]">
          <span className="block font-mono text-[9px] uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--text-4)' }}>
            Cover, and when the ship can reach it
          </span>
          <Axis horizonDays={horizonDays} />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] w-[58px] shrink-0 text-right" style={{ color: 'var(--text-4)' }}>
          Order by
        </span>
        <span className="w-4 shrink-0" />
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

      <p className="font-mono text-[9px] px-4 py-2.5 shrink-0" style={{ color: 'var(--text-4)', borderTop: '1px solid var(--line)' }}>
        Autonomy always carries its ± band. A station we cannot currently reach gets a hatched
        bar and no order-by date — a stale input never produces a confident deadline.
      </p>
    </section>
  );
}

function Axis({ horizonDays }: { horizonDays: number }) {
  const ticks = [0, 90, 180, 270, 365].filter((t) => t <= horizonDays);
  return (
    <span className="relative block h-3">
      {ticks.map((t) => (
        <span
          key={t}
          className="absolute font-mono text-[8.5px] -translate-x-1/2"
          style={{ left: (t / horizonDays) * 100 + '%', color: 'var(--text-4)' }}
        >
          {t === 0 ? 'today' : t + 'd'}
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
        className="w-full flex flex-wrap md:flex-nowrap items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--panel-raised)]"
        style={{ backgroundColor: expanded ? 'var(--panel-raised)' : 'transparent' }}
      >
        <span className="w-[13px] shrink-0 flex justify-center">
          <StatusDot status={resource.risk === 'critical' ? 'warning' : resource.risk} size={7} />
        </span>

        <span className="w-[190px] shrink-0 min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-[12.5px] truncate" style={{ color: 'var(--text)' }}>{resource.name}</span>
            {resource.belowReorder && (
              <span
                className="font-mono text-[8px] uppercase tracking-[0.06em] px-1 py-0.5 rounded shrink-0"
                style={{ color: 'var(--act-soft)', border: '1px solid rgba(242,107,33,0.45)' }}
              >
                Reorder
              </span>
            )}
          </span>
          <span className="font-mono text-[9px]" style={{ color: 'var(--text-4)' }}>
            {STATION_CODE[resource.stationId]}
          </span>
        </span>

        <span className="w-[96px] shrink-0 font-mono text-[12px] tabular-nums" style={{ color: 'var(--text-2)' }}>
          {Math.round(resource.autonomyDays)} ±{Math.round(resource.autonomyBandDays)} d
        </span>

        <span className="flex-1 min-w-[180px] w-full md:w-auto">
          <CoverBar resource={resource} window={window} horizonDays={horizonDays} />
        </span>

        <span
          className="w-[58px] shrink-0 text-right font-mono text-[12px] tabular-nums"
          style={{ color: lsodColor(resource.lsodDays) }}
        >
          {resource.lsodDays === null
            ? (resource.lsodUnavailableReason === 'no-voyage' ? 'no ship' : 'stale')
            : Math.round(resource.lsodDays) + ' d'}
        </span>

        <span className="w-4 shrink-0" style={{ color: 'var(--text-4)' }}>
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
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
      style={{ height: 18 }}
      title={
        stale
          ? 'Station link is stale — cover shown from last known state, no order-by date'
          : `Cover ${Math.round(bandLow)}–${Math.round(bandHigh)} d` +
            (window ? ` · ship arrives day ${window.earliestDay}–${window.latestDay}` : '')
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
            opacity: 0.14,
            borderLeft: '1px solid rgba(79,209,165,0.45)',
          }}
        />
      )}

      {/* Track */}
      <span
        className="absolute left-0 right-0"
        style={{ top: 7, height: 4, backgroundColor: 'var(--track)', borderRadius: 999 }}
      />

      {/* Uncertainty band — never a bare point estimate */}
      <span
        className="absolute"
        style={{
          left: pct(bandLow) + '%',
          width: Math.max(0.6, pct(bandHigh) - pct(bandLow)) + '%',
          top: 4, height: 10,
          backgroundColor: color, opacity: 0.2, borderRadius: 3,
        }}
      />

      {/* Depletion bar */}
      <span
        className="absolute left-0"
        style={{
          width: pct(resource.autonomyDays) + '%',
          top: 7, height: 4,
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
            top: 1, width: 2, height: 16,
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
    <div className="px-4 pb-3.5 pt-0.5" style={{ backgroundColor: 'var(--panel-raised)' }}>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-3 pl-[16px]">
        <Detail label="Stock">
          <span className="font-mono text-[12px] tabular-nums" style={{ color: 'var(--text-2)' }}>
            {typeof resource.stock.value === 'number' ? resource.stock.value.toLocaleString() : '—'}{' '}
            <span style={{ color: 'var(--text-4)' }}>{resource.unit}</span>
          </span>
          <ProvenanceBadge measurement={resource.stock} label={resource.name + ' stock'} />
        </Detail>

        <Detail label="Burn / day">
          <span className="font-mono text-[12px] tabular-nums" style={{ color: TREND_COLOR[trend] }}>
            {typeof resource.burnRate.value === 'number' ? resource.burnRate.value.toLocaleString() : '—'}
          </span>
          <Sparkline series={series} width={56} height={18} />
          <ProvenanceBadge measurement={resource.burnRate} label={resource.name + ' burn rate'} />
        </Detail>

        <Detail label="Margin to ship">
          <span className="font-mono text-[12px] tabular-nums" style={{ color: 'var(--text-2)' }}>
            {resource.marginDays
              ? `${resource.marginDays.min < 0 ? '−' : '+'}${Math.abs(Math.round(resource.marginDays.min))} d`
              : '—'}
          </span>
        </Detail>

        <Detail label="Reorder point">
          <span className="font-mono text-[12px] tabular-nums" style={{ color: 'var(--text-2)' }}>
            {resource.reorderPoint?.toLocaleString() ?? '—'}{' '}
            <span style={{ color: 'var(--text-4)' }}>{resource.unit}</span>
          </span>
        </Detail>

        <button
          type="button"
          disabled={!canRaise}
          onClick={onRaiseAction}
          className="ml-auto text-[11.5px] font-medium px-3 py-1.5 rounded-full self-center min-h-[34px]"
          style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', fontFamily: 'var(--font-body)', opacity: canRaise ? 1 : 0.4 }}
        >
          Raise action
        </button>
      </div>

      {resource.lsodDays === null && (
        <p className="text-[11px] mt-2.5 pl-[16px]" style={{ color: 'var(--watch-soft)' }}>
          {resource.lsodUnavailableReason === 'no-voyage'
            ? 'No voyage configured for this season, so there is no date to be late for. Autonomy still computes.'
            : `${STATION_CODE[resource.stationId]} has not reported since its last sync. Cover above is last-known; an order-by date from a stale input would be a guess presented as a deadline.`}
        </p>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--text-4)' }}>
        {label}
      </p>
      <div className="flex items-center gap-2">{children}</div>
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

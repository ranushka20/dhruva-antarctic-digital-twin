// OWNER: Dev B
// Resource watch — both stations in one table, ranked by Last Safe Order
// Date. A Maitri row must be able to outrank a Bharati one (FR-6.3), and a
// LAGGING/DARK station's LSOD cell reads "stale" rather than inventing a
// confident deadline (FR-6.6).

import { Link, useNavigate } from 'react-router-dom';
import type { DerivedResource } from '@/state/data';
import { StatusDot } from '@/components/shared/StatusDot';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { SYNC_OPACITY } from '@/lib/freshness';
import { lsodColor } from '@/lib/risk';

const RISK_DOT = { ok: 'ok', watch: 'watch', warning: 'warning', critical: 'critical' } as const;

// One grid template for the header and every row, applied only once the card
// itself is wide enough (container query, so it also tracks the text-size
// setting). Below that each row stacks: name first, then labelled figures.
// The old separate Station column is folded into the name cell as a chip.
const ROW_GRID =
  '@min-[40rem]:grid @min-[40rem]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(6.5rem,auto)] @min-[40rem]:items-center @min-[40rem]:gap-x-6';

const COLUMN_HINT = {
  autonomy: 'Autonomy — days of supply left at the current rate of use, with its uncertainty band',
  margin: 'Margin to ship — days of stock still left when the next ship arrives. Negative means it runs out before the ship.',
  lsod: 'Last Safe Order Date (LSOD) — days left to place an order that still arrives in time',
};

/**
 * `limit` keeps the Overview to a summary — the most urgent few, with the
 * full ranked list one click away in Logistics, where it is acted on.
 */
export function ResourceWatch({ resources: all, limit }: { resources: DerivedResource[]; limit?: number }) {
  const navigate = useNavigate();
  const resources = limit ? all.slice(0, limit) : all;

  return (
    <section
      // w-full + min-w-0: as a flex child this section would otherwise size to
      // its content's max width and leave dead space to the right of the card,
      // so it would not line up with the map above it.
      className="@container flex flex-col min-h-0 w-full min-w-0 p-5"
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-card)',
      }}
      aria-label="Resource watch"
    >
      <div className="flex items-start flex-wrap gap-x-4 gap-y-2 mb-4">
        <div className="min-w-0">
          <h2 className="text-title font-semibold" style={{ color: 'var(--text)' }}>
            Supplies to watch
          </h2>
          <p
            className="text-body-sm mt-1 max-w-[70ch]"
            style={{ color: 'var(--text-3)' }}
            title="Sort order: unresolvable deadlines first, then by Last Safe Order Date (LSOD)"
          >
            Both stations, the ones that need ordering soonest first.
          </p>
        </div>
        {limit && all.length > resources.length && (
          <Link
            to="/logistics"
            className="ml-auto inline-flex items-center min-h-9 px-4 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
            style={{ color: 'var(--text-2)', border: '1px solid var(--line-strong)' }}
          >
            See all <span className="font-mono tabular-nums mx-1.5">{all.length}</span> in Logistics →
          </Link>
        )}
      </div>

      {resources.length === 0 ? (
        <EmptyState reason="No resources reported by either station yet." />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div
            className={`hidden ${ROW_GRID} px-4 pb-2.5 mb-2 text-body-sm`}
            style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--line)' }}
            aria-hidden
          >
            <span>Resource</span>
            <span title={COLUMN_HINT.autonomy}>Lasts about</span>
            <span title={COLUMN_HINT.margin}>Margin to next ship</span>
            <span className="text-right" title={COLUMN_HINT.lsod}>Order within</span>
          </div>

          <ul className="flex flex-col gap-2" aria-label="Resources by urgency">
            {resources.map((r) => (
              <li
                key={r.id}
                onClick={() => navigate('/logistics?resource=' + r.id)}
                className={`flex flex-col gap-3 ${ROW_GRID} px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--panel-raised)]`}
                style={{
                  opacity: SYNC_OPACITY[r.syncState],
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-inner)',
                }}
                title={`Open ${r.name} (${STATION_LABEL[r.stationId]}) in Logistics`}
              >
                {/* Resource name + station + reorder flag */}
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 min-w-0">
                  <StatusDot status={RISK_DOT[r.risk]} size={10} />
                  <span className="text-body font-medium break-words min-w-0" style={{ color: 'var(--text)' }}>
                    {r.name}
                  </span>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption shrink-0"
                    style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
                    title={STATION_CODE[r.stationId]}
                  >
                    {STATION_LABEL[r.stationId]}
                  </span>
                  {r.belowReorder && (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium shrink-0"
                      style={{ color: 'var(--act-soft)', border: '1px solid rgba(242,107,33,0.4)' }}
                      title="Stock is below the reorder level"
                    >
                      Reorder
                    </span>
                  )}
                </div>

                {/* Figures — a labelled wrap row when narrow, grid cells when wide */}
                <div className="flex flex-wrap items-start gap-x-8 gap-y-3 @min-[40rem]:contents">
                  <div className="min-w-0">
                    <p className="text-caption mb-1 @min-[40rem]:hidden" style={{ color: 'var(--text-3)' }} title={COLUMN_HINT.autonomy}>
                      Lasts about
                    </p>
                    <span className="flex items-center flex-wrap gap-x-2 gap-y-1 text-body-sm" style={{ color: 'var(--text-3)' }}>
                      <span>
                        <span className="font-mono text-body tabular-nums" style={{ color: 'var(--text)' }}>
                          {Math.round(r.autonomyDays)}
                        </span>{' '}
                        <span className="font-mono tabular-nums">±{Math.round(r.autonomyBandDays)}</span> days
                      </span>
                      <ProvenanceBadge measurement={r.stock} label={r.name + ' stock'} />
                    </span>
                  </div>

                  <div className="min-w-[11rem] flex-1 @min-[40rem]:min-w-0">
                    <p className="text-caption mb-1 @min-[40rem]:hidden" style={{ color: 'var(--text-3)' }} title={COLUMN_HINT.margin}>
                      Margin to next ship
                    </p>
                    <MarginBar resource={r} />
                  </div>

                  <div className="min-w-0 @min-[40rem]:text-right">
                    <p className="text-caption mb-1 @min-[40rem]:hidden" style={{ color: 'var(--text-3)' }} title={COLUMN_HINT.lsod}>
                      Order within
                    </p>
                    <span className="text-body-sm" style={{ color: lsodColor(r.lsodDays) }}>
                      {r.lsodDays === null ? (
                        r.lsodUnavailableReason === 'no-voyage' ? (
                          <span title="No voyage is scheduled, so there is no order deadline to compute">No ship scheduled</span>
                        ) : (
                          <span title="The station’s data is too old to compute a safe order date">Data too old</span>
                        )
                      ) : (
                        <>
                          <span className="font-mono text-body tabular-nums">{Math.round(r.lsodDays)}</span> days
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MarginBar({ resource }: { resource: DerivedResource }) {
  if (!resource.marginDays) {
    return (
      <span className="font-mono text-body-sm" style={{ color: 'var(--text-3)' }} title="No margin can be computed for this resource">
        —
      </span>
    );
  }
  const { min } = resource.marginDays;
  const tone = min < 0 ? 'act' : min <= 21 ? 'watch' : 'ok';
  const scale = 120; // days; beyond this the bar is simply full
  return (
    <span className="flex items-center gap-3">
      <ProgressBar
        value={Math.min(Math.abs(min), scale)}
        max={scale}
        tone={tone}
        height={8}
        hatched={resource.syncState !== 'LIVE'}
        label={`Margin to ship for ${resource.name}`}
      />
      <span className="text-body-sm shrink-0 whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
        <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>
          {min < 0 ? '−' : '+'}{Math.abs(Math.round(min))}
        </span>{' '}
        days
      </span>
    </span>
  );
}

// OWNER: Dev B
// Resource watch — both stations in one table, ranked by Last Safe Order
// Date. A Maitri row must be able to outrank a Bharati one (FR-6.3), and a
// LAGGING/DARK station's LSOD cell reads "stale" rather than inventing a
// confident deadline (FR-6.6).

import { useNavigate } from 'react-router-dom';
import type { DerivedResource } from '@/state/data';
import { StatusDot } from '@/components/shared/StatusDot';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE } from '@/state/stationScope';
import { SYNC_OPACITY } from '@/lib/freshness';
import { lsodColor } from '@/lib/risk';

const RISK_DOT = { ok: 'ok', watch: 'watch', warning: 'warning', critical: 'critical' } as const;

export function ResourceWatch({ resources }: { resources: DerivedResource[] }) {
  const navigate = useNavigate();

  return (
    <section
      className="flex flex-col min-h-0 p-4"
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-card)',
      }}
      aria-label="Resource watch"
    >
      <div className="flex items-baseline gap-2.5 mb-3">
        <h2 className="text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>
          Resource watch
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-4)' }}>
          Unresolvable deadlines first, then LSOD
        </span>
      </div>

      {resources.length === 0 ? (
        <EmptyState reason="No resources reported by either station yet." />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr>
                {['Resource', 'Station', 'Autonomy', 'Margin to ship', 'LSOD'].map((h, i) => (
                  <th
                    key={h}
                    className="font-mono text-[9px] uppercase tracking-[0.12em] font-normal pb-2 px-1"
                    style={{
                      color: 'var(--text-4)',
                      textAlign: i >= 2 ? (i === 4 ? 'right' : 'left') : 'left',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate('/logistics?resource=' + r.id)}
                  className="cursor-pointer hover:bg-[var(--panel-raised)]"
                  style={{ opacity: SYNC_OPACITY[r.syncState] }}
                >
                  <td className="py-2 px-1" style={{ borderBottom: '1px solid var(--line)' }}>
                    <span className="flex items-center gap-2">
                      <StatusDot status={RISK_DOT[r.risk]} size={6} />
                      <span className="text-[12.5px]" style={{ color: 'var(--text)' }}>{r.name}</span>
                      {r.belowReorder && (
                        <span
                          className="font-mono text-[8px] tracking-[0.06em] px-1 py-0.5 rounded"
                          style={{ color: 'var(--act-soft)', border: '1px solid rgba(242,107,33,0.4)' }}
                        >
                          REORDER
                        </span>
                      )}
                    </span>
                  </td>

                  <td className="py-2 px-1" style={{ borderBottom: '1px solid var(--line)' }}>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
                      {STATION_CODE[r.stationId]}
                    </span>
                  </td>

                  <td className="py-2 px-1" style={{ borderBottom: '1px solid var(--line)' }}>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-[12px] tabular-nums" style={{ color: 'var(--text-2)' }}>
                        {Math.round(r.autonomyDays)} ±{Math.round(r.autonomyBandDays)} d
                      </span>
                      <ProvenanceBadge measurement={r.stock} label={r.name + ' stock'} />
                    </span>
                  </td>

                  <td className="py-2 px-1 w-32" style={{ borderBottom: '1px solid var(--line)' }}>
                    <MarginBar resource={r} />
                  </td>

                  <td
                    className="py-2 px-1 text-right font-mono text-[11.5px] tabular-nums"
                    style={{ borderBottom: '1px solid var(--line)', color: lsodColor(r.lsodDays) }}
                  >
                    {r.lsodDays === null
                      ? r.lsodUnavailableReason === 'no-voyage' ? 'no voyage' : 'stale'
                      : `${Math.round(r.lsodDays)} d`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MarginBar({ resource }: { resource: DerivedResource }) {
  if (!resource.marginDays) {
    return <span className="font-mono text-[10px]" style={{ color: 'var(--text-4)' }}>—</span>;
  }
  const { min } = resource.marginDays;
  const tone = min < 0 ? 'act' : min <= 21 ? 'watch' : 'ok';
  const scale = 120; // days; beyond this the bar is simply full
  return (
    <span className="flex items-center gap-2">
      <ProgressBar
        value={Math.min(Math.abs(min), scale)}
        max={scale}
        tone={tone}
        hatched={resource.syncState !== 'LIVE'}
        label={`Margin to ship for ${resource.name}`}
      />
      <span className="font-mono text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-3)' }}>
        {min < 0 ? '−' : '+'}{Math.abs(Math.round(min))}d
      </span>
    </span>
  );
}

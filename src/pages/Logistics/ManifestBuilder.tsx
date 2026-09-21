// OWNER: Dev B
// Manifest builder — capacity meter, ranked candidates, and the CARRIED /
// DEFERRED divider that shows exactly where capacity ran out.
//
// The footer count that matters: deferred items whose LSOD falls before the
// FOLLOWING voyage. Those are not "left behind", they are next season's
// emergencies, and they render in orange because someone has to act.

import { useState } from 'react';
import { AlertTriangle, Hand } from 'lucide-react';
import type { Voyage } from '@/shared/contracts';
import type { Candidate } from '@/state/manifest';
import { manifestTotals } from '@/state/manifest';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE } from '@/state/stationScope';
import { synth } from '@/lib/provenance';

interface Props {
  voyage: Voyage | null;
  candidates: Candidate[];
  capacityKg: number;
  onCapacityChange: (kg: number) => void;
  onToggleItem: (resourceId: string, stationId: string) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  compact?: boolean;
}

export function ManifestBuilder({
  voyage, candidates, capacityKg, onCapacityChange, onToggleItem, onGenerate, canGenerate, compact = false,
}: Props) {
  const [capacityInput, setCapacityInput] = useState(String(capacityKg));
  const totals = manifestTotals(candidates, capacityKg);
  const ordered = [...candidates].sort((a, b) => b.score - a.score);
  const firstDeferredIndex = ordered.findIndex((c) => !c.included);

  return (
    <section
      className="flex flex-col min-h-0 p-4"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Manifest builder"
    >
      <div className="flex items-center mb-3">
        <h2 className="text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>Manifest builder</h2>
        {voyage && (
          <span className="font-mono text-[9.5px] ml-2" style={{ color: 'var(--text-3)' }}>
            {voyage.name}
          </span>
        )}
      </div>

      {!voyage ? (
        <EmptyState reason="No voyage configured for this season. Autonomy still computes; a Last Safe Order Date cannot, because there is nothing to be late for." />
      ) : (
        <>
          {/* ---- Capacity meter (FR-4.1) ---- */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <label className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-4)' }}>
                Cargo capacity
              </label>
              <input
                type="number"
                value={capacityInput}
                onChange={(e) => setCapacityInput(e.target.value)}
                onBlur={() => {
                  const n = Number(capacityInput);
                  if (Number.isFinite(n) && n > 0) onCapacityChange(n);
                  else setCapacityInput(String(capacityKg));
                }}
                className="w-24 px-2 py-1 font-mono text-[11px] tabular-nums outline-none"
                style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
                aria-label="Available cargo capacity in kilograms"
              />
              <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>kg</span>
              <ProvenanceBadge
                measurement={synth(capacityKg, 'kg', 'confirmed voyage cargo plan')}
                label="Available cargo capacity"
              />
              <span className="font-mono text-[9px] ml-auto" style={{ color: 'var(--text-4)' }}>
                range {voyage.capacityKg.min.toLocaleString()}–{voyage.capacityKg.max.toLocaleString()} kg
              </span>
            </div>
            <ProgressBar
              value={totals.totalMassKg}
              max={capacityKg}
              tone={totals.remainingKg < 0 ? 'act' : totals.remainingKg < capacityKg * 0.1 ? 'watch' : 'ok'}
              height={6}
              label="Capacity consumed"
            />
            <div className="flex justify-between mt-1 font-mono text-[9.5px] tabular-nums" style={{ color: 'var(--text-3)' }}>
              <span>{totals.totalMassKg.toLocaleString()} kg loaded</span>
              <span style={{ color: totals.remainingKg < 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
                {totals.remainingKg.toLocaleString()} kg remaining
              </span>
            </div>
          </div>

          {/* ---- Ranked candidates (FR-4.2, FR-4.3) ---- */}
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: compact ? 420 : undefined }}>
            {ordered.length === 0 ? (
              <EmptyState reason="Every tracked resource already holds the configured cover. Nothing qualifies for this run." />
            ) : (
              <ol>
                {ordered.map((c, i) => (
                  <li key={c.resourceId + c.stationId}>
                    {i === firstDeferredIndex && firstDeferredIndex > -1 && (
                      <div className="flex items-center gap-2 my-2">
                        <span className="h-px flex-1" style={{ backgroundColor: 'var(--line-strong)' }} />
                        <span className="font-mono text-[9px] tracking-[0.12em]" style={{ color: 'var(--text-4)' }}>
                          DEFERRED — {Math.max(0, totals.remainingKg).toLocaleString()} kg LEFT AT THE CUT
                        </span>
                        <span className="h-px flex-1" style={{ backgroundColor: 'var(--line-strong)' }} />
                      </div>
                    )}
                    <CandidateRow
                      candidate={c}
                      rank={i + 1}
                      onToggle={() => onToggleItem(c.resourceId, c.stationId)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* ---- Footer (FR-4.5, FR-4.7) ---- */}
          <div className="mt-3 pt-2.5" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="flex items-center gap-3 font-mono text-[10px] tabular-nums mb-2 flex-wrap">
              <span style={{ color: 'var(--text-3)' }}>
                BHR {totals.byStation.bharati.toLocaleString()} kg
              </span>
              <span style={{ color: 'var(--text-3)' }}>
                MTR {totals.byStation.maitri.toLocaleString()} kg
              </span>
              <span className="ml-auto" style={{ color: 'var(--text-2)' }}>
                {totals.carried.length} carried · {totals.deferred.length} deferred
              </span>
            </div>

            {totals.deferredAtRisk > 0 && (
              <p className="flex items-start gap-1.5 text-[11px] mb-2" style={{ color: 'var(--act-soft)' }}>
                <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
                {totals.deferredAtRisk} deferred item{totals.deferredAtRisk === 1 ? '' : 's'} run out before
                the following voyage arrives. Those become emergencies, not backlog.
              </p>
            )}

            <button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate || totals.carried.length === 0}
              className="w-full py-2.5 rounded-full text-[12.5px] font-medium min-h-[44px]"
              style={{
                backgroundColor: canGenerate && totals.carried.length > 0 ? 'var(--act)' : 'var(--panel-raised)',
                color: canGenerate && totals.carried.length > 0 ? 'var(--bg)' : 'var(--text-4)',
              }}
            >
              Generate manifest
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function CandidateRow({ candidate, rank, onToggle }: { candidate: Candidate; rank: number; onToggle: () => void }) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-2"
      style={{
        backgroundColor: candidate.included ? 'var(--panel-raised)' : 'transparent',
        borderRadius: 'var(--r-inner)',
        borderLeft: candidate.atRiskIfDeferred && !candidate.included ? '2px solid var(--act)' : '2px solid transparent',
        opacity: candidate.included ? 1 : 0.72,
      }}
    >
      <span className="font-mono text-[9px] w-5 shrink-0" style={{ color: 'var(--text-4)' }}>{rank}</span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-[12px] truncate" style={{ color: 'var(--text)' }}>{candidate.name}</span>
          {candidate.manualOverride && (
            <Hand size={10} style={{ color: 'var(--watch-soft)' }} aria-label="Manual override" />
          )}
        </span>
        <span className="block font-mono text-[9.5px]" style={{ color: 'var(--text-4)' }}>
          {STATION_CODE[candidate.stationId as 'bharati' | 'maitri']} ·{' '}
          {candidate.quantity.toLocaleString()} {candidate.unit} ·{' '}
          {candidate.massKg.toLocaleString()} kg ·{' '}
          {candidate.urgencyBasis === 'lsod'
            ? `LSOD ${Math.round(candidate.lsodDays!)} d`
            : 'ranked on cover — no LSOD while the station is unreachable'}
        </span>
      </span>

      <span className="font-mono text-[10.5px] tabular-nums shrink-0" style={{ color: 'var(--text-2)' }}>
        {candidate.score.toFixed(2)}
      </span>

      <button
        type="button"
        onClick={onToggle}
        className="text-[11px] font-medium px-2.5 py-1 rounded shrink-0 min-h-[30px]"
        style={{
          fontFamily: 'var(--font-body)',
          border: `1px solid ${candidate.included ? 'var(--ok)' : 'var(--line)'}`,
          color: candidate.included ? 'var(--ok-soft)' : 'var(--text-3)',
        }}
        aria-pressed={candidate.included}
      >
        {candidate.included ? 'Carry' : 'Defer'}
      </button>
    </div>
  );
}

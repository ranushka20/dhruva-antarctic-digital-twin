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
import { STATION_LABEL } from '@/state/stationScope';
import { ActiveIndicator } from '@/components/shared/ActiveIndicator';
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
      className="flex flex-col min-h-0 p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Manifest builder"
    >
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-title font-semibold" style={{ color: 'var(--text)' }}>Manifest builder</h2>
        {voyage && (
          <span className="font-mono text-body-sm" style={{ color: 'var(--text-3)' }}>
            {voyage.name}
          </span>
        )}
      </div>

      {!voyage ? (
        <EmptyState reason="No voyage configured for this season. Autonomy still computes; a Last Safe Order Date cannot, because there is nothing to be late for." />
      ) : (
        <>
          {/* ---- Capacity meter (FR-4.1) ---- */}
          <div
            className="mb-5 p-4"
            style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-end gap-4 flex-wrap mb-4">
              <div className="min-w-0">
                <p className="text-body-sm mb-1" style={{ color: 'var(--text-3)' }}>Cargo loaded</p>
                <p className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-headline font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                    {totals.totalMassKg.toLocaleString()} kg
                  </span>
                  <span className="text-body" style={{ color: 'var(--text-3)' }}>
                    of <span className="font-mono tabular-nums">{capacityKg.toLocaleString()}</span> kg capacity
                  </span>
                </p>
              </div>

              <div className="ml-auto flex flex-col items-end gap-1.5">
                <label className="flex items-center gap-2" htmlFor="manifest-capacity">
                  <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>Capacity</span>
                  <input
                    id="manifest-capacity"
                    type="number"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    onBlur={() => {
                      const n = Number(capacityInput);
                      if (Number.isFinite(n) && n > 0) onCapacityChange(n);
                      else setCapacityInput(String(capacityKg));
                    }}
                    className="w-32 h-10 px-3 font-mono text-body tabular-nums outline-none"
                    style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
                    aria-label="Available cargo capacity in kilograms"
                  />
                  <span className="font-mono text-body-sm" style={{ color: 'var(--text-3)' }}>kg</span>
                  <ProvenanceBadge
                    measurement={synth(capacityKg, 'kg', 'confirmed voyage cargo plan')}
                    label="Available cargo capacity"
                  />
                </label>
                <span className="text-caption" style={{ color: 'var(--text-4)' }}>
                  Voyage range <span className="font-mono tabular-nums">{voyage.capacityKg.min.toLocaleString()}–{voyage.capacityKg.max.toLocaleString()}</span> kg
                </span>
              </div>
            </div>

            <ProgressBar
              value={totals.totalMassKg}
              max={capacityKg}
              tone={totals.remainingKg < 0 ? 'act' : totals.remainingKg < capacityKg * 0.1 ? 'watch' : 'ok'}
              height={10}
              label="Capacity consumed"
            />
            <div className="flex justify-between mt-2.5 text-body-sm" style={{ color: 'var(--text-3)' }}>
              <span>
                <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{totals.carried.length}</span> carried
                <span className="mx-2" aria-hidden>·</span>
                <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{totals.deferred.length}</span> deferred
              </span>
              <span style={{ color: totals.remainingKg < 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
                {totals.remainingKg < 0 ? 'Over by ' : ''}
                <span className="font-mono tabular-nums">{Math.abs(totals.remainingKg).toLocaleString()}</span> kg
                {totals.remainingKg < 0 ? '' : ' spare'}
              </span>
            </div>
          </div>

          {/* ---- Ranked candidates (FR-4.2, FR-4.3) ---- */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <h3 className="text-body font-semibold" style={{ color: 'var(--text)' }}>Items by priority</h3>
            <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>
              Highest need first. Switch any item between Carry and Defer.
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: compact ? 460 : undefined }}>
            {ordered.length === 0 ? (
              <EmptyState reason="Every tracked resource already holds the configured cover. Nothing qualifies for this run." />
            ) : (
              <ol className="flex flex-col gap-2">
                {ordered.map((c, i) => (
                  <li key={c.resourceId + c.stationId}>
                    {i === firstDeferredIndex && firstDeferredIndex > -1 && (
                      <div className="flex items-center gap-3 mt-4 mb-2 px-1" role="separator">
                        <span className="h-px w-6" style={{ backgroundColor: 'var(--line-strong)' }} />
                        <span className="text-body-sm font-medium" style={{ color: 'var(--text-2)' }}>
                          Capacity runs out here
                        </span>
                        <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>
                          <span className="font-mono tabular-nums">{Math.max(0, totals.remainingKg).toLocaleString()}</span> kg left — items below are deferred unless they still fit
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
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {(['bharati', 'maitri'] as const).map((id) => (
                <span
                  key={id}
                  className="inline-flex items-baseline gap-2 px-4 py-2 rounded-full text-body-sm"
                  style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', color: 'var(--text-3)' }}
                >
                  {STATION_LABEL[id]}
                  <span className="font-mono tabular-nums" style={{ color: 'var(--text)' }}>
                    {totals.byStation[id].toLocaleString()} kg
                  </span>
                </span>
              ))}
            </div>

            {totals.deferredAtRisk > 0 && (
              <p
                className="flex items-start gap-2.5 text-body mb-4 px-4 py-3"
                style={{ color: 'var(--act-soft)', backgroundColor: 'rgba(242,107,33,0.08)', border: '1px solid rgba(242,107,33,0.35)', borderRadius: 'var(--r-inner)' }}
              >
                <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  <span className="font-mono tabular-nums">{totals.deferredAtRisk}</span> deferred item{totals.deferredAtRisk === 1 ? '' : 's'} will
                  run out before the following voyage arrives. Those become emergencies, not backlog.
                </span>
              </p>
            )}

            <button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate || totals.carried.length === 0}
              className="w-full py-2.5 rounded-full text-body font-semibold min-h-11"
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
  const station = candidate.stationId as 'bharati' | 'maitri';
  const atRisk = candidate.atRiskIfDeferred && !candidate.included;
  const score = Math.max(0, Math.min(1, candidate.score));

  return (
    <div
      className="flex items-center gap-4 pl-4 pr-3 py-3"
      style={{
        backgroundColor: candidate.included ? 'var(--panel-raised)' : 'transparent',
        border: `1px solid ${atRisk ? 'rgba(242,107,33,0.45)' : candidate.included ? 'var(--line)' : 'var(--line)'}`,
        borderStyle: candidate.included ? 'solid' : 'dashed',
        borderRadius: 'var(--r-inner)',
      }}
    >
      <span
        className="w-8 h-8 shrink-0 grid place-items-center rounded-full font-mono text-body-sm tabular-nums"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text-3)' }}
        aria-label={`Priority rank ${rank}`}
      >
        {rank}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-body font-medium truncate" style={{ color: 'var(--text)' }}>{candidate.name}</span>
          {candidate.manualOverride && (
            <span
              className="inline-flex items-center gap-1 text-caption px-2 py-0.5 rounded-full shrink-0"
              style={{ color: 'var(--watch-soft)', border: '1px solid rgba(217,164,65,0.4)' }}
            >
              <Hand size={12} aria-hidden /> Set by hand
            </span>
          )}
        </div>

        <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-body-sm" style={{ color: 'var(--text-3)' }}>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-caption"
            style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
          >
            {STATION_LABEL[station]}
          </span>
          <span>
            <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{candidate.quantity.toLocaleString()}</span> {candidate.unit}
          </span>
          <span>
            <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{candidate.massKg.toLocaleString()}</span> kg
          </span>
          {candidate.urgencyBasis === 'lsod' ? (
            <span title="Last safe order date — the latest this can be ordered and still arrive before stock runs out">
              Order within <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{Math.round(candidate.lsodDays!)}</span> days
            </span>
          ) : (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-caption"
              style={{ border: '1px dashed var(--line-strong)', color: 'var(--text-3)' }}
              title="No last-safe-order date can be computed while the station is unreachable, so this item is ranked on its days of cover instead."
            >
              Station unreachable · ranked on days of cover
            </span>
          )}
          {atRisk && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium"
              style={{ color: 'var(--act-soft)', backgroundColor: 'rgba(242,107,33,0.10)' }}
            >
              <AlertTriangle size={12} aria-hidden /> Runs out before the next ship
            </span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 w-28" aria-label={`Priority score ${score.toFixed(2)}`}>
        <span className="text-caption" style={{ color: 'var(--text-4)' }}>
          Priority <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{candidate.score.toFixed(2)}</span>
        </span>
        <span className="block w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--track)' }} aria-hidden>
          <span className="block h-full rounded-full" style={{ width: `${score * 100}%`, backgroundColor: 'var(--text-3)' }} />
        </span>
      </div>

      {/* Carry / Defer — both options always visible, so the row states what
          it IS rather than offering one ambiguous button. */}
      <div
        data-segmented
        role="group"
        aria-label={`${candidate.name}: carry or defer`}
        className="relative isolate flex items-center p-1 rounded-full shrink-0"
        style={{ border: '1px solid var(--line-strong)' }}
      >
        <button
          type="button"
          aria-pressed={candidate.included}
          onClick={() => { if (!candidate.included) onToggle(); }}
          className="px-3.5 min-h-9 rounded-full text-body-sm font-medium"
          style={{ color: candidate.included ? 'var(--ok-soft)' : 'var(--text-3)' }}
        >
          Carry
        </button>
        <button
          type="button"
          aria-pressed={!candidate.included}
          onClick={() => { if (candidate.included) onToggle(); }}
          className="px-3.5 min-h-9 rounded-full text-body-sm font-medium"
          style={{ color: candidate.included ? 'var(--text-3)' : 'var(--text)' }}
        >
          Defer
        </button>
        <ActiveIndicator
          className="rounded-full"
          style={{
            backgroundColor: candidate.included ? 'rgba(79,174,133,0.16)' : 'var(--panel-alt)',
            boxShadow: candidate.included ? 'inset 0 0 0 1px rgba(79,174,133,0.55)' : 'inset 0 0 0 1px var(--line-strong)',
          }}
        />
      </div>
    </div>
  );
}

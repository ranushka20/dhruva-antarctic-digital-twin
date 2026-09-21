// OWNER: Dev A
// CausalTrace — "Why this matters" cause→effect panel.
// MUST call runCausalTrace() from src/shared/contracts.ts — never compute trace numbers locally.
// The same engine call must produce identical numbers on Twin, Environment, Sandbox,
// and Dev B's Action Centre drawer. See FRONTEND.md §7 + CLAUDE.md §4.

import { runCausalTrace, type CausalTraceInput, type CausalTraceStep } from '@/shared/contracts';
import { ProvenanceBadge } from './ProvenanceBadge';

interface CausalTraceProps {
  input: CausalTraceInput;
  className?: string;
}

export function CausalTrace({ input, className = '' }: CausalTraceProps) {
  const result = runCausalTrace(input);

  return (
    <div
      className={`rounded-xl p-3 ${className}`}
      style={{
        backgroundColor: 'var(--panel-raised)',
        border: '1px solid rgba(79,174,133,0.25)',
      }}
    >
      <h4
        className="font-mono text-[9.5px] uppercase tracking-[0.12em] mb-3"
        style={{ color: 'var(--ok-soft)' }}
      >
        Why this matters
      </h4>

      <div className="space-y-1.5">
        {result.steps.map((step: CausalTraceStep, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="font-mono text-[10px] w-24 shrink-0"
              style={{ color: 'var(--text-3)' }}
            >
              {step.label}
            </span>
            <span
              className="font-mono text-[12px] tabular-nums"
              style={{ color: 'var(--text)' }}
              title={step.formula}
            >
              {step.value.value !== null
                ? `${typeof step.value.value === 'number' ? step.value.value.toFixed(1) : step.value.value} ${step.value.unit}`
                : '—'}
            </span>
            <ProvenanceBadge measurement={step.value} />
          </div>
        ))}
      </div>

      {/* Operational consequence */}
      <div
        className="mt-3 pt-2 flex items-center gap-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span className="font-mono text-[10px] uppercase" style={{ color: 'var(--text-3)' }}>
          Autonomy
        </span>
        <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
          {result.autonomyDays === Infinity ? '∞' : `${Math.round(result.autonomyDays)} ±${Math.round(result.autonomyBandDays)} d`}
        </span>
        {result.lsodDays !== null && (
          <>
            <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>
              LSOD
            </span>
            <span
              className="font-mono text-[13px] font-semibold tabular-nums"
              style={{ color: result.lsodDays <= 14 ? 'var(--act-soft)' : result.lsodDays <= 45 ? 'var(--watch-soft)' : 'var(--text)' }}
            >
              {Math.round(result.lsodDays)} d
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// OWNER: Dev B
// Reconciliation — where HQ and a station both changed the same object while
// disconnected.
//
// The rule is stated on screen, not just implemented (FR-4.3): higher-tier
// actor wins, ties resolve to the station as the side closer to ground truth.
// The losing version is preserved as superseded, never deleted (FR-4.4) —
// an operator overriding the rule records a reason, and that too joins the
// chain.

import { useState } from 'react';
import type { Conflict } from '@/shared/contracts';
import { EmptyState } from '@/components/shared/EmptyState';
import { Modal } from '@/components/shared/Modal';
import { formatShortIST } from '@/lib/time';

interface Props {
  conflicts: Conflict[];
  canResolve: boolean;
  onResolve: (objectId: string, as: 'hq' | 'station', reason?: string) => void;
}

export function Reconciliation({ conflicts, canResolve, onResolve }: Props) {
  const [override, setOverride] = useState<{ conflict: Conflict; as: 'hq' | 'station' } | null>(null);
  const [reason, setReason] = useState('');

  const pending = conflicts.filter((c) => !c.resolvedAs);
  const resolved = conflicts.filter((c) => c.resolvedAs);

  return (
    <section
      className="flex flex-col min-h-0 p-4"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Reconciliation"
    >
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>Reconciliation</h2>
        <span className="font-mono text-[10px]" style={{ color: pending.length ? 'var(--watch-soft)' : 'var(--text-3)' }}>
          {pending.length} awaiting resolution
        </span>
      </div>

      <p className="font-mono text-[9.5px] mb-3" style={{ color: 'var(--text-4)' }}>
        Rule: the higher-tier actor wins; ties resolve to the station, as the side closer to ground
        truth. The losing version is kept as superseded.
      </p>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5">
        {conflicts.length === 0 ? (
          <EmptyState reason="No conflicts. HQ and both stations agree on every object that changed during the last gap." />
        ) : (
          <>
            {pending.map((c) => (
              <ConflictCard
                key={c.objectId}
                conflict={c}
                canResolve={canResolve}
                onApplyRule={() => onResolve(c.objectId, c.defaultResolution)}
                onOverride={(as) => { setOverride({ conflict: c, as }); setReason(''); }}
              />
            ))}
            {resolved.map((c) => (
              <ConflictCard key={c.objectId} conflict={c} canResolve={false} />
            ))}
          </>
        )}
      </div>

      <Modal
        open={override !== null}
        onClose={() => setOverride(null)}
        title="Override the reconciliation rule"
      >
        <p className="text-[11.5px] mb-3" style={{ color: 'var(--text-3)' }}>
          You are choosing the {override?.as === 'hq' ? 'HQ' : 'station'} version against the default
          rule. The reason is appended to the audit chain alongside both versions.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Why does this version win?"
          className="w-full px-3 py-2 text-[12px] outline-none mb-3"
          style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
        />
        <button
          type="button"
          disabled={!reason.trim()}
          onClick={() => {
            if (override) onResolve(override.conflict.objectId, override.as, reason);
            setOverride(null);
          }}
          className="w-full py-2.5 rounded-full text-[12.5px] font-medium min-h-[44px]"
          style={{
            backgroundColor: reason.trim() ? 'var(--act)' : 'var(--panel-raised)',
            color: reason.trim() ? 'var(--bg)' : 'var(--text-4)',
          }}
        >
          Override and record
        </button>
      </Modal>
    </section>
  );
}

function ConflictCard({
  conflict, canResolve, onApplyRule, onOverride,
}: {
  conflict: Conflict;
  canResolve: boolean;
  onApplyRule?: () => void;
  onOverride?: (as: 'hq' | 'station') => void;
}) {
  const resolved = Boolean(conflict.resolvedAs);
  return (
    <article
      className="p-3"
      style={{
        backgroundColor: 'var(--panel-raised)',
        border: `1px ${resolved ? 'solid var(--line)' : 'solid var(--watch)'}`,
        borderRadius: 'var(--r-inner)',
        opacity: resolved ? 0.7 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="font-mono text-[9px] tracking-[0.08em] px-1.5 py-0.5 rounded"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-3)' }}>
          {conflict.objectType.toUpperCase()}
        </span>
        <span className="font-mono text-[10.5px]" style={{ color: 'var(--text-2)' }}>{conflict.objectId}</span>
        <span className="font-mono text-[9px] ml-auto" style={{ color: 'var(--text-4)' }}>
          differs on {conflict.differingFields.join(', ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <VersionBlock
          title="HQ"
          actor={conflict.hqVersion.actor}
          at={conflict.hqVersion.at}
          fields={conflict.hqVersion.fields}
          differing={conflict.differingFields}
          winner={conflict.resolvedAs === 'hq'}
          superseded={resolved && conflict.resolvedAs !== 'hq'}
        />
        <VersionBlock
          title="Station"
          actor={conflict.stationVersion.actor}
          at={conflict.stationVersion.at}
          fields={conflict.stationVersion.fields}
          differing={conflict.differingFields}
          winner={conflict.resolvedAs === 'station'}
          superseded={resolved && conflict.resolvedAs !== 'station'}
        />
      </div>

      {resolved ? (
        <p className="font-mono text-[9.5px] mt-2" style={{ color: 'var(--text-3)' }}>
          Resolved to {conflict.resolvedAs === 'hq' ? 'HQ' : 'station'}
          {conflict.overrideReason ? ' — operator override: ' + conflict.overrideReason : ' by the default rule'}
        </p>
      ) : (
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <button
            type="button"
            disabled={!canResolve}
            onClick={onApplyRule}
            className="px-3 py-1.5 rounded-full font-mono text-[9.5px] tracking-[0.06em] min-h-[34px]"
            style={{ border: '1px solid var(--ok)', color: 'var(--ok-soft)', opacity: canResolve ? 1 : 0.4 }}
          >
            APPLY RULE → {conflict.defaultResolution.toUpperCase()}
          </button>
          <button
            type="button"
            disabled={!canResolve}
            onClick={() => onOverride?.(conflict.defaultResolution === 'hq' ? 'station' : 'hq')}
            className="px-3 py-1.5 rounded-full font-mono text-[9.5px] tracking-[0.06em] min-h-[34px]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-3)', opacity: canResolve ? 1 : 0.4 }}
          >
            OVERRIDE
          </button>
        </div>
      )}
    </article>
  );
}

function VersionBlock({
  title, actor, at, fields, differing, winner, superseded,
}: {
  title: string; actor: string; at: string;
  fields: Record<string, unknown>; differing: string[];
  winner: boolean; superseded: boolean;
}) {
  return (
    <div
      className="p-2"
      style={{
        backgroundColor: 'var(--panel)',
        borderRadius: 'var(--r-inner)',
        border: `1px solid ${winner ? 'var(--ok)' : 'var(--line)'}`,
        opacity: superseded ? 0.6 : 1,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="font-mono text-[9px] tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>{title}</span>
        {superseded && (
          <span className="font-mono text-[8px] px-1 rounded" style={{ border: '1px solid var(--line-strong)', color: 'var(--text-4)' }}>
            SUPERSEDED
          </span>
        )}
      </div>
      <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>{actor}</p>
      <p className="font-mono text-[9px] mb-1.5" style={{ color: 'var(--text-4)' }}>{formatShortIST(at)}</p>
      {Object.entries(fields).map(([k, v]) => (
        <p key={k} className="font-mono text-[9.5px]" style={{ color: differing.includes(k) ? 'var(--watch-soft)' : 'var(--text-4)' }}>
          {k}: {String(v)}
        </p>
      ))}
    </div>
  );
}

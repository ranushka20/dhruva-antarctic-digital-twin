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
      className="flex flex-col min-h-0 min-w-0 p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Reconciliation"
    >
      <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap mb-1.5">
        <h2 className="text-title font-semibold" style={{ color: 'var(--text)' }}>Reconciliation</h2>
        <span className="text-body-sm" style={{ color: pending.length ? 'var(--watch-soft)' : 'var(--text-3)' }}>
          <span className="font-mono tabular-nums">{pending.length}</span> waiting for a decision
        </span>
      </div>

      <p className="text-body-sm mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        When HQ and a station both changed the same record while disconnected, the higher-tier
        person wins; a tie goes to the station, as it is closer to what actually happened. The
        losing version is kept, never deleted.
      </p>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
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
        <p className="text-body mb-4 max-w-[60ch]" style={{ color: 'var(--text-2)' }}>
          You are choosing the {override?.as === 'hq' ? 'HQ' : 'station'} version against the default
          rule. Your reason is saved to the audit record alongside both versions.
        </p>
        <label className="block">
          <span className="block text-body-sm mb-1.5" style={{ color: 'var(--text-3)' }}>Reason</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why does this version win?"
            className="w-full px-4 py-3 text-body outline-none mb-4"
            style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
          />
        </label>
        <button
          type="button"
          disabled={!reason.trim()}
          onClick={() => {
            if (override) onResolve(override.conflict.objectId, override.as, reason);
            setOverride(null);
          }}
          className="w-full px-5 rounded-full text-body font-semibold min-h-10"
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
  const ruleSide = conflict.defaultResolution === 'hq' ? 'HQ' : 'station';
  return (
    <article
      className="p-4"
      style={{
        backgroundColor: 'var(--panel-raised)',
        border: `1px ${resolved ? 'solid var(--line)' : 'solid var(--watch)'}`,
        borderRadius: 'var(--r-inner)',
        opacity: resolved ? 0.7 : 1,
      }}
    >
      <div className="flex items-center gap-x-3 gap-y-1.5 mb-1.5 flex-wrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-caption font-medium capitalize"
          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}>
          {conflict.objectType}
        </span>
        <span className="font-mono text-body-sm" style={{ color: 'var(--text)' }}>{conflict.objectId}</span>
      </div>
      <p className="text-body-sm mb-3" style={{ color: 'var(--text-3)' }}>
        Differs on {conflict.differingFields.join(', ')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <VersionBlock
          title="HQ version"
          actor={conflict.hqVersion.actor}
          at={conflict.hqVersion.at}
          fields={conflict.hqVersion.fields}
          differing={conflict.differingFields}
          winner={conflict.resolvedAs === 'hq'}
          superseded={resolved && conflict.resolvedAs !== 'hq'}
        />
        <VersionBlock
          title="Station version"
          actor={conflict.stationVersion.actor}
          at={conflict.stationVersion.at}
          fields={conflict.stationVersion.fields}
          differing={conflict.differingFields}
          winner={conflict.resolvedAs === 'station'}
          superseded={resolved && conflict.resolvedAs !== 'station'}
        />
      </div>

      {resolved ? (
        <p className="text-body-sm mt-3" style={{ color: 'var(--text-3)' }}>
          Resolved to the {conflict.resolvedAs === 'hq' ? 'HQ' : 'station'} version
          {conflict.overrideReason ? ' — operator override: ' + conflict.overrideReason : ' by the default rule'}
        </p>
      ) : (
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            type="button"
            disabled={!canResolve}
            onClick={onApplyRule}
            className="px-5 rounded-full text-body-sm font-semibold min-h-10"
            style={{ border: '1px solid var(--ok)', color: 'var(--ok-soft)', fontFamily: 'var(--font-body)', opacity: canResolve ? 1 : 0.4 }}
            title={`Apply the default rule: ${conflict.defaultResolution.toUpperCase()} wins`}
          >
            Keep {ruleSide} version (rule)
          </button>
          <button
            type="button"
            disabled={!canResolve}
            onClick={() => onOverride?.(conflict.defaultResolution === 'hq' ? 'station' : 'hq')}
            className="px-4 rounded-full text-body-sm font-medium min-h-9"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)', opacity: canResolve ? 1 : 0.4 }}
            title="Choose the other version and record a reason"
          >
            Override
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
      className="p-3.5 min-w-0"
      style={{
        backgroundColor: 'var(--panel)',
        borderRadius: 'var(--r-inner)',
        border: `1px solid ${winner ? 'var(--ok)' : 'var(--line)'}`,
        opacity: superseded ? 0.6 : 1,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-body-sm font-medium" style={{ color: 'var(--text-2)' }}>{title}</span>
        {superseded && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-caption" style={{ border: '1px solid var(--line-strong)', color: 'var(--text-3)' }}>
            Superseded
          </span>
        )}
      </div>
      <p className="text-body" style={{ color: 'var(--text)' }}>{actor}</p>
      <p className="font-mono text-body-sm tabular-nums mb-2.5" style={{ color: 'var(--text-3)' }}>{formatShortIST(at)}</p>
      <dl className="flex flex-col gap-1">
        {Object.entries(fields).map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2 flex-wrap text-body-sm">
            <dt style={{ color: differing.includes(k) ? 'var(--watch-soft)' : 'var(--text-3)' }}>{k}</dt>
            <dd className="font-mono break-all" style={{ color: differing.includes(k) ? 'var(--watch-soft)' : 'var(--text-2)' }}>
              {String(v)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

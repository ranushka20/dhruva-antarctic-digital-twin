// OWNER: Dev B
// Board view — six columns matching the state machine. Dragging a card
// performs the transition and writes to the audit chain; an illegal move is
// rejected inline with the reason rather than silently snapping back
// (FR-4.3).

import { useState } from 'react';
import type { Action } from '@/shared/contracts';
import { canTransition } from '@/shared/contracts';
import type { DerivedAction } from '@/state/data';
import { TierChip } from '@/components/shared/TierChip';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { formatDuration } from '@/lib/time';
import { SYNC_OPACITY } from '@/lib/freshness';
import { STATE_HINT, STATE_LABEL, TIER_META } from './TierRail';

const COLUMNS: Action['state'][] = [
  'RAISED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'DEFERRED',
];

interface Props {
  actions: DerivedAction[];
  canWrite: boolean;
  onOpen: (id: string) => void;
  onMove: (id: string, to: Action['state']) => Promise<void>;
}

export function ActionBoard({ actions, canWrite, onOpen, onMove }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [rejection, setRejection] = useState<{ column: Action['state']; reason: string } | null>(null);

  const handleDrop = async (to: Action['state']) => {
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const action = actions.find((a) => a.id === id);
    if (!action) return;

    const check = canTransition(action.state, to);
    if (!check.ok) {
      setRejection({ column: to, reason: check.reason });
      setTimeout(() => setRejection(null), 4000);
      return;
    }
    try {
      await onMove(id, to);
      setRejection(null);
    } catch (e) {
      setRejection({ column: to, reason: e instanceof Error ? e.message : 'Transition failed' });
      setTimeout(() => setRejection(null), 5000);
    }
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-2">
      {COLUMNS.map((column) => {
        const cards = actions.filter((a) => a.state === column);
        const rejected = rejection?.column === column;
        return (
          <section
            key={column}
            onDragOver={(e) => { if (canWrite) e.preventDefault(); }}
            onDrop={() => handleDrop(column)}
            className="w-[18rem] shrink-0 flex flex-col p-3"
            style={{
              backgroundColor: 'var(--panel-deep)',
              border: `1px ${rejected ? 'solid var(--act)' : 'solid var(--line)'}`,
              borderRadius: 'var(--r-card)',
            }}
            aria-label={column + ' column'}
          >
            <header className="flex items-center gap-3 px-1.5 pb-2.5" title={`${STATE_HINT[column]} (${column})`}>
              <span className="text-body font-semibold" style={{ color: 'var(--text)' }}>
                {STATE_LABEL[column]}
              </span>
              <span
                className="font-mono text-body-sm tabular-nums ml-auto min-w-[2rem] text-center px-2 py-0.5 rounded-full"
                style={{ color: 'var(--text-2)', backgroundColor: 'var(--panel-raised)' }}
              >
                {cards.length}
              </span>
            </header>

            {rejected && (
              <p
                className="mb-2.5 px-3.5 py-2.5 text-body-sm"
                style={{
                  color: 'var(--act-soft)',
                  backgroundColor: 'rgba(242,107,33,0.10)',
                  borderRadius: 'var(--r-inner)',
                }}
                role="alert"
              >
                {rejection!.reason}
              </p>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5">
              {cards.length === 0 && (
                <p
                  className="px-4 py-4 text-body-sm text-center"
                  style={{ color: 'var(--text-3)', border: '1px dashed var(--line)', borderRadius: 'var(--r-inner)' }}
                >
                  Nothing {STATE_LABEL[column].toLowerCase()} right now.
                </p>
              )}
              {cards.map((a) => (
                <article
                  key={a.id}
                  draggable={canWrite}
                  onDragStart={() => setDragId(a.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onOpen(a.id)}
                  className="p-3.5 cursor-pointer hover:bg-[var(--panel-alt)]"
                  style={{
                    backgroundColor: 'var(--panel-raised)',
                    border: `1px solid ${a.isUnacked && (a.tier === 'T0' || a.tier === 'T1') ? 'rgba(242,107,33,0.30)' : 'var(--line)'}`,
                    borderRadius: 'var(--r-inner)',
                    opacity: SYNC_OPACITY[a.syncState] * (dragId === a.id ? 0.5 : 1),
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="inline-flex items-center gap-1.5" title={`${a.tier} — ${TIER_META[a.tier].label}`}>
                      {a.tier === 'T0' && (
                        <span style={{ width: 9, height: 9, backgroundColor: 'var(--act)', borderRadius: 2 }} aria-hidden />
                      )}
                      <TierChip tier={a.tier} />
                    </span>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-caption font-medium"
                      style={{ backgroundColor: 'var(--panel-alt)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
                      title={STATION_CODE[a.stationId]}
                    >
                      {STATION_LABEL[a.stationId]}
                    </span>
                    <span className="text-body-sm ml-auto" style={{ color: 'var(--text-3)' }} title="How long this action has been open">
                      <span className="font-mono tabular-nums">{formatDuration(a.ageSeconds)}</span>
                    </span>
                  </div>
                  <p className="text-body font-medium mb-2" style={{ color: 'var(--text)' }}>{a.title}</p>
                  {a.consequenceLabel && (
                    <p className="font-mono text-body-sm mb-1.5" style={{ color: 'var(--watch-soft)' }} title="Cost if nobody acts">
                      {a.consequenceLabel}
                    </p>
                  )}
                  <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
                    {a.assignee ? (
                      <>Owner <span style={{ color: 'var(--text-2)' }}>{a.assignee.name}</span></>
                    ) : (
                      'No owner yet'
                    )}
                  </p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

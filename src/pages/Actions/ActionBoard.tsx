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
import { STATION_CODE } from '@/state/stationScope';
import { formatDuration } from '@/lib/time';
import { SYNC_OPACITY } from '@/lib/freshness';

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
    <div className="flex gap-2.5 h-full overflow-x-auto pb-2">
      {COLUMNS.map((column) => {
        const cards = actions.filter((a) => a.state === column);
        const rejected = rejection?.column === column;
        return (
          <section
            key={column}
            onDragOver={(e) => { if (canWrite) e.preventDefault(); }}
            onDrop={() => handleDrop(column)}
            className="w-[232px] shrink-0 flex flex-col p-2"
            style={{
              backgroundColor: 'var(--panel)',
              border: `1px ${rejected ? 'solid var(--act)' : 'solid var(--line)'}`,
              borderRadius: 'var(--r-inner)',
            }}
            aria-label={column + ' column'}
          >
            <header className="flex items-center gap-2 px-1 pb-2">
              <span className="font-mono text-micro tracking-label" style={{ color: 'var(--text-2)' }}>
                {column.replace('_', ' ')}
              </span>
              <span className="font-mono text-caption tabular-nums ml-auto" style={{ color: 'var(--text-4)' }}>
                {cards.length}
              </span>
            </header>

            {rejected && (
              <p
                className="mb-2 px-2 py-1.5 text-caption"
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

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
              {cards.length === 0 && (
                <p className="px-1 py-3 text-caption" style={{ color: 'var(--text-4)' }}>
                  Nothing in {column.replace('_', ' ').toLowerCase()}.
                </p>
              )}
              {cards.map((a) => (
                <article
                  key={a.id}
                  draggable={canWrite}
                  onDragStart={() => setDragId(a.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onOpen(a.id)}
                  className="p-2.5 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--panel-raised)',
                    border: `1px solid ${a.isUnacked && (a.tier === 'T0' || a.tier === 'T1') ? 'rgba(242,107,33,0.30)' : 'var(--line)'}`,
                    borderRadius: 'var(--r-inner)',
                    opacity: SYNC_OPACITY[a.syncState] * (dragId === a.id ? 0.5 : 1),
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TierChip tier={a.tier} />
                    <span className="font-mono text-micro" style={{ color: 'var(--text-3)' }}>
                      {STATION_CODE[a.stationId]}
                    </span>
                    <span className="font-mono text-micro ml-auto" style={{ color: 'var(--text-4)' }}>
                      {formatDuration(a.ageSeconds)}
                    </span>
                  </div>
                  <p className="text-body mb-1.5" style={{ color: 'var(--text)' }}>{a.title}</p>
                  {a.consequenceLabel && (
                    <p className="font-mono text-micro mb-1" style={{ color: 'var(--watch-soft)' }}>
                      {a.consequenceLabel}
                    </p>
                  )}
                  <p className="text-caption" style={{ color: 'var(--text-4)' }}>
                    {a.assignee?.name ?? 'unassigned'}
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

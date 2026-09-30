// OWNER: Dev B
// ActionSteps — the action lifecycle as three plain steps. The Overview flag
// (/), the Action Centre table and the detail drawer all read from here, so
// "where this stands" and "what happens next" can never disagree between them.
//
// The state machine (FR-6.1) has six states; people think in three steps:
//   1 Acknowledge — HQ confirms it has seen this. Stops the response clock (FR-7.1).
//   2 Assign      — a named person from the roster owns it (FR-6.3).
//   3 Resolve     — closed with a note, plus evidence for T0/T1 (FR-6.5).
// IN_PROGRESS is step 3 underway; DEFERRED is a pause, resumed by assigning.

import { Check } from 'lucide-react';
import type { Action } from '@/shared/contracts';
import { formatDateIST, formatDuration, formatShortIST } from '@/lib/time';

export type StepKey = 'ack' | 'assign' | 'resolve';

export const STEPS: { key: StepKey; label: string; verb: string }[] = [
  { key: 'ack', label: 'Acknowledge', verb: 'Acknowledge' },
  { key: 'assign', label: 'Assign', verb: 'Assign owner' },
  { key: 'resolve', label: 'Resolve', verb: 'Resolve' },
];

/** The one step this action needs next, or null once it is resolved. */
export function nextStep(state: Action['state']): StepKey | null {
  switch (state) {
    case 'RAISED': return 'ack';
    case 'ACKNOWLEDGED':
    case 'DEFERRED': return 'assign';
    case 'ASSIGNED':
    case 'IN_PROGRESS': return 'resolve';
    default: return null;
  }
}

/** Any move off RAISED counts as seen — the same rule the SLA clock uses. */
function isDone(action: Action, key: StepKey): boolean {
  if (key === 'ack') return action.state !== 'RAISED';
  if (key === 'assign') {
    return ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].includes(action.state)
      || (action.state === 'DEFERRED' && !!action.assignee);
  }
  return action.state === 'RESOLVED';
}

/** Who did a step and when, read back from the timeline. */
function stepRecord(action: Action, key: StepKey): { by: string; at?: string } | null {
  if (key === 'ack') {
    const entry = action.timeline.find((t) => t.state === 'ACKNOWLEDGED');
    return entry ? { by: entry.by, at: entry.at } : null;
  }
  if (key === 'assign') {
    if (!action.assignee) return null;
    const entry = [...action.timeline].reverse().find((t) => t.state === 'ASSIGNED');
    return { by: action.assignee.name, at: entry?.at };
  }
  return action.resolution ? { by: action.resolution.by, at: action.resolution.at } : null;
}

const needsEvidence = (action: Action) => action.tier === 'T0' || action.tier === 'T1';

/** Where the action stands, in words, plus what to do next. */
export function describeStanding(action: Action): { now: string; next: string | null } {
  const ack = stepRecord(action, 'ack');
  const owner = action.assignee?.name;
  const resolveNext = needsEvidence(action) ? 'Resolve with a note and evidence' : 'Resolve with a note';
  switch (action.state) {
    case 'RAISED':
      return { now: 'Not acknowledged yet', next: 'Acknowledge it' };
    case 'ACKNOWLEDGED':
      return { now: ack ? `Seen by ${ack.by}` : 'Acknowledged', next: 'Assign an owner' };
    case 'ASSIGNED':
      return { now: `${owner ?? 'Someone'} owns this`, next: resolveNext };
    case 'IN_PROGRESS':
      return { now: `${owner ?? 'Someone'} is working on it`, next: resolveNext };
    case 'DEFERRED':
      return {
        now: action.deferral ? `Deferred to ${formatDateIST(action.deferral.reviewDate)}` : 'Deferred',
        next: 'Assign an owner to resume',
      };
    default:
      return { now: action.resolution ? `Resolved by ${action.resolution.by}` : 'Resolved', next: null };
  }
}

/** What the next step does and where it is recorded — shown under the steps. */
export function explainStep(action: Action, key: StepKey): string {
  if (key === 'ack') {
    return `Acknowledging tells the station HQ has seen this. You add a short note on what happens ` +
      `next; it goes into this action's history and the audit log with your name and the time, and ` +
      `the ${formatDuration(action.sla.targetSeconds)} response clock stops.`;
  }
  if (key === 'assign') {
    return 'Pick a named person from the station roster and say what they should do. An action owned ' +
      'by "someone" is owned by nobody.';
  }
  return needsEvidence(action)
    ? `Write what was done. A ${action.tier} action also needs at least one evidence item.`
    : 'Write what was done so the next crew can see how it was closed.';
}

/**
 * The cost-of-inaction line (FR-3.2), never just an echo of the title: a
 * safety label the title already says ("below occupied minimum") becomes the
 * reading against its limit instead. Null when the engine produced none.
 */
export function consequenceText(action: Pick<Action, 'title' | 'consequence'>): string | null {
  const c = action.consequence;
  if (!c) return null;
  if (!action.title.toLowerCase().includes(c.label.toLowerCase())) return c.label;
  return c.kind === 'safety' ? `${c.after} ${c.unit} against a ${c.before} ${c.unit} limit` : null;
}

/** Orange only while the action is waiting on a human to acknowledge it. */
const isUrgentAck = (action: Action) => action.state === 'RAISED';

/** Three short bars — the compact form used on the Overview flag. */
export function StepBars({ action }: { action: Action }) {
  const done = STEPS.filter((s) => isDone(action, s.key)).length;
  const next = nextStep(action.state);
  return (
    <span className="inline-flex items-center gap-1 shrink-0" role="img" aria-label={`${done} of 3 steps done`}>
      {STEPS.map((s) => {
        const complete = isDone(action, s.key);
        const current = s.key === next;
        return (
          <span
            key={s.key}
            className="h-1.5 w-5 rounded-full"
            style={{
              backgroundColor: complete ? 'var(--ok)' : current && isUrgentAck(action) ? 'var(--act)' : 'var(--track)',
              outline: current && !isUrgentAck(action) ? '1px solid var(--text-3)' : 'none',
              outlineOffset: 1,
            }}
          />
        );
      })}
    </span>
  );
}

/** The full three-step tracker used at the top of the detail drawer. */
export function StepTrack({ action }: { action: Action }) {
  const next = nextStep(action.state);
  return (
    <div>
      <ol className="grid grid-cols-3 gap-3">
        {STEPS.map((s, i) => {
          const complete = isDone(action, s.key);
          const current = s.key === next;
          const record = complete ? stepRecord(action, s.key) : null;
          const accent = current && isUrgentAck(action) ? 'var(--act)' : 'var(--text-2)';
          return (
            <li
              key={s.key}
              className="flex flex-col gap-1.5 p-3"
              aria-current={current ? 'step' : undefined}
              style={{
                borderRadius: 'var(--r-inner)',
                backgroundColor: current ? 'var(--panel-raised)' : 'transparent',
                border: `1px solid ${current ? accent : 'var(--line)'}`,
              }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-caption shrink-0"
                  style={{
                    backgroundColor: complete ? 'var(--ok)' : 'transparent',
                    border: complete ? 'none' : `1px solid ${current ? accent : 'var(--line-strong)'}`,
                    color: complete ? 'var(--bg)' : current ? 'var(--text)' : 'var(--text-3)',
                  }}
                  aria-hidden
                >
                  {complete ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className="text-body-sm font-semibold"
                  style={{ color: complete || current ? 'var(--text)' : 'var(--text-3)' }}
                >
                  {s.label}
                </span>
              </span>
              <span className="text-caption leading-snug" style={{ color: 'var(--text-3)' }}>
                {complete ? (
                  record ? (
                    <>
                      <span style={{ color: 'var(--text-2)' }}>{record.by}</span>
                      {record.at && <span className="block font-mono tabular-nums">{formatShortIST(record.at)}</span>}
                    </>
                  ) : 'Done'
                ) : current ? (
                  <span style={{ color: isUrgentAck(action) ? 'var(--act-soft)' : 'var(--text-2)' }}>Next step</span>
                ) : 'Waiting'}
              </span>
            </li>
          );
        })}
      </ol>
      {action.state === 'DEFERRED' && action.deferral && (
        <p className="text-body-sm mt-3" style={{ color: 'var(--watch-soft)' }}>
          Paused until <span className="font-mono tabular-nums">{formatDateIST(action.deferral.reviewDate)}</span>.
          Assign an owner to pick it back up.
        </p>
      )}
      {next && (
        <p className="text-body-sm mt-3 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
          {explainStep(action, next)}
        </p>
      )}
    </div>
  );
}

// OWNER: Dev B
// StepDialog — the one way an action changes state. Acknowledge, assign,
// start, defer and resolve all open this dialog from every surface (drawer,
// table row, "Acknowledge all", the `a` key, a board drop, the Twin zone
// inspector), so every step asks for the same thing: a short note.
//
// Who and when are filled in automatically. The note goes into the action's
// history and the hash-chained audit log (/compliance), sealed inside the
// entry's payload. The contract rejects a step without one, so a caller that
// skips this dialog still cannot write a silent transition.

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Action } from '@/shared/contracts';
import { useActionTransitions } from '@/shared/contracts';
import { Modal } from '@/components/shared/Modal';
import { ROSTER } from '@/state/data';
import { STATION_LABEL } from '@/state/stationScope';
import { currentActor } from '@/state/auth';
import { addDays, formatShortIST } from '@/lib/time';

export type StepKind = 'ack' | 'assign' | 'start' | 'defer' | 'resolve';

/** What to open: one step, applied to one action (or several, for bulk acknowledge). */
export interface StepRequest {
  kind: StepKind;
  actionIds: string[];
}

/** The board's columns map onto the dialog that can legally move a card there. */
export const STEP_FOR_STATE: Partial<Record<Action['state'], StepKind>> = {
  ACKNOWLEDGED: 'ack',
  ASSIGNED: 'assign',
  IN_PROGRESS: 'start',
  DEFERRED: 'defer',
  RESOLVED: 'resolve',
};

const COPY: Record<StepKind, {
  title: string; intro: string; label: string; placeholder: string; picks: string[]; button: string;
}> = {
  ack: {
    title: 'Acknowledge',
    intro: 'Tells the station HQ has seen this. The response clock stops.',
    label: 'What happens next?',
    placeholder: 'e.g. Asking the crew to check the generator before the next shift',
    picks: [
      'Looking into it now',
      'Asking the station crew to check',
      'Waiting for the next readings',
      'Will assign an owner today',
    ],
    button: 'Acknowledge and record',
  },
  assign: {
    title: 'Assign an owner',
    intro: 'A named person from the station roster. An action owned by "someone" is owned by nobody.',
    label: 'What should they do?',
    placeholder: 'e.g. Check the coolant level and report back by 18:00',
    picks: [
      'Check it on site and report back',
      'Fix it and attach evidence',
      'Keep watching and report any change',
    ],
    button: 'Assign and record',
  },
  start: {
    title: 'Start work',
    intro: 'Marks the owner as working on it.',
    label: 'What is being done?',
    placeholder: 'e.g. Replacing the filter on generator #2',
    picks: ['Work has started on site', 'Parts found, work under way'],
    button: 'Start and record',
  },
  defer: {
    title: 'Defer',
    intro: 'A deferral needs a reason and a review date. Both appear in the next crew\'s handover.',
    label: 'Why is it safe to wait?',
    placeholder: 'e.g. Spare arrives with the next voyage; running on generator #1 until then',
    picks: [],
    button: 'Defer and record',
  },
  resolve: {
    title: 'Resolve',
    intro: 'Closes the action. The next crew reads this note to see how it was fixed.',
    label: 'What was done, and how was it confirmed?',
    placeholder: 'e.g. Replaced the contactor; load held at 38 kW for 2 h',
    picks: [],
    button: 'Resolve and record',
  },
};

const fieldStyle = {
  backgroundColor: 'var(--panel-raised)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-inner)',
  color: 'var(--text)',
} as const;

interface Props {
  request: StepRequest | null;
  /** Where to look the requested ids up. */
  actions: Action[];
  onClose: () => void;
}

export function StepDialog({ request, actions, onClose }: Props) {
  const targets = request
    ? request.actionIds.map((id) => actions.find((a) => a.id === id)).filter((a): a is Action => !!a)
    : [];
  const open = !!request && targets.length > 0;
  const title = !open
    ? undefined
    : targets.length > 1
      ? `${COPY[request.kind].title} ${targets.length} actions`
      : `${COPY[request.kind].title} — ${targets[0].title}`;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {open && (
        <StepForm
          key={request.kind + ':' + request.actionIds.join(',')}
          kind={request.kind}
          targets={targets}
          onDone={onClose}
        />
      )}
    </Modal>
  );
}

function StepForm({ kind, targets, onDone }: { kind: StepKind; targets: Action[]; onDone: () => void }) {
  const actor = currentActor();
  const transitions = useActionTransitions('hq', { name: actor.name, role: actor.role });
  const copy = COPY[kind];
  const first = targets[0];

  const [note, setNote] = useState('');
  const [reviewDate, setReviewDate] = useState(addDays(new Date(), 14).slice(0, 10));
  const [ownerId, setOwnerId] = useState<string | null>(first.assignee?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roster = kind === 'assign' ? ROSTER.filter((m) => m.stationId === first.stationId) : [];
  const owner = roster.find((m) => m.id === ownerId);
  const needsEvidence = kind === 'resolve'
    && (first.tier === 'T0' || first.tier === 'T1') && first.evidence.length === 0;

  const missing =
    kind === 'assign' && !owner ? 'Pick an owner.'
    : !note.trim() ? 'Add a short note to continue.'
    : kind === 'defer' && !reviewDate ? 'Pick a review date.'
    : null;
  const blocked = !!missing || needsEvidence || busy;

  const runOne = (a: Action) => {
    const text = note.trim();
    switch (kind) {
      case 'ack': return transitions.acknowledge(a.id, text);
      case 'assign': return transitions.assign(a.id, { id: owner!.id, name: owner!.name, role: owner!.role }, text);
      case 'start': return transitions.start(a.id, text);
      case 'defer': return transitions.defer(a.id, text, new Date(reviewDate).toISOString());
      case 'resolve': return transitions.resolve(a.id, text, a.evidence.map((e) => e.id));
    }
  };

  const submit = async () => {
    if (blocked) return;
    setBusy(true);
    setError(null);
    // One at a time: each step appends to the same hash chain, and each
    // action gets its own entry even when acknowledged in bulk.
    const failed: string[] = [];
    for (const a of targets) {
      try { await runOne(a); } catch (e) {
        failed.push(targets.length > 1 ? `${a.title}: ${e instanceof Error ? e.message : 'failed'}` : (e instanceof Error ? e.message : 'Failed'));
      }
    }
    setBusy(false);
    if (failed.length) setError(failed.join('\n'));
    else onDone();
  };

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
      }}
    >
      <p className="text-body-sm mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>{copy.intro}</p>

      {targets.length > 1 && (
        <ul className="mb-4 flex flex-col gap-1.5 text-body-sm" style={{ color: 'var(--text-2)' }}>
          {targets.slice(0, 5).map((a) => <li key={a.id}>· {a.title}</li>)}
          {targets.length > 5 && (
            <li style={{ color: 'var(--text-3)' }}>
              and <span className="font-mono tabular-nums">{targets.length - 5}</span> more
            </li>
          )}
        </ul>
      )}

      {kind === 'assign' && (
        <>
          <p className="text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
            Owner — {STATION_LABEL[first.stationId]} roster
          </p>
          <ul className="flex flex-col gap-2 mb-4">
            {roster.map((m) => {
              const picked = m.id === ownerId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setOwnerId(m.id)}
                    aria-pressed={picked}
                    className="w-full flex items-center gap-3 flex-wrap px-4 py-2.5 text-left rounded-lg min-h-10 hover:bg-[var(--panel-alt)]"
                    style={{
                      backgroundColor: 'var(--panel-raised)',
                      border: `1px solid ${picked ? 'var(--text-2)' : 'var(--line)'}`,
                    }}
                  >
                    <span className="w-4 shrink-0" aria-hidden>
                      {picked && <Check size={16} style={{ color: 'var(--text)' }} />}
                    </span>
                    <span className="text-body font-medium" style={{ color: 'var(--text)' }}>{m.name}</span>
                    <span className="text-body-sm ml-auto" style={{ color: 'var(--text-3)' }}>{m.role}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <label htmlFor={`step-note-${kind}`} className="block text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
        {copy.label}
      </label>
      {copy.picks.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2.5">
          {copy.picks.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setNote(p)}
              aria-pressed={note === p}
              className="px-3.5 min-h-9 text-body-sm rounded-full"
              style={{
                backgroundColor: note === p ? 'var(--panel-raised)' : 'transparent',
                border: `1px solid ${note === p ? 'var(--line-strong)' : 'var(--line)'}`,
                color: note === p ? 'var(--text)' : 'var(--text-2)',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <textarea
        id={`step-note-${kind}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        autoFocus={kind !== 'assign'}
        placeholder={copy.placeholder}
        className="w-full px-4 py-2.5 text-body outline-none mb-4"
        style={fieldStyle}
      />

      {kind === 'defer' && (
        <>
          <label htmlFor="step-review-date" className="block text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
            Review date
          </label>
          <input
            id="step-review-date"
            type="date"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
            className="w-full px-4 min-h-10 text-body font-mono outline-none mb-4"
            style={fieldStyle}
          />
        </>
      )}

      {needsEvidence && (
        <p className="text-body-sm mb-3 max-w-[70ch]" style={{ color: 'var(--act-soft)' }}>
          A {first.tier} action needs at least one evidence item before it can be resolved. Attach one
          from the action's Evidence section first.
        </p>
      )}
      {error && (
        <p className="text-body-sm mb-3 whitespace-pre-line" style={{ color: 'var(--act-soft)' }} role="alert">
          {error}
        </p>
      )}

      {/* What gets written — so nobody has to guess whether this was logged. */}
      <p className="text-body-sm mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        Recorded as <span style={{ color: 'var(--text-2)' }}>{actor.name}</span> at{' '}
        <span className="font-mono tabular-nums">{formatShortIST(new Date())}</span> with your note, in
        {targets.length > 1 ? ' each action\'s' : ' this action\'s'} history and the audit log.
      </p>

      <button
        type="button"
        disabled={blocked}
        onClick={submit}
        title={missing ?? undefined}
        className="w-full py-2.5 rounded-full text-body font-semibold min-h-10"
        style={{
          backgroundColor: blocked ? 'var(--panel-raised)' : 'var(--act)',
          color: blocked ? 'var(--text-3)' : 'var(--bg)',
        }}
      >
        {busy ? 'Recording…' : copy.button}
      </button>
      {missing && !needsEvidence && (
        <p className="text-body-sm mt-2 text-center" style={{ color: 'var(--text-3)' }}>{missing}</p>
      )}
    </div>
  );
}

// OWNER: Dev B
// Action detail drawer — Observe → Understand → Decide → Act → Record, in
// one panel. An action is never just a status: it carries what changed, why
// it matters, who owns it, and what happens if nobody acts.
//
// The CausalTrace here is Dev A's component driven by the shared engine
// through causalTraceInput(), so its numbers are identical to the Twin
// page's for the same station and conditions (touchpoint #10). There is no
// local approximation anywhere in this file.

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Paperclip } from 'lucide-react';
import type { Action } from '@/shared/contracts';
import { useActionTransitions } from '@/shared/contracts';
import { CausalTrace } from '@/components/shared/CausalTrace';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { TierChip } from '@/components/shared/TierChip';
import { EmptyState } from '@/components/shared/EmptyState';
import { Modal } from '@/components/shared/Modal';
import {
  causalTraceInput, getActions, ROSTER, type DerivedAction,
} from '@/state/data';
import { STATION_LABEL } from '@/state/stationScope';
import { formatShortIST, formatDuration, addDays } from '@/lib/time';
import { shortHash } from '@/lib/hashChain';
import { findSimilar } from '@/engine/similarity';
import { currentActor, useCan } from '@/state/auth';
import { formatValue, isUnknown } from '@/lib/provenance';

interface Props {
  action: DerivedAction;
  onClose: () => void;
  /** 'closed' while the drawer plays its exit (see usePresence). */
  state?: 'open' | 'closed';
}

type Dialog = null | 'assign' | 'defer' | 'resolve' | 'evidence';

export function ActionDrawer({ action, onClose, state = 'open' }: Props) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const actor = currentActor();
  const canWrite = useCan('action.transition');
  const transitions = useActionTransitions('hq', { name: actor.name, role: actor.role });

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      setDialog(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transition failed');
    }
  };

  const traceInput = useMemo(
    () => causalTraceInput(action.stationId, { resourceId: action.resourceId, zoneCode: action.zoneCode }),
    [action.stationId, action.resourceId, action.zoneCode]
  );

  const similar = useSimilarActions(action);

  return (
    <>
      <div
        data-overlay
        data-state={state}
        className="m-backdrop fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(10,13,12,0.55)' }}
        onClick={onClose}
      />
      <aside
        data-overlay
        data-state={state}
        className="m-sheet fixed top-0 right-0 bottom-0 z-50 w-[480px] max-w-full flex flex-col"
        style={{
          backgroundColor: 'var(--panel-alt)',
          borderLeft: '1px solid var(--line-strong)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.45)',
        }}
        role="dialog"
        aria-label={'Action detail: ' + action.title}
      >
        {/* ---- Header (FR-5.2) ---- */}
        <header className="px-5 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TierChip tier={action.tier} />
            <span
              className="font-mono text-micro tracking-label px-2 py-0.5 rounded-full"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
            >
              {action.state.replace('_', ' ')}
            </span>
            {action.sla.breached && (
              <span
                className="font-mono text-micro tracking-[0.06em] px-2 py-0.5 rounded-full"
                style={{ border: '1px solid var(--act)', color: 'var(--act-soft)' }}
              >
                SLA +{formatDuration(action.sla.elapsedSeconds - action.sla.targetSeconds)}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto w-8 h-8 flex items-center justify-center rounded-md"
              style={{ color: 'var(--text-3)' }}
              aria-label="Close action detail"
            >
              ✕
            </button>
          </div>

          <h2 className="text-headline font-semibold leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            {action.title}
          </h2>

          <p className="font-mono text-micro tracking-[0.06em] mt-1.5" style={{ color: 'var(--text-3)' }}>
            {STATION_LABEL[action.stationId]}
            {action.zoneCode ? ' › ' + action.zoneCode : ''}
            {action.assetId ? ' › ' + action.assetId : ''}
          </p>

          {action.slaPausedNow && (
            <p className="font-mono text-micro mt-1.5" style={{ color: 'var(--watch-soft)' }}>
              SLA clock paused — {STATION_LABEL[action.stationId]} is DARK. A station cannot breach
              an SLA it could not be told about.
            </p>
          )}
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* ---- Trigger block (FR-5.3) ---- */}
          <Section title="Trigger — what raised this">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-body" style={{ color: 'var(--text-2)' }}>
                {action.trigger.metricName}
              </span>
              <span className="font-mono text-body tabular-nums" style={{ color: 'var(--text)' }}>
                {isUnknown(action.trigger.measurement) ? '—' : formatValue(action.trigger.measurement)}{' '}
                <span style={{ color: 'var(--text-3)' }}>{action.trigger.measurement.unit}</span>
              </span>
              <ProvenanceBadge measurement={action.trigger.measurement} label={action.trigger.metricName} />
            </div>
            {action.trigger.threshold && (
              <p className="font-mono text-caption mt-1.5" style={{ color: 'var(--text-3)' }}>
                against {action.trigger.threshold.label}:{' '}
                {action.trigger.threshold.value} {action.trigger.threshold.unit}
              </p>
            )}
            <p className="text-body-sm mt-2" style={{ color: 'var(--text-3)' }}>{action.reason}</p>
            {action.trigger.measurement.provenance === 'SYNTH' && (
              <p className="text-body-sm mt-2" style={{ color: 'var(--watch-soft)' }}>
                This action was triggered by a synthetic metric — the feed behind it is not
                connected yet, so treat the value as a placeholder, not a reading.
              </p>
            )}
          </Section>

          {/* ---- Causal trace (FR-5.4) — Dev A's component, shared engine ---- */}
          <Section title="Why this matters">
            <CausalTrace input={traceInput} />
            {action.consequence && (
              <p className="font-mono text-body-sm mt-2" style={{ color: 'var(--act-soft)' }}>
                Cost of inaction: {action.consequence.label}
              </p>
            )}
          </Section>

          {/* ---- Timeline (FR-5.5) ---- */}
          <Section title="Timeline">
            {action.timeline.length === 0 ? (
              <EmptyState reason="No recorded transitions yet." />
            ) : (
              <ol className="space-y-2">
                {action.timeline.map((entry, i) => <TimelineRow key={i} entry={entry} />)}
              </ol>
            )}
          </Section>

          {/* ---- Evidence (FR-5.6) ---- */}
          <Section
            title="Evidence"
            aside={
              canWrite && action.state !== 'RESOLVED' ? (
                <button
                  type="button"
                  onClick={() => setDialog('evidence')}
                  className="text-body-sm font-medium px-2.5 py-1 rounded"
                  style={{ border: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
                >
                  Attach
                </button>
              ) : null
            }
          >
            {action.evidence.length === 0 ? (
              <p className="text-body-sm" style={{ color: 'var(--text-4)' }}>
                Nothing attached. T0 and T1 actions need at least one evidence item before they can
                be resolved.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {action.evidence.map((e) => (
                  <li key={e.id} className="flex items-center gap-2">
                    <Paperclip size={11} style={{ color: 'var(--text-4)' }} aria-hidden />
                    <span className="font-mono text-micro w-14 shrink-0" style={{ color: 'var(--text-4)' }}>
                      {e.kind.toUpperCase()}
                    </span>
                    <span className="text-body-sm flex-1 truncate" style={{ color: 'var(--text-2)' }}>
                      {e.label}
                    </span>
                    {e.pendingSync && (
                      <span className="font-mono text-micro uppercase px-1.5 py-0.5 rounded shrink-0"
                        style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}>
                        Pending sync
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* ---- Similar past faults (FR-5.7) ---- */}
          <Section title="Similar past faults">
            {similar.length === 0 ? (
              <p className="text-body-sm" style={{ color: 'var(--text-4)' }}>
                No past record scores above 0.35 against this one. Matching is TF-IDF cosine over
                this platform's own records — no external model, no training claim.
              </p>
            ) : (
              <ul className="space-y-2">
                {similar.map((s) => (
                  <li key={s.actionId} className="flex items-start gap-2">
                    <span className="font-mono text-caption tabular-nums w-9 shrink-0" style={{ color: 'var(--ok-soft)' }}>
                      {s.score.toFixed(2)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-body-sm truncate" style={{ color: 'var(--text-2)' }}>{s.title}</span>
                      <span className="block text-caption" style={{ color: 'var(--text-4)' }}>{s.resolution}</span>
                    </span>
                    <ProvenanceBadge
                      measurement={{
                        value: s.score, unit: 'cosine', timestamp: new Date().toISOString(),
                        source: "TF-IDF over this platform's own records",
                        provenance: s.provenance, freshnessSeconds: 0,
                        awaiting: s.provenance === 'SYNTH' ? 'real maintenance history' : undefined,
                      }}
                      label="Similarity score"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {action.deferral && (
            <Section title="Deferral">
              <p className="text-body-sm" style={{ color: 'var(--text-2)' }}>{action.deferral.reason}</p>
              <p className="font-mono text-caption mt-1" style={{ color: 'var(--watch-soft)' }}>
                review {formatShortIST(action.deferral.reviewDate)}
              </p>
            </Section>
          )}

          {action.resolution && (
            <Section title="Resolution">
              <p className="text-body-sm" style={{ color: 'var(--text-2)' }}>{action.resolution.note}</p>
              <p className="font-mono text-caption mt-1" style={{ color: 'var(--text-4)' }}>
                {action.resolution.by} · {formatShortIST(action.resolution.at)}
              </p>
            </Section>
          )}
        </div>

        {/* ---- Footer bar (FR-5.8) ---- */}
        <footer className="flex items-center gap-2 px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--line)' }}>
          {error && (
            <p className="absolute -mt-10 font-mono text-micro" style={{ color: 'var(--act-soft)' }} role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={!canWrite || action.state === 'RESOLVED' || action.state === 'DEFERRED'}
            onClick={() => setDialog('defer')}
            className="px-3.5 py-2 rounded-full text-body-sm min-h-[40px]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', opacity: canWrite ? 1 : 0.4 }}
          >
            Defer
          </button>
          <button
            type="button"
            disabled={!canWrite || action.state === 'RESOLVED'}
            onClick={() => setDialog('assign')}
            className="px-3.5 py-2 rounded-full text-body-sm min-h-[40px]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', opacity: canWrite ? 1 : 0.4 }}
          >
            Assign
          </button>
          <div className="flex-1" />
          {action.state === 'RAISED' ? (
            <button
              type="button"
              disabled={!canWrite}
              onClick={() => run(() => transitions.acknowledge(action.id, actor.name))}
              className="px-5 py-2 rounded-full text-body font-medium min-h-[40px]"
              style={{ backgroundColor: 'var(--act)', color: 'var(--bg)', opacity: canWrite ? 1 : 0.4 }}
            >
              Acknowledge
            </button>
          ) : (
            <button
              type="button"
              disabled={!canWrite || action.state === 'RESOLVED'}
              onClick={() => setDialog('resolve')}
              className="px-5 py-2 rounded-full text-body font-medium min-h-[40px]"
              style={{
                backgroundColor: action.state === 'RESOLVED' ? 'transparent' : 'var(--act)',
                color: action.state === 'RESOLVED' ? 'var(--text-3)' : 'var(--bg)',
                border: action.state === 'RESOLVED' ? '1px solid var(--line)' : 'none',
                opacity: canWrite ? 1 : 0.4,
              }}
            >
              {action.state === 'RESOLVED' ? 'Resolved' : 'Resolve'}
            </button>
          )}
        </footer>
      </aside>

      <AssignDialog
        open={dialog === 'assign'}
        stationId={action.stationId}
        error={error}
        onClose={() => setDialog(null)}
        onSubmit={(assignee) => run(() => transitions.assign(action.id, assignee))}
      />
      <DeferDialog
        open={dialog === 'defer'}
        error={error}
        onClose={() => setDialog(null)}
        onSubmit={(reason, reviewDate) => run(() => transitions.defer(action.id, reason, reviewDate))}
      />
      <ResolveDialog
        open={dialog === 'resolve'}
        action={action}
        error={error}
        onClose={() => setDialog(null)}
        onSubmit={(note) => run(() => transitions.resolve(action.id, note, action.evidence.map((e) => e.id)))}
      />
      <EvidenceDialog
        open={dialog === 'evidence'}
        error={error}
        onClose={() => setDialog(null)}
        onSubmit={(kind, label) => run(() => transitions.attachEvidence(action.id, { kind, label }))}
      />
    </>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center mb-2">
        <h3 className="font-mono text-micro uppercase tracking-label" style={{ color: 'var(--text-4)' }}>
          {title}
        </h3>
        {aside && <span className="ml-auto">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function TimelineRow({ entry }: { entry: Action['timeline'][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="flex gap-2.5">
      <span
        className="mt-1.5 shrink-0 rounded-full"
        style={{
          width: 7, height: 7,
          backgroundColor: entry.superseded ? 'var(--unknown)' : entry.pendingSync ? 'var(--watch)' : 'var(--ok)',
        }}
        aria-hidden
      />
      <div className="flex-1 min-w-0" style={{ opacity: entry.superseded ? 0.55 : 1 }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-caption tracking-[0.06em]" style={{ color: 'var(--text-2)' }}>
            {entry.state.replace('_', ' ')}
          </span>
          <span className="font-mono text-micro" style={{ color: 'var(--text-4)' }}>
            {formatShortIST(entry.at)} · {entry.by}
          </span>
          {entry.pendingSync && (
            <span className="font-mono text-micro uppercase px-1 py-0.5 rounded"
              style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}>
              Pending sync
            </span>
          )}
          {entry.superseded && (
            <span className="font-mono text-micro uppercase px-1 py-0.5 rounded"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-3)' }}>
              Superseded
            </span>
          )}
        </div>
        {entry.note && (
          <p className="text-body-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{entry.note}</p>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 mt-1 font-mono text-micro"
          style={{ color: 'var(--text-4)' }}
        >
          {open ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
          {open ? entry.hash || '(not yet hashed)' : shortHash(entry.hash)}
        </button>
        {open && entry.prevHash && (
          <p className="font-mono text-micro break-all mt-0.5" style={{ color: 'var(--text-4)' }}>
            prev {entry.prevHash}
          </p>
        )}
      </div>
    </li>
  );
}

/** TF-IDF over this platform's own resolved records, seeded ones included. */
function useSimilarActions(action: DerivedAction): NonNullable<Action['similar']> {
  return useMemo(() => {
    if (action.similar?.length) return action.similar;
    const corpus = getActions('all')
      .filter((a) => a.id !== action.id && a.resolution)
      .map((a) => ({ id: a.id, text: `${a.title} ${a.reason} ${a.trigger.metricName} ${a.resolution?.note ?? ''}` }));
    const hits = findSimilar(
      { id: action.id, text: `${action.title} ${action.reason} ${action.trigger.metricName}` },
      corpus,
      3
    );
    const byId = new Map(getActions('all').map((a) => [a.id, a]));
    return hits.map((h) => {
      const match = byId.get(h.id)!;
      return {
        actionId: h.id,
        title: match.title,
        score: h.score,
        resolution: match.resolution?.note ?? 'no resolution recorded',
        provenance: 'SYNTH' as const,
      };
    });
  }, [action]);
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function AssignDialog({
  open, stationId, error, onClose, onSubmit,
}: {
  open: boolean; stationId: 'bharati' | 'maitri'; error: string | null;
  onClose: () => void; onSubmit: (a: { id: string; name: string; role: string }) => void;
}) {
  const roster = ROSTER.filter((r) => r.stationId === stationId);
  return (
    <Modal open={open} onClose={onClose} title="Assign action">
      <p className="text-body-sm mb-3" style={{ color: 'var(--text-3)' }}>
        Assignment needs a named person or role from the station roster — an action owned by
        "someone" is an action owned by nobody.
      </p>
      <ul className="space-y-1.5">
        {roster.map((member) => (
          <li key={member.id}>
            <button
              type="button"
              onClick={() => onSubmit({ id: member.id, name: member.name, role: member.role })}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left rounded-lg min-h-[44px]"
              style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)' }}
            >
              <span className="text-body" style={{ color: 'var(--text)' }}>{member.name}</span>
              <span className="font-mono text-micro ml-auto" style={{ color: 'var(--text-3)' }}>
                {member.role}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="font-mono text-caption mt-3" style={{ color: 'var(--act-soft)' }}>{error}</p>}
    </Modal>
  );
}

function DeferDialog({
  open, error, onClose, onSubmit,
}: { open: boolean; error: string | null; onClose: () => void; onSubmit: (reason: string, reviewDate: string) => void }) {
  const [reason, setReason] = useState('');
  const [reviewDate, setReviewDate] = useState(addDays(new Date(), 14).slice(0, 10));
  const invalid = !reason.trim() || !reviewDate;

  return (
    <Modal open={open} onClose={onClose} title="Defer action">
      <p className="text-body-sm mb-3" style={{ color: 'var(--text-3)' }}>
        A deferral needs a reason AND a review date. A deferral the next crew does not know about
        is the classic handover failure, so both fields appear in the handover capsule.
      </p>

      <label className="block font-mono text-micro uppercase tracking-label mb-1" style={{ color: 'var(--text-4)' }}>
        Reason
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 text-body outline-none mb-3"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
      />

      <label className="block font-mono text-micro uppercase tracking-label mb-1" style={{ color: 'var(--text-4)' }}>
        Review date
      </label>
      <input
        type="date"
        value={reviewDate}
        onChange={(e) => setReviewDate(e.target.value)}
        className="w-full px-3 py-2 text-body font-mono outline-none mb-3"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
      />

      {invalid && (
        <p className="font-mono text-caption mb-2" style={{ color: 'var(--watch-soft)' }}>
          Both a reason and a review date are required.
        </p>
      )}
      {error && <p className="font-mono text-caption mb-2" style={{ color: 'var(--act-soft)' }}>{error}</p>}

      <button
        type="button"
        disabled={invalid}
        onClick={() => onSubmit(reason, new Date(reviewDate).toISOString())}
        className="w-full py-2.5 rounded-full text-body font-medium min-h-[44px]"
        style={{ backgroundColor: invalid ? 'var(--panel-raised)' : 'var(--act)', color: invalid ? 'var(--text-4)' : 'var(--bg)' }}
      >
        Defer and record
      </button>
    </Modal>
  );
}

function ResolveDialog({
  open, action, error, onClose, onSubmit,
}: { open: boolean; action: DerivedAction; error: string | null; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState('');
  const needsEvidence = (action.tier === 'T0' || action.tier === 'T1') && action.evidence.length === 0;
  const invalid = !note.trim() || needsEvidence;

  return (
    <Modal open={open} onClose={onClose} title="Resolve action">
      <label className="block font-mono text-micro uppercase tracking-label mb-1" style={{ color: 'var(--text-4)' }}>
        Resolution note
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="What was done, and how it was confirmed"
        className="w-full px-3 py-2 text-body outline-none mb-3"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
      />

      {needsEvidence && (
        <p className="font-mono text-caption mb-2" style={{ color: 'var(--act-soft)' }}>
          A {action.tier} action needs at least one evidence item before it can be resolved. Attach
          one from the Evidence section first.
        </p>
      )}
      {error && <p className="font-mono text-caption mb-2" style={{ color: 'var(--act-soft)' }}>{error}</p>}

      <button
        type="button"
        disabled={invalid}
        onClick={() => onSubmit(note)}
        className="w-full py-2.5 rounded-full text-body font-medium min-h-[44px]"
        style={{ backgroundColor: invalid ? 'var(--panel-raised)' : 'var(--act)', color: invalid ? 'var(--text-4)' : 'var(--bg)' }}
      >
        Resolve and record
      </button>
    </Modal>
  );
}

function EvidenceDialog({
  open, error, onClose, onSubmit,
}: { open: boolean; error: string | null; onClose: () => void; onSubmit: (kind: 'photo' | 'reading' | 'note' | 'file', label: string) => void }) {
  const [kind, setKind] = useState<'photo' | 'reading' | 'note' | 'file'>('note');
  const [label, setLabel] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Attach evidence">
      <div className="flex gap-1.5 mb-3">
        {(['note', 'reading', 'photo', 'file'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className="flex-1 py-2 text-body-sm font-medium rounded-full min-h-[40px] capitalize"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: kind === k ? 'var(--panel-raised)' : 'transparent',
              border: `1px solid ${kind === k ? 'var(--line-strong)' : 'var(--line)'}`,
              color: kind === k ? 'var(--text)' : 'var(--text-3)',
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Describe the evidence"
        className="w-full px-3 py-2 text-body outline-none mb-3"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
      />
      {error && <p className="font-mono text-caption mb-2" style={{ color: 'var(--act-soft)' }}>{error}</p>}
      <button
        type="button"
        disabled={!label.trim()}
        onClick={() => onSubmit(kind, label)}
        className="w-full py-2.5 rounded-full text-body font-medium min-h-[44px]"
        style={{ backgroundColor: label.trim() ? 'var(--act)' : 'var(--panel-raised)', color: label.trim() ? 'var(--bg)' : 'var(--text-4)' }}
      >
        Attach
      </button>
    </Modal>
  );
}

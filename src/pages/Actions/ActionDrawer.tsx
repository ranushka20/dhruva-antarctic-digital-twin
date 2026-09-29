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
import { ChevronDown, ChevronRight, Paperclip, X } from 'lucide-react';
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
import { STATE_HINT, STATE_LABEL, TIER_META } from './TierRail';

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
        className="m-sheet fixed top-0 right-0 bottom-0 z-50 w-[36rem] max-w-full flex flex-col"
        style={{
          backgroundColor: 'var(--panel-alt)',
          borderLeft: '1px solid var(--line-strong)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.45)',
        }}
        role="dialog"
        aria-label={'Action detail: ' + action.title}
      >
        {/* ---- Header (FR-5.2) ---- */}
        <header className="px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2.5 flex-wrap mb-3">
            <span className="inline-flex items-center gap-1.5" title={`${action.tier} — ${TIER_META[action.tier].label}`}>
              {action.tier === 'T0' && (
                <span style={{ width: 9, height: 9, backgroundColor: 'var(--act)', borderRadius: 2 }} aria-hidden />
              )}
              <TierChip tier={action.tier} />
              <span className="text-body-sm ml-1" style={{ color: 'var(--text-3)' }}>{TIER_META[action.tier].label}</span>
            </span>
            <span
              className="text-body-sm font-medium px-3 py-0.5 rounded-full"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
              title={`${STATE_HINT[action.state]} (${action.state})`}
            >
              {STATE_LABEL[action.state]}
            </span>
            {action.sla.breached && (
              <span
                className="text-body-sm font-medium px-3 py-0.5 rounded-full"
                style={{ border: '1px solid var(--act)', color: 'var(--act-soft)' }}
                title={`SLA target ${formatDuration(action.sla.targetSeconds)} — past its response-time target`}
              >
                Overdue by <span className="font-mono tabular-nums">{formatDuration(action.sla.elapsedSeconds - action.sla.targetSeconds)}</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--panel-raised)]"
              style={{ color: 'var(--text-2)', border: '1px solid var(--line)' }}
              aria-label="Close action detail"
              title="Close (Esc)"
            >
              <X size={18} aria-hidden />
            </button>
          </div>

          <h2 className="text-headline font-semibold leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            {action.title}
          </h2>

          <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap mt-2 text-body-sm" style={{ color: 'var(--text-3)' }}>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-caption font-medium"
              style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
            >
              {STATION_LABEL[action.stationId]}
            </span>
            {action.zoneCode && (
              <span>Zone <span className="font-mono" style={{ color: 'var(--text-2)' }}>{action.zoneCode}</span></span>
            )}
            {action.assetId && (
              <span>Asset <span className="font-mono" style={{ color: 'var(--text-2)' }}>{action.assetId}</span></span>
            )}
            <span>
              {action.assignee ? (
                <>Owner <span style={{ color: 'var(--text-2)' }}>{action.assignee.name}</span></>
              ) : 'No owner yet'}
            </span>
          </div>

          {action.slaPausedNow && (
            <p
              className="text-body-sm mt-3 px-4 py-2.5"
              style={{ color: 'var(--watch-soft)', backgroundColor: 'rgba(217,164,65,0.08)', borderRadius: 'var(--r-inner)' }}
              title="SLA clock paused"
            >
              The response-time clock is paused — {STATION_LABEL[action.stationId]} is out of contact (DARK).
              A station cannot breach a target it could not be told about.
            </p>
          )}
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* ---- Trigger block (FR-5.3) ---- */}
          <Section title="What raised this">
            <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
              <span className="text-body" style={{ color: 'var(--text-2)' }}>
                {action.trigger.metricName}
              </span>
              <span className="font-mono text-body font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                {isUnknown(action.trigger.measurement) ? '—' : formatValue(action.trigger.measurement)}{' '}
                <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>{action.trigger.measurement.unit}</span>
              </span>
              <ProvenanceBadge measurement={action.trigger.measurement} label={action.trigger.metricName} />
            </div>
            {action.trigger.threshold && (
              <p className="text-body-sm mt-2" style={{ color: 'var(--text-3)' }}>
                Limit ({action.trigger.threshold.label}):{' '}
                <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>
                  {action.trigger.threshold.value} {action.trigger.threshold.unit}
                </span>
              </p>
            )}
            <p className="text-body-sm mt-2.5 max-w-[70ch]" style={{ color: 'var(--text-2)' }}>{action.reason}</p>
            {action.trigger.measurement.provenance === 'SYNTH' && (
              <p
                className="text-body-sm mt-3 px-4 py-2.5"
                style={{ color: 'var(--watch-soft)', backgroundColor: 'rgba(217,164,65,0.08)', borderRadius: 'var(--r-inner)' }}
              >
                This action was triggered by a synthetic metric — the feed behind it is not
                connected yet, so treat the value as a placeholder, not a reading.
              </p>
            )}
          </Section>

          {/* ---- Causal trace (FR-5.4) — Dev A's component, shared engine ---- */}
          <Section title="Why this matters">
            <CausalTrace input={traceInput} hideHeading />
            {action.consequence && (
              <p className="text-body-sm mt-3" style={{ color: 'var(--text-3)' }}>
                Cost if nobody acts:{' '}
                <span className="font-mono text-body-sm font-medium" style={{ color: 'var(--act-soft)' }}>
                  {action.consequence.label}
                </span>
              </p>
            )}
          </Section>

          {/* ---- Timeline (FR-5.5) ---- */}
          <Section title="History">
            {action.timeline.length === 0 ? (
              <EmptyState reason="No recorded transitions yet." />
            ) : (
              <ol className="flex flex-col gap-3">
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
                  className="inline-flex items-center gap-2 text-body-sm font-medium px-3.5 min-h-9 rounded-full hover:bg-[var(--panel-alt)]"
                  style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
                >
                  <Paperclip size={14} aria-hidden /> Attach evidence
                </button>
              ) : null
            }
          >
            {action.evidence.length === 0 ? (
              <p className="text-body-sm max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
                Nothing attached yet. T0 and T1 actions need at least one evidence item before they can
                be resolved.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {action.evidence.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 flex-wrap px-4 py-2.5"
                    style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}
                  >
                    <Paperclip size={15} style={{ color: 'var(--text-3)' }} aria-hidden />
                    <span
                      className="text-caption font-medium px-2 py-0.5 rounded-md capitalize shrink-0"
                      style={{ border: '1px solid var(--line)', color: 'var(--text-2)' }}
                    >
                      {e.kind}
                    </span>
                    <span className="text-body-sm flex-1 min-w-0" style={{ color: 'var(--text)' }}>
                      {e.label}
                    </span>
                    {e.pendingSync && (
                      <span className="text-caption font-medium px-2 py-0.5 rounded-md shrink-0"
                        style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}>
                        Waiting to sync
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
              <p
                className="text-body-sm max-w-[70ch]"
                style={{ color: 'var(--text-3)' }}
                title="Matching is TF-IDF cosine similarity over this platform's own records — no external model, no training claim."
              >
                No past record is a close enough match (similarity score above{' '}
                <span className="font-mono">0.35</span>). Matching only uses this platform's own records.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {similar.map((s) => (
                  <li
                    key={s.actionId}
                    className="flex items-start gap-3 px-4 py-2.5"
                    style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-body-sm font-medium" style={{ color: 'var(--text)' }}>{s.title}</span>
                      <span className="block text-body-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{s.resolution}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0" title="Similarity score (0–1)">
                      <span className="font-mono text-body-sm tabular-nums" style={{ color: 'var(--ok-soft)' }}>
                        {s.score.toFixed(2)}
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
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {action.deferral && (
            <Section title="Deferral">
              <p className="text-body max-w-[70ch]" style={{ color: 'var(--text-2)' }}>{action.deferral.reason}</p>
              <p className="text-body-sm mt-2" style={{ color: 'var(--watch-soft)' }}>
                Review on <span className="font-mono tabular-nums">{formatShortIST(action.deferral.reviewDate)}</span>
              </p>
            </Section>
          )}

          {action.resolution && (
            <Section title="Resolution">
              <p className="text-body max-w-[70ch]" style={{ color: 'var(--text-2)' }}>{action.resolution.note}</p>
              <p className="flex items-center gap-x-4 flex-wrap text-body-sm mt-2" style={{ color: 'var(--text-3)' }}>
                <span>By <span style={{ color: 'var(--text-2)' }}>{action.resolution.by}</span></span>
                <span className="font-mono tabular-nums">{formatShortIST(action.resolution.at)}</span>
              </p>
            </Section>
          )}
        </div>

        {/* ---- Footer bar (FR-5.8) ---- */}
        <footer className="shrink-0 px-6 py-4" style={{ borderTop: '1px solid var(--line)' }}>
          {error && (
            <p
              className="text-body-sm mb-3 px-4 py-2.5"
              style={{ color: 'var(--act-soft)', backgroundColor: 'rgba(242,107,33,0.08)', borderRadius: 'var(--r-inner)' }}
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              disabled={!canWrite || action.state === 'RESOLVED' || action.state === 'DEFERRED'}
              onClick={() => setDialog('defer')}
              className="px-4 min-h-9 rounded-full text-body-sm font-medium hover:bg-[var(--panel-raised)]"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', opacity: canWrite ? 1 : 0.4 }}
            >
              Defer
            </button>
            <button
              type="button"
              disabled={!canWrite || action.state === 'RESOLVED'}
              onClick={() => setDialog('assign')}
              className="px-4 min-h-9 rounded-full text-body-sm font-medium hover:bg-[var(--panel-raised)]"
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
                className="px-6 min-h-10 rounded-full text-body font-semibold"
                style={{ backgroundColor: 'var(--act)', color: 'var(--bg)', opacity: canWrite ? 1 : 0.4 }}
              >
                Acknowledge
              </button>
            ) : (
              <button
                type="button"
                disabled={!canWrite || action.state === 'RESOLVED'}
                onClick={() => setDialog('resolve')}
                className="px-6 min-h-10 rounded-full text-body font-semibold"
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
          </div>
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
    <section
      className="p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
    >
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <h3 className="text-title font-semibold" style={{ color: 'var(--text)' }}>
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
    <li className="flex gap-3">
      <span
        className="mt-1.5 shrink-0 rounded-full"
        style={{
          width: 9, height: 9,
          backgroundColor: entry.superseded ? 'var(--unknown)' : entry.pendingSync ? 'var(--watch)' : 'var(--ok)',
        }}
        aria-hidden
      />
      <div className="flex-1 min-w-0" style={{ opacity: entry.superseded ? 0.55 : 1 }}>
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
          <span className="text-body-sm font-medium" style={{ color: 'var(--text)' }} title={entry.state}>
            {STATE_LABEL[entry.state as Action['state']] ?? entry.state.replace('_', ' ')}
          </span>
          <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>{entry.by}</span>
          <span className="font-mono text-body-sm tabular-nums" style={{ color: 'var(--text-3)' }}>
            {formatShortIST(entry.at)}
          </span>
          {entry.pendingSync && (
            <span className="text-caption font-medium px-2 py-0.5 rounded-md"
              style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}>
              Waiting to sync
            </span>
          )}
          {entry.superseded && (
            <span className="text-caption font-medium px-2 py-0.5 rounded-md"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-3)' }}>
              Superseded
            </span>
          )}
        </div>
        {entry.note && (
          <p className="text-body-sm mt-1 max-w-[70ch]" style={{ color: 'var(--text-2)' }}>{entry.note}</p>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 mt-1 min-h-7 text-caption"
          style={{ color: 'var(--text-3)' }}
          title="Audit-chain fingerprint for this step"
        >
          {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
          <span>Audit record</span>
          <span className="font-mono break-all text-left">{open ? entry.hash || '(not yet hashed)' : shortHash(entry.hash)}</span>
        </button>
        {open && entry.prevHash && (
          <p className="font-mono text-caption break-all mt-1" style={{ color: 'var(--text-3)' }}>
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
      <p className="text-body-sm mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        Assignment needs a named person or role from the station roster — an action owned by
        "someone" is an action owned by nobody.
      </p>
      <ul className="flex flex-col gap-2">
        {roster.map((member) => (
          <li key={member.id}>
            <button
              type="button"
              onClick={() => onSubmit({ id: member.id, name: member.name, role: member.role })}
              className="w-full flex items-center gap-3 flex-wrap px-4 py-2.5 text-left rounded-lg min-h-10 hover:bg-[var(--panel-alt)]"
              style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)' }}
            >
              <span className="text-body font-medium" style={{ color: 'var(--text)' }}>{member.name}</span>
              <span className="text-body-sm ml-auto" style={{ color: 'var(--text-3)' }}>
                {member.role}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-body-sm mt-4" style={{ color: 'var(--act-soft)' }}>{error}</p>}
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
      <p className="text-body-sm mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        A deferral needs a reason AND a review date. A deferral the next crew does not know about
        is the classic handover failure, so both fields appear in the handover capsule.
      </p>

      <label htmlFor="defer-reason" className="block text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
        Reason
      </label>
      <textarea
        id="defer-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="w-full px-4 py-2.5 text-body outline-none mb-4"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
      />

      <label htmlFor="defer-review-date" className="block text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
        Review date
      </label>
      <input
        id="defer-review-date"
        type="date"
        value={reviewDate}
        onChange={(e) => setReviewDate(e.target.value)}
        className="w-full px-4 min-h-10 text-body font-mono outline-none mb-4"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
      />

      {invalid && (
        <p className="text-body-sm mb-3" style={{ color: 'var(--watch-soft)' }}>
          Both a reason and a review date are required.
        </p>
      )}
      {error && <p className="text-body-sm mb-3" style={{ color: 'var(--act-soft)' }}>{error}</p>}

      <button
        type="button"
        disabled={invalid}
        onClick={() => onSubmit(reason, new Date(reviewDate).toISOString())}
        className="w-full py-2.5 rounded-full text-body font-semibold min-h-10"
        style={{ backgroundColor: invalid ? 'var(--panel-raised)' : 'var(--act)', color: invalid ? 'var(--text-3)' : 'var(--bg)' }}
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
      <label htmlFor="resolve-note" className="block text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
        Resolution note
      </label>
      <textarea
        id="resolve-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="What was done, and how it was confirmed"
        className="w-full px-4 py-2.5 text-body outline-none mb-4"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
      />

      {needsEvidence && (
        <p className="text-body-sm mb-3" style={{ color: 'var(--act-soft)' }}>
          A {action.tier} action needs at least one evidence item before it can be resolved. Attach
          one from the Evidence section first.
        </p>
      )}
      {error && <p className="text-body-sm mb-3" style={{ color: 'var(--act-soft)' }}>{error}</p>}

      <button
        type="button"
        disabled={invalid}
        onClick={() => onSubmit(note)}
        className="w-full py-2.5 rounded-full text-body font-semibold min-h-10"
        style={{ backgroundColor: invalid ? 'var(--panel-raised)' : 'var(--act)', color: invalid ? 'var(--text-3)' : 'var(--bg)' }}
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
      <p className="text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Kind of evidence</p>
      <div className="flex gap-2 flex-wrap mb-4">
        {(['note', 'reading', 'photo', 'file'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className="flex-1 px-3.5 py-1.5 text-body-sm font-medium rounded-full min-h-9 capitalize"
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
      <label htmlFor="evidence-label" className="block text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
        Description
      </label>
      <input
        id="evidence-label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Describe the evidence"
        className="w-full px-4 min-h-10 text-body outline-none mb-4"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
      />
      {error && <p className="text-body-sm mb-3" style={{ color: 'var(--act-soft)' }}>{error}</p>}
      <button
        type="button"
        disabled={!label.trim()}
        onClick={() => onSubmit(kind, label)}
        className="w-full py-2.5 rounded-full text-body font-semibold min-h-10"
        style={{ backgroundColor: label.trim() ? 'var(--act)' : 'var(--panel-raised)', color: label.trim() ? 'var(--bg)' : 'var(--text-3)' }}
      >
        Attach
      </button>
    </Modal>
  );
}

// OWNER: Dev B
// PAGE 3 — Action Centre (/actions, drawer at /actions/:actionId).
//
// This is the page that makes Antarasetu a MANAGEMENT platform rather than a
// monitoring one: Observe → Understand → Decide → Act → Record, with every
// transition written to the tamper-evident chain.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Rows3, Search } from 'lucide-react';
import type { Action, Tier } from '@/shared/contracts';
import { useActionTransitions } from '@/shared/contracts';
import { TierFilter } from './TierRail';
import { ActionTable } from './ActionTable';
import { ActionBoard } from './ActionBoard';
import { ActionDrawer } from './ActionDrawer';
import { Modal } from '@/components/shared/Modal';
import { useChainBroken } from '@/components/shared/ChainBanner';
import { getActions, getActionCounts, OPEN_STATES, ROSTER, type ActionCounts, type DerivedAction } from '@/state/data';
import { useStoreValue, useTick } from '@/state/useStore';
import { STATION_LABEL, type StationFilter } from '@/state/stationScope';
import { currentActor, useCan } from '@/state/auth';
import { addDays } from '@/lib/time';
import { ActiveIndicator } from '@/components/shared/ActiveIndicator';
import { usePresence, useLastWhileOpen } from '@/hooks/usePresence';

/**
 * The list is organised by the three steps (see ActionSteps): each tab is
 * "what is waiting on me", with its count shown once, here, and nowhere else.
 */
type StepView = 'open' | 'ack' | 'assign' | 'resolve' | 'deferred' | 'resolved';

const STEP_VIEWS: { id: StepView; label: string; hint: string; states: Action['state'][] }[] = [
  { id: 'open', label: 'All open', hint: 'Everything not yet resolved or deferred, most urgent first.', states: OPEN_STATES },
  { id: 'ack', label: 'To acknowledge', hint: 'Nobody at HQ has confirmed seeing these yet. Their response clock is running.', states: ['RAISED'] },
  { id: 'assign', label: 'To assign', hint: 'Seen, but nobody owns them yet. Give each a named person.', states: ['ACKNOWLEDGED'] },
  { id: 'resolve', label: 'To resolve', hint: 'Someone owns these. Close each with a note once the work is done.', states: ['ASSIGNED', 'IN_PROGRESS'] },
  { id: 'deferred', label: 'Deferred', hint: 'Paused with a reason and a review date.', states: ['DEFERRED'] },
  { id: 'resolved', label: 'Resolved', hint: 'Closed, with who resolved them and how.', states: ['RESOLVED'] },
];

/** Deep links from elsewhere still say ?state=RAISED — map them onto a tab. */
function viewFromState(state: string | null): StepView {
  switch (state) {
    case 'RAISED': return 'ack';
    case 'ACKNOWLEDGED': return 'assign';
    case 'ASSIGNED': case 'IN_PROGRESS': return 'resolve';
    case 'DEFERRED': return 'deferred';
    case 'RESOLVED': return 'resolved';
    default: return 'open';
  }
}

function viewCount(view: StepView, counts: ActionCounts): number {
  if (view === 'open') return counts.open;
  return STEP_VIEWS.find((v) => v.id === view)!.states.reduce((n, st) => n + counts.byState[st], 0);
}

const STATION_TABS: { id: StationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bharati', label: 'Bharati' },
  { id: 'maitri', label: 'Maitri' },
];

export default function ActionsPage() {
  const navigate = useNavigate();
  const { actionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [scope, setScope] = useState<StationFilter>(
    (searchParams.get('station') as StationFilter) ?? 'all'
  );
  const [query, setQuery] = useState('');
  const [tiers, setTiers] = useState<Set<Tier>>(
    () => new Set(searchParams.get('tier') ? [searchParams.get('tier') as Tier] : [])
  );
  const [stepView, setStepView] = useState<StepView>(() => viewFromState(searchParams.get('state')));
  // The nav alert button links to ?state=RAISED while this page may already be open.
  const stateParam = searchParams.get('state');
  useEffect(() => { if (stateParam) setStepView(viewFromState(stateParam)); }, [stateParam]);
  const [breachOnly, setBreachOnly] = useState(false);
  const [view, setView] = useState<'table' | 'board'>('table');
  const [cursorId, setCursorId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ kind: 'assign' | 'defer' | 'resolve'; id: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useTick(60_000);

  const actor = currentActor();
  const canWrite = useCan('action.transition');
  const canBulk = useCan('action.bulk');
  const chainBroken = useChainBroken();
  const transitions = useActionTransitions('hq', { name: actor.name, role: actor.role });

  const allActions = useStoreValue(useCallback(() => getActions(scope), [scope]));
  const counts = useStoreValue(useCallback(() => getActionCounts(scope), [scope]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // The board lays out all six states as columns, so it ignores the step tab.
    const states = view === 'board' ? null : STEP_VIEWS.find((v) => v.id === stepView)!.states;
    return allActions.filter((a) => {
      if (tiers.size > 0 && !tiers.has(a.tier)) return false;
      if (states && !states.includes(a.state)) return false;
      if (breachOnly && !a.sla.breached) return false;
      if (!q) return true;
      return [a.title, a.assetId, a.zoneCode, a.assignee?.name, a.reason, a.trigger.metricName]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [allActions, tiers, stepView, view, breachOnly, query]);

  const open = actionId ? allActions.find((a) => a.id === actionId) : undefined;
  // Keep the drawer mounted through its exit, still showing the action it
  // was opened on. Tracked by id, not object, because store reads return
  // fresh objects.
  const drawer = usePresence(!!open, 160);
  const drawerId = useLastWhileOpen(!!open, open?.id);
  const drawerAction = drawerId ? allActions.find((a) => a.id === drawerId) : undefined;

  // ---- Keyboard (NFR-3.6): j/k move, a acknowledge, Enter open, Esc close ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape' && actionId) { navigate('/actions'); return; }
      if (filtered.length === 0) return;

      const index = cursorId ? filtered.findIndex((a) => a.id === cursorId) : -1;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCursorId(filtered[Math.min(index + 1, filtered.length - 1)]?.id ?? filtered[0].id);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCursorId(filtered[Math.max(index - 1, 0)]?.id ?? filtered[0].id);
      } else if (e.key === 'Enter' && cursorId) {
        e.preventDefault();
        navigate('/actions/' + cursorId);
      } else if (e.key === 'a' && cursorId && canWrite) {
        e.preventDefault();
        transitions.acknowledge(cursorId, actor.name).catch((err) => setToast(err.message));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, cursorId, actionId, navigate, canWrite, transitions, actor.name]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const applyScope = (next: StationFilter) => {
    setScope(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('station'); else params.set('station', next);
    setSearchParams(params, { replace: true });
  };

  const toggle = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  };

  const guarded = async (fn: () => Promise<unknown>) => {
    try { await fn(); } catch (e) { setToast(e instanceof Error ? e.message : 'Transition failed'); }
  };

  // FR-3.6: bulk acknowledge only — never bulk resolve, which needs per-action evidence.
  const bulkAck = async () => {
    for (const a of filtered) {
      if (a.state === 'RAISED') await guarded(() => transitions.acknowledge(a.id, actor.name));
    }
  };

  const applyStepView = (next: StepView) => {
    setStepView(next);
    const params = new URLSearchParams(searchParams);
    params.delete('state');
    setSearchParams(params, { replace: true });
  };
  const activeView = STEP_VIEWS.find((v) => v.id === stepView)!;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Title row ---- */}
      <div className="px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="mb-4 min-w-0">
          <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            Action Centre
          </h1>
          <p className="text-body-sm mt-1" style={{ color: 'var(--text-3)' }}>
            Every action moves through three steps: acknowledge, assign, resolve. Open one for the full picture.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div
            data-segmented
            role="group"
            aria-label="Station"
            className="relative isolate flex items-center gap-1 p-1 rounded-full"
            style={{ border: '1px solid var(--line-strong)' }}
          >
            {STATION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => applyScope(tab.id)}
                aria-pressed={scope === tab.id}
                className="px-4 min-h-9 rounded-full text-body-sm font-medium"
                style={{
                  color: scope === tab.id ? 'var(--bg)' : 'var(--text-2)',
                }}
              >
                {tab.label === 'All' ? 'All stations' : tab.label}
              </button>
            ))}
            <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--text)' }} />
          </div>

          <label className="flex items-center gap-2.5 px-4 min-h-10 rounded-full flex-1 min-w-[14rem] max-w-md"
            style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)' }}>
            <Search size={16} style={{ color: 'var(--text-3)' }} aria-hidden />
            <span className="sr-only">Search actions</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, asset, zone or person"
              className="flex-1 bg-transparent outline-none text-body min-w-0"
              style={{ color: 'var(--text)' }}
            />
          </label>

          <div
            data-segmented
            role="group"
            aria-label="Layout"
            className="relative isolate flex items-center gap-1 p-1 rounded-full ml-auto"
            style={{ border: '1px solid var(--line-strong)' }}
          >
            <button
              type="button"
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
              className="flex items-center gap-2 px-3.5 min-h-9 rounded-full text-body-sm font-medium"
              style={{ color: view === 'table' ? 'var(--text)' : 'var(--text-3)' }}
            >
              <Rows3 size={15} aria-hidden /> List
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              aria-pressed={view === 'board'}
              className="flex items-center gap-2 px-3.5 min-h-9 rounded-full text-body-sm font-medium"
              style={{ color: view === 'board' ? 'var(--text)' : 'var(--text-3)' }}
            >
              <LayoutGrid size={15} aria-hidden /> Board
            </button>
            <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--panel-raised)' }} />
          </div>
        </div>
      </div>

      {toast && (
        <div key={toast} data-tone="error" className="m-toast px-6 py-2.5 shrink-0" role="alert"
          style={{ backgroundColor: 'rgba(242,107,33,0.10)', borderBottom: '1px solid var(--act)' }}>
          <span className="text-body-sm" style={{ color: 'var(--act-soft)' }}>{toast}</span>
        </div>
      )}

      {/* ---- Step tabs: what is waiting, by step (list layout only) ---- */}
      {view === 'table' && (
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Show actions by step">
            {STEP_VIEWS.map((v, i) => {
              const active = v.id === stepView;
              const n = viewCount(v.id, counts);
              const waiting = v.id === 'ack' && n > 0;
              return (
                <span key={v.id} className="contents">
                  {i === 4 && <span className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--line-strong)' }} aria-hidden />}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => applyStepView(v.id)}
                    className="inline-flex items-center gap-2 px-4 min-h-10 rounded-full text-body-sm font-medium hover:bg-[var(--panel-raised)]"
                    style={{
                      backgroundColor: active ? 'var(--text)' : 'transparent',
                      border: `1px solid ${active ? 'var(--text)' : 'var(--line)'}`,
                      color: active ? 'var(--bg)' : 'var(--text-2)',
                    }}
                  >
                    {v.label}
                    <span
                      className="font-mono tabular-nums"
                      style={{ color: active ? 'var(--bg)' : waiting ? 'var(--act-soft)' : 'var(--text-3)' }}
                    >
                      {n}
                    </span>
                  </button>
                </span>
              );
            })}
          </div>
          <p className="text-body-sm mt-2.5" style={{ color: 'var(--text-3)' }}>{activeView.hint}</p>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
        <section
          className="flex-1 min-w-0 min-h-0 p-4 flex flex-col"
          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
        >
          {/* ---- Filters: tier + overdue, and bulk acknowledge on the ack tab ---- */}
          <div className="flex items-center gap-x-4 gap-y-2.5 flex-wrap px-2 pb-3 shrink-0">
            <TierFilter counts={counts} tiers={tiers} onToggleTier={(t) => setTiers((s) => toggle(s, t))} />
            <button
              type="button"
              onClick={() => setBreachOnly((v) => !v)}
              aria-pressed={breachOnly}
              title="Only show actions past their response-time target (SLA breach)"
              className="inline-flex items-center gap-2 px-3.5 min-h-9 rounded-full text-body-sm font-medium"
              style={{
                backgroundColor: breachOnly ? 'rgba(242,107,33,0.12)' : 'transparent',
                border: `1px solid ${breachOnly ? 'var(--act)' : 'var(--line)'}`,
                color: counts.breaching > 0 ? 'var(--act-soft)' : 'var(--text-2)',
              }}
            >
              Overdue only
              <span className="font-mono tabular-nums">{counts.breaching}</span>
            </button>
            {view === 'table' && stepView === 'ack' && filtered.length > 1 && (
              <button
                type="button"
                disabled={!canBulk || chainBroken}
                onClick={bulkAck}
                className="ml-auto inline-flex items-center gap-2 px-4 min-h-9 rounded-full text-body-sm font-medium"
                style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', opacity: canBulk && !chainBroken ? 1 : 0.4 }}
                title={chainBroken ? 'Bulk operations are off while the audit chain is broken' : 'Resolving stays one at a time — each needs its own evidence'}
              >
                Acknowledge all <span className="font-mono tabular-nums">{filtered.length}</span>
              </button>
            )}
          </div>

          <div key={view} className="m-panel flex-1 min-h-0">
          {view === 'table' ? (
            <ActionTable
              actions={filtered}
              cursorId={cursorId}
              canWrite={canWrite}
              emptyReason={stepView === 'open' ? 'No open actions match these filters.' : 'Nothing is waiting at this step.'}
              onOpen={(id) => navigate('/actions/' + id)}
              onAck={(id) => guarded(() => transitions.acknowledge(id, actor.name))}
              onAssign={(id) => setDialog({ kind: 'assign', id })}
              onDefer={(id) => setDialog({ kind: 'defer', id })}
              onResolve={(id) => setDialog({ kind: 'resolve', id })}
            />
          ) : (
            <ActionBoard
              actions={filtered}
              canWrite={canWrite}
              onOpen={(id) => navigate('/actions/' + id)}
              onMove={(id, to) => transitions.transitionTo(id, to).then(() => undefined)}
            />
          )}
          </div>
        </section>
      </div>

      {drawer.mounted && drawerAction && (
        <ActionDrawer action={drawerAction} state={drawer.state} onClose={() => navigate('/actions')} />
      )}

      <QuickDialog
        dialog={dialog}
        actions={allActions}
        onClose={() => setDialog(null)}
        onAssign={(id, a) => guarded(() => transitions.assign(id, a)).then(() => setDialog(null))}
        onDefer={(id, r, d) => guarded(() => transitions.defer(id, r, d)).then(() => setDialog(null))}
        onResolve={(id, note, ev) => guarded(() => transitions.resolve(id, note, ev)).then(() => setDialog(null))}
      />
    </div>
  );
}

/** Row-level Assign / Defer / Resolve without opening the full drawer. */
function QuickDialog({
  dialog, actions, onClose, onAssign, onDefer, onResolve,
}: {
  dialog: { kind: 'assign' | 'defer' | 'resolve'; id: string } | null;
  actions: DerivedAction[];
  onClose: () => void;
  onAssign: (id: string, assignee: { id: string; name: string; role: string }) => void;
  onDefer: (id: string, reason: string, reviewDate: string) => void;
  onResolve: (id: string, note: string, evidenceIds: string[]) => void;
}) {
  const [reason, setReason] = useState('');
  const [reviewDate, setReviewDate] = useState(addDays(new Date(), 14).slice(0, 10));
  const [note, setNote] = useState('');

  useEffect(() => { setReason(''); setNote(''); }, [dialog?.id, dialog?.kind]);

  if (!dialog) return null;
  const action = actions.find((a) => a.id === dialog.id);
  if (!action) return null;

  if (dialog.kind === 'assign') {
    const roster = ROSTER.filter((r) => r.stationId === action.stationId);
    return (
      <Modal open onClose={onClose} title={'Assign — ' + action.title}>
        <p className="text-body-sm mb-4" style={{ color: 'var(--text-3)' }}>
          Choose someone from the {STATION_LABEL[action.stationId]} roster.
        </p>
        <ul className="flex flex-col gap-2">
          {roster.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onAssign(action.id, { id: m.id, name: m.name, role: m.role })}
                className="w-full flex items-center gap-3 flex-wrap px-4 py-2.5 text-left rounded-lg min-h-10 hover:bg-[var(--panel-alt)]"
                style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)' }}
              >
                <span className="text-body font-medium" style={{ color: 'var(--text)' }}>{m.name}</span>
                <span className="text-body-sm ml-auto" style={{ color: 'var(--text-3)' }}>{m.role}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    );
  }

  if (dialog.kind === 'defer') {
    const invalid = !reason.trim() || !reviewDate;
    return (
      <Modal open onClose={onClose} title={'Defer — ' + action.title}>
        <p className="text-body-sm mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
          A deferral without a reason and a review date is rejected — it would vanish from the
          next crew's handover.
        </p>
        <label htmlFor="quick-defer-reason" className="block text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
          Reason
        </label>
        <textarea
          id="quick-defer-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Why is this safe to defer?"
          className="w-full px-4 py-2.5 text-body outline-none mb-4"
          style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
        />
        <label htmlFor="quick-defer-date" className="block text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
          Review date
        </label>
        <input
          id="quick-defer-date"
          type="date"
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
          className="w-full px-4 min-h-10 text-body font-mono outline-none mb-4"
          style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
        />
        <button
          type="button"
          disabled={invalid}
          onClick={() => onDefer(action.id, reason, new Date(reviewDate).toISOString())}
          className="w-full py-2.5 rounded-full text-body font-semibold min-h-10"
          style={{ backgroundColor: invalid ? 'var(--panel-raised)' : 'var(--act)', color: invalid ? 'var(--text-3)' : 'var(--bg)' }}
        >
          Defer and record
        </button>
      </Modal>
    );
  }

  const needsEvidence = (action.tier === 'T0' || action.tier === 'T1') && action.evidence.length === 0;
  return (
    <Modal open onClose={onClose} title={'Resolve — ' + action.title}>
      <label htmlFor="quick-resolve-note" className="block text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
        Resolution note
      </label>
      <textarea
        id="quick-resolve-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="What was done, and how it was confirmed"
        className="w-full px-4 py-2.5 text-body outline-none mb-4"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
      />
      {needsEvidence && (
        <p className="text-body-sm mb-3" style={{ color: 'var(--act-soft)' }}>
          A {action.tier} action needs evidence before it can be resolved — open the action and attach one first.
        </p>
      )}
      <button
        type="button"
        disabled={!note.trim() || needsEvidence}
        onClick={() => onResolve(action.id, note, action.evidence.map((e) => e.id))}
        className="w-full py-2.5 rounded-full text-body font-semibold min-h-10"
        style={{
          backgroundColor: !note.trim() || needsEvidence ? 'var(--panel-raised)' : 'var(--act)',
          color: !note.trim() || needsEvidence ? 'var(--text-3)' : 'var(--bg)',
        }}
      >
        Resolve and record
      </button>
    </Modal>
  );
}

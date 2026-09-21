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
import { TierRail } from './TierRail';
import { ActionTable } from './ActionTable';
import { ActionBoard } from './ActionBoard';
import { ActionDrawer } from './ActionDrawer';
import { Modal } from '@/components/shared/Modal';
import { useChainBroken } from '@/components/shared/ChainBanner';
import { getActions, getActionCounts, ROSTER, type DerivedAction } from '@/state/data';
import { useStoreValue, useTick } from '@/state/useStore';
import { STATION_LABEL, type StationFilter } from '@/state/stationScope';
import { currentActor, useCan } from '@/state/auth';
import { addDays } from '@/lib/time';

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
  const [states, setStates] = useState<Set<Action['state']>>(
    () => new Set(searchParams.get('state') ? [searchParams.get('state') as Action['state']] : [])
  );
  const [breachOnly, setBreachOnly] = useState(false);
  const [view, setView] = useState<'table' | 'board'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    return allActions.filter((a) => {
      if (tiers.size > 0 && !tiers.has(a.tier)) return false;
      if (states.size > 0 && !states.has(a.state)) return false;
      if (breachOnly && !a.sla.breached) return false;
      if (!q) return true;
      return [a.title, a.assetId, a.zoneCode, a.assignee?.name, a.reason, a.trigger.metricName]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [allActions, tiers, states, breachOnly, query]);

  const open = actionId ? allActions.find((a) => a.id === actionId) : undefined;

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

  const bulkAck = async () => {
    for (const id of selectedIds) {
      const a = allActions.find((x) => x.id === id);
      if (a?.state === 'RAISED') await guarded(() => transitions.acknowledge(id, actor.name));
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Title row ---- */}
      <div className="flex items-center gap-3 flex-wrap px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <h1 className="text-[27px] font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Action Centre
        </h1>

        <div className="flex items-center gap-1 ml-2 p-0.5 rounded-full" style={{ border: '1px solid var(--line)' }}>
          {STATION_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => applyScope(tab.id)}
              className="px-3 py-1.5 rounded-full text-[11.5px]"
              style={{
                backgroundColor: scope === tab.id ? 'var(--text)' : 'transparent',
                color: scope === tab.id ? 'var(--bg)' : 'var(--text-3)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 px-3 py-1.5 rounded-full flex-1 min-w-[180px] max-w-xs"
          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)' }}>
          <Search size={13} style={{ color: 'var(--text-4)' }} aria-hidden />
          <span className="sr-only">Search actions</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, asset, zone, assignee"
            className="flex-1 bg-transparent outline-none text-[12px] min-w-0"
            style={{ color: 'var(--text)' }}
          />
        </label>

        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tabular-nums">
          <span style={{ color: 'var(--text-2)' }}>{counts.open} open</span>
          <span style={{ color: counts.unacked > 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
            {counts.unacked} unacked
          </span>
          <span style={{ color: counts.breaching > 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
            {counts.breaching} breaching SLA
          </span>
        </div>

        <div className="flex items-center gap-0.5 p-0.5 rounded-full ml-auto" style={{ border: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => setView('table')}
            aria-pressed={view === 'table'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
            style={{ backgroundColor: view === 'table' ? 'var(--panel-raised)' : 'transparent', color: view === 'table' ? 'var(--text)' : 'var(--text-3)' }}
          >
            <Rows3 size={12} /> Table
          </button>
          <button
            type="button"
            onClick={() => setView('board')}
            aria-pressed={view === 'board'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
            style={{ backgroundColor: view === 'board' ? 'var(--panel-raised)' : 'transparent', color: view === 'board' ? 'var(--text)' : 'var(--text-3)' }}
          >
            <LayoutGrid size={12} /> Board
          </button>
        </div>
      </div>

      {/* ---- Bulk bar (FR-3.6): bulk ACK and assign only. No bulk resolve. ---- */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 shrink-0"
          style={{ backgroundColor: 'var(--panel-raised)', borderBottom: '1px solid var(--line)' }}>
          <span className="font-mono text-[10.5px]" style={{ color: 'var(--text-2)' }}>
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            disabled={!canBulk || chainBroken}
            onClick={bulkAck}
            className="px-3 py-1.5 rounded-full text-[11.5px] font-medium"
            style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', fontFamily: 'var(--font-body)', opacity: canBulk && !chainBroken ? 1 : 0.4 }}
          >
            Bulk acknowledge
          </button>
          <span className="font-mono text-[9.5px]" style={{ color: 'var(--text-4)' }}>
            Bulk resolve is deliberately unavailable — a resolution needs per-action evidence.
          </span>
          {chainBroken && (
            <span className="font-mono text-[9.5px]" style={{ color: 'var(--act-soft)' }}>
              Bulk operations disabled while the audit chain is broken.
            </span>
          )}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-[11.5px] font-medium"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
          >
            Clear
          </button>
        </div>
      )}

      {toast && (
        <div className="px-6 py-2 shrink-0" role="alert"
          style={{ backgroundColor: 'rgba(242,107,33,0.10)', borderBottom: '1px solid var(--act)' }}>
          <span className="font-mono text-[10.5px]" style={{ color: 'var(--act-soft)' }}>{toast}</span>
        </div>
      )}

      {/* ---- Rail + content ---- */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-5">
        <TierRail
          counts={counts}
          tiers={tiers}
          states={states}
          breachOnly={breachOnly}
          onToggleTier={(t) => setTiers((s) => toggle(s, t))}
          onToggleState={(s) => setStates((cur) => toggle(cur, s))}
          onToggleBreach={() => setBreachOnly((v) => !v)}
        />

        <section
          className="flex-1 min-w-0 min-h-0 p-3"
          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
        >
          {view === 'table' ? (
            <ActionTable
              actions={filtered}
              selectedIds={selectedIds}
              cursorId={cursorId}
              canWrite={canWrite}
              onToggleSelect={(id) => setSelectedIds((s) => toggle(s, id))}
              onToggleAll={() =>
                setSelectedIds((s) => (s.size === filtered.length ? new Set() : new Set(filtered.map((a) => a.id))))
              }
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
        </section>
      </div>

      {open && <ActionDrawer action={open} onClose={() => navigate('/actions')} />}

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
        <p className="text-[11.5px] mb-3" style={{ color: 'var(--text-3)' }}>
          {STATION_LABEL[action.stationId]} roster
        </p>
        <ul className="space-y-1.5">
          {roster.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onAssign(action.id, { id: m.id, name: m.name, role: m.role })}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left rounded-lg min-h-[44px]"
                style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)' }}
              >
                <span className="text-[12.5px]" style={{ color: 'var(--text)' }}>{m.name}</span>
                <span className="font-mono text-[9.5px] ml-auto" style={{ color: 'var(--text-3)' }}>{m.role}</span>
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
        <p className="text-[11.5px] mb-3" style={{ color: 'var(--text-3)' }}>
          A deferral without a reason and a review date is rejected — it would vanish from the
          next crew's handover.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Why is this safe to defer?"
          className="w-full px-3 py-2 text-[12px] outline-none mb-3"
          style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
        />
        <input
          type="date"
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
          className="w-full px-3 py-2 text-[12px] font-mono outline-none mb-3"
          style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
        />
        <button
          type="button"
          disabled={invalid}
          onClick={() => onDefer(action.id, reason, new Date(reviewDate).toISOString())}
          className="w-full py-2.5 rounded-full text-[12.5px] font-medium min-h-[44px]"
          style={{ backgroundColor: invalid ? 'var(--panel-raised)' : 'var(--act)', color: invalid ? 'var(--text-4)' : 'var(--bg)' }}
        >
          Defer and record
        </button>
      </Modal>
    );
  }

  const needsEvidence = (action.tier === 'T0' || action.tier === 'T1') && action.evidence.length === 0;
  return (
    <Modal open onClose={onClose} title={'Resolve — ' + action.title}>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="What was done, and how it was confirmed"
        className="w-full px-3 py-2 text-[12px] outline-none mb-3"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
      />
      {needsEvidence && (
        <p className="font-mono text-[10px] mb-2" style={{ color: 'var(--act-soft)' }}>
          {action.tier} needs evidence — open the action and attach one first.
        </p>
      )}
      <button
        type="button"
        disabled={!note.trim() || needsEvidence}
        onClick={() => onResolve(action.id, note, action.evidence.map((e) => e.id))}
        className="w-full py-2.5 rounded-full text-[12.5px] font-medium min-h-[44px]"
        style={{
          backgroundColor: !note.trim() || needsEvidence ? 'var(--panel-raised)' : 'var(--act)',
          color: !note.trim() || needsEvidence ? 'var(--text-4)' : 'var(--bg)',
        }}
      >
        Resolve and record
      </button>
    </Modal>
  );
}

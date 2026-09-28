// OWNER: Dev B
// PAGE 6b — Station Console (/station), the station edge.
//
// A local-first console that keeps the station operating with NO LINK AT
// ALL. Nothing here blocks on the network: every form writes to the local
// store, appends to the local hash chain, and enqueues in the outbox, then
// confirms. A spinner waiting on a server would be a spec violation
// (FR-5.3), and there is none.
//
// Frontend-only build: the "local edge service" is a localStorage namespace
// separate from HQ's, standing in for FastAPI + SQLite at the station. Say
// that plainly if asked — the behaviour is real, the deployment is not.
//
// Reduced shell by design: no HQ nav tabs. This is the station, not a view
// of HQ. Controls are >= 56px because the operator may be wearing gloves.

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ClipboardList, Package, FileCheck, Paperclip,
  Snowflake, ArrowLeft, Check,
} from 'lucide-react';
import type { Tier, SyncRecord } from '@/shared/contracts';
import { useActionTransitions, decrementResource } from '@/shared/contracts';
import { Modal } from '@/components/shared/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { TierChip } from '@/components/shared/TierChip';
import { StatusDot } from '@/components/shared/StatusDot';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ChainBanner } from '@/components/shared/ChainBanner';
import { useStoreValue, useTick } from '@/state/useStore';
import {
  getZones, getResources, getStationConsoleActions, ROSTER,
} from '@/state/data';
import {
  enqueueLocalRecord, drainOrder, promoteRecord, removeQueuedRecord,
  outboxTotalBytes, drainAll, getDrainState,
} from '@/state/sync';
import { getSyncInfo, type StationId } from '@/state/connectivity';
import { getEngineConfig } from '@/state/params';
import { currentActor } from '@/state/auth';
import { formatClockIST, formatDuration, formatShortIST } from '@/lib/time';
import { appendAudit } from '@/lib/hashChain';
import { STATION_PROFILES } from '@/mock/seed';
import { ensureSeeded, isSeeded } from '@/state/bootstrap';

/** The station this console is running at. One console, one station. */
const STATION: StationId = 'maitri';

type Form = null | 'fault' | 'action' | 'inventory' | 'compliance' | 'evidence';

export default function StationConsolePage() {
  const [form, setForm] = useState<Form>(null);
  const [confirmation, setConfirmation] = useState<{ tier: Tier; position: number; what: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(isSeeded());

  useTick(15_000);

  // This route lives outside AppShell (reduced shell, no HQ nav), so it seeds
  // the local stores itself — an operator may open /station directly, and
  // NFR-6.1 says it must come up from the local service alone.
  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    ensureSeeded()
      .catch((err) => console.error('[station] seeding failed', err))
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [ready]);

  const profile = STATION_PROFILES[STATION];
  const sync = useStoreValue(useCallback(() => getSyncInfo(STATION), []));
  const zones = useStoreValue(useCallback(() => getZones(STATION), []));
  const resources = useStoreValue(useCallback(() => getResources(STATION), []));
  const localActions = useStoreValue(getStationConsoleActions);
  const queue = useStoreValue(useCallback(() => drainOrder().filter((r) => r.stationId === STATION), []));
  const queuedBytes = useStoreValue(useCallback(() => outboxTotalBytes(STATION), []));
  const drain = useStoreValue(getDrainState);

  const linkUp = sync.state !== 'DARK';

  const confirm = (tier: Tier, position: number, what: string) => {
    setForm(null);
    setConfirmation({ tier, position, what });
    setTimeout(() => setConfirmation(null), 6000);
  };

  const onDrain = async () => {
    setBusy(true);
    try { await drainAll(STATION); } finally { setBusy(false); }
  };

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden glow-page"
      style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}
    >
      {/* ---- Reduced shell (FR-5.1) ---- */}
      <header
        className="flex items-center gap-3 h-[52px] px-5 shrink-0 flex-wrap glow-nav"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <Snowflake size={18} style={{ color: 'var(--ok)' }} aria-hidden />
        <span className="text-title font-semibold tracking-[0.1em]" style={{ fontFamily: 'var(--font-display)' }}>
          Station Console · {profile.name}
        </span>
        <span className="font-mono text-body-sm tabular-nums ml-3" style={{ color: 'var(--text-2)' }}>
          {formatClockIST()}
        </span>
        <span
          className="font-mono text-caption uppercase tracking-[0.06em] px-2.5 py-1 rounded-full ml-auto"
          style={{
            border: '1px solid var(--line-strong)',
            color: queue.length > 0 ? 'var(--act-soft)' : 'var(--text-3)',
          }}
        >
          outbox {queue.length}
        </span>
        <Link
          to="/"
          data-press
          className="m-back flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-body-sm"
          style={{ border: '1px solid var(--line)', color: 'var(--text-3)' }}
        >
          <ArrowLeft size={12} /> HQ view
        </Link>
      </header>

      <ChainBanner linkToAudit={false} />

      {/* ---- Permanent link banner (FR-5.2) ---- */}
      <div
        className="flex items-center gap-2.5 px-5 py-2 shrink-0"
        role="status"
        style={{
          backgroundColor:
            sync.state === 'LIVE' ? 'rgba(79,174,133,0.10)'
              : queue.length > 12 ? 'rgba(242,107,33,0.12)'
              : 'rgba(217,164,65,0.12)',
          borderBottom: `1px solid ${sync.state === 'LIVE' ? 'var(--ok)' : queue.length > 12 ? 'var(--act)' : 'var(--watch)'}`,
        }}
      >
        <span
          className="text-body font-medium"
          style={{
            color: sync.state === 'LIVE' ? 'var(--ok-soft)' : queue.length > 12 ? 'var(--act-soft)' : 'var(--watch-soft)',
          }}
        >
          {sync.state === 'LIVE'
            ? `LINK UP · synced ${formatDuration(sync.ageSeconds)} ago`
            : queue.length > 12
              ? `LINK DOWN ${formatDuration(sync.ageSeconds)} · ${queue.length} records queued`
              : `LINK DOWN ${formatDuration(sync.ageSeconds)} · working locally`}
        </span>
        <span className="text-caption" style={{ color: 'var(--text-2)' }}>
          Everything on this console works without a link. Records are written locally first.
        </span>
        {linkUp && queue.length > 0 && (
          <button
            type="button"
            onClick={onDrain}
            disabled={busy}
            className="ml-auto px-3 py-1.5 rounded-full text-body-sm font-medium min-h-[36px]"
            style={{ border: '1px solid var(--ok)', color: 'var(--ok-soft)', fontFamily: 'var(--font-body)', opacity: busy ? 0.5 : 1 }}
          >
            {drain.running ? 'Draining…' : 'Send queue'}
          </button>
        )}
      </div>

      {confirmation && (
        <div
          className="flex items-center gap-2 px-5 py-2 shrink-0"
          role="status"
          style={{ backgroundColor: 'rgba(79,174,133,0.10)', borderBottom: '1px solid var(--ok)' }}
        >
          <Check size={14} style={{ color: 'var(--ok)' }} aria-hidden />
          <span className="text-body" style={{ color: 'var(--ok-soft)' }}>
            {confirmation.what} written locally and queued at{' '}
            <span className="font-mono">{confirmation.tier}</span>, position{' '}
            <span className="font-mono">{confirmation.position}</span> in the transfer order.
          </span>
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto p-5">
        {!ready && (
          <p className="font-mono text-body-sm py-6 text-center" style={{ color: 'var(--text-3)' }}>
            Opening the local store…
          </p>
        )}
        <div className="flex flex-col lg:flex-row gap-3.5" hidden={!ready}>
          {/* ---- Quick actions (FR-6.1): >= 56px targets ---- */}
          <div className="w-full lg:w-[300px] lg:shrink-0 flex flex-col gap-3.5">
            <section
              className="p-4"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
            >
              <h2 className="text-title font-semibold mb-3">Quick actions</h2>
              <div className="space-y-2">
                <BigButton icon={<AlertTriangle size={18} />} label="Log fault" onClick={() => setForm('fault')} />
                <BigButton icon={<ClipboardList size={18} />} label="Record action" onClick={() => setForm('action')} />
                <BigButton icon={<Package size={18} />} label="Inventory change" onClick={() => setForm('inventory')} />
                <BigButton icon={<FileCheck size={18} />} label="Compliance record" onClick={() => setForm('compliance')} />
                <BigButton icon={<Paperclip size={18} />} label="Attach evidence" onClick={() => setForm('evidence')} />
              </div>
            </section>

            {/* ---- Local autonomy (FR-7.1/7.2): same engine as HQ ---- */}
            <section
              className="p-4"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
            >
              <h2 className="text-title font-semibold mb-1">Autonomy — computed locally</h2>
              <p className="text-caption mb-3" style={{ color: 'var(--text-3)' }}>
                Same coupling engine as HQ. One engine, two hosts — these figures will match HQ's
                once the queue drains.
              </p>
              {resources.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center gap-2 py-1.5" style={{ borderTop: '1px solid var(--line)' }}>
                  <StatusDot status={r.risk === 'critical' ? 'warning' : r.risk} size={6} />
                  <span className="text-body-sm flex-1 truncate">{r.name}</span>
                  <span className="font-mono text-body-sm tabular-nums" style={{ color: 'var(--text-2)' }}>
                    {Math.round(r.autonomyDays)} ±{Math.round(r.autonomyBandDays)} d
                  </span>
                </div>
              ))}
            </section>
          </div>

          {/* ---- Local state ---- */}
          <div className="flex-1 min-w-0 flex flex-col gap-3.5">
            <section
              className="p-4"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
            >
              <h2 className="text-title font-semibold mb-3">Zone status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {zones.map((z) => (
                  <div
                    key={z.code}
                    className="p-3"
                    style={{
                      backgroundColor: z.status === 'warning' ? 'rgba(242,107,33,0.10)'
                        : z.status === 'watch' ? 'rgba(217,164,65,0.10)' : 'var(--panel-raised)',
                      border: `1px solid ${z.status === 'warning' ? 'rgba(242,107,33,0.45)' : z.status === 'watch' ? 'rgba(217,164,65,0.4)' : 'var(--line)'}`,
                      borderRadius: 'var(--r-inner)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-micro tracking-label" style={{ color: 'var(--text-3)' }}>{z.code}</span>
                      <StatusDot status={z.status} size={6} />
                    </div>
                    <p className="text-body-sm" style={{ fontWeight: z.status === 'warning' ? 600 : 400 }}>{z.name}</p>
                    <p className="font-mono text-micro" style={{ color: 'var(--text-3)' }}>
                      {z.summary?.value ?? '—'} {z.summary?.unit}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="p-4"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
            >
              <h2 className="text-title font-semibold mb-3">Open local actions</h2>
              {localActions.length === 0 ? (
                <EmptyState reason="Nothing raised on this console yet. Anything logged here stays usable with no link and syncs when one returns." />
              ) : (
                <ul className="space-y-2">
                  {localActions.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}
                    >
                      <TierChip tier={a.tier} />
                      <span className="text-body-sm flex-1 truncate">{a.title}</span>
                      <span className="font-mono text-micro" style={{ color: 'var(--text-4)' }}>
                        {a.state.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-micro uppercase px-1.5 py-0.5 rounded"
                        style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}>
                        Pending sync
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ---- Local outbox (FR-8) ---- */}
          <div className="w-full lg:w-[380px] lg:shrink-0">
            <LocalOutbox
              queue={queue}
              totalBytes={queuedBytes}
              onPromote={(id, tier, reason) => { void promoteRecord(id, tier, reason); }}
              onRemove={(id) => removeQueuedRecord(id)}
            />
          </div>
        </div>
      </main>

      <StationForms
        form={form}
        onClose={() => setForm(null)}
        onConfirm={confirm}
      />
    </div>
  );
}

function BigButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 text-left"
      style={{
        minHeight: 56,
        backgroundColor: 'var(--panel-raised)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r-inner)',
        color: 'var(--text)',
      }}
    >
      <span style={{ color: 'var(--ok-soft)' }} aria-hidden>{icon}</span>
      <span className="text-title">{label}</span>
    </button>
  );
}

function LocalOutbox({
  queue, totalBytes, onPromote, onRemove,
}: {
  queue: SyncRecord[];
  totalBytes: number;
  onPromote: (id: string, tier: Tier, reason: string) => void;
  onRemove: (id: string) => void;
}) {
  const [promoting, setPromoting] = useState<SyncRecord | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const higherTier = (tier: Tier): Tier | null =>
    tier === 'T3' ? 'T2' : tier === 'T2' ? 'T1' : tier === 'T1' ? 'T0' : null;

  return (
    <section
      className="p-4"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Local outbox"
    >
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-title font-semibold">Local outbox</h2>
        <span className="font-mono text-caption" style={{ color: 'var(--text-3)' }}>
          {(totalBytes / 1024).toFixed(0)} KB
        </span>
      </div>
      <p className="text-caption mb-3" style={{ color: 'var(--text-3)' }}>
        A record may be promoted to a higher tier with a reason. Demotion is not permitted.
      </p>

      {queue.length === 0 ? (
        <EmptyState reason="Queue empty — everything written here has reached HQ." />
      ) : (
        <ul className="space-y-1.5 max-h-[520px] overflow-y-auto">
          {queue.map((r, i) => {
            const promote = higherTier(r.tier);
            return (
              <li
                key={r.id}
                className="px-2.5 py-2"
                style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-micro w-4 shrink-0" style={{ color: 'var(--text-4)' }}>{i + 1}</span>
                  <TierChip tier={r.tier} />
                  <span className="text-body-sm flex-1 truncate">{r.payloadRef}</span>
                  <span className="font-mono text-micro shrink-0" style={{ color: 'var(--text-4)' }}>
                    {(r.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-micro" style={{ color: 'var(--text-4)' }}>
                    {formatShortIST(r.createdAtStation)} · {r.type}
                  </span>
                  {r.promotedFrom && (
                    <span className="font-mono text-micro px-1 rounded" style={{ border: '1px solid var(--act)', color: 'var(--act-soft)' }}>
                      ↑ from {r.promotedFrom}
                    </span>
                  )}
                  <span className="ml-auto flex gap-1">
                    {promote && (
                      <button
                        type="button"
                        onClick={() => { setPromoting(r); setReason(''); setError(null); }}
                        className="text-body-sm font-medium px-2.5 py-1 rounded min-h-[28px]"
                        style={{ border: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
                      >
                        Promote
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        try { onRemove(r.id); setError(null); }
                        catch (e) { setError(e instanceof Error ? e.message : 'Remove failed'); }
                      }}
                      className="text-body-sm font-medium px-2.5 py-1 rounded min-h-[28px]"
                      style={{ border: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
                    >
                      Remove
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="font-mono text-caption mt-2" style={{ color: 'var(--act-soft)' }}>{error}</p>}

      <Modal open={promoting !== null} onClose={() => setPromoting(null)} title="Promote record">
        <p className="text-body-sm mb-3" style={{ color: 'var(--text-3)' }}>
          Promoting moves “{promoting?.payloadRef}” from {promoting?.tier} to{' '}
          {promoting ? higherTier(promoting.tier) : ''}. The reason is recorded and travels with the
          record. Demotion is not offered.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Why does this need to go sooner?"
          className="w-full px-3 py-2 text-body outline-none mb-3"
          style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)' }}
        />
        <button
          type="button"
          disabled={!reason.trim()}
          onClick={() => {
            if (promoting) {
              const target = higherTier(promoting.tier);
              if (target) onPromote(promoting.id, target, reason);
            }
            setPromoting(null);
          }}
          className="w-full rounded-full text-body font-medium"
          style={{
            minHeight: 48,
            backgroundColor: reason.trim() ? 'var(--act)' : 'var(--panel-raised)',
            color: reason.trim() ? 'var(--bg)' : 'var(--text-4)',
          }}
        >
          Promote and record
        </button>
      </Modal>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The five forms. Each completes in under 30 seconds and needs no network.
// ---------------------------------------------------------------------------

function StationForms({
  form, onClose, onConfirm,
}: {
  form: Form;
  onClose: () => void;
  onConfirm: (tier: Tier, position: number, what: string) => void;
}) {
  const actor = currentActor();
  const transitions = useActionTransitions('station', { name: actor.name, role: 'station_operator' });
  const resources = useStoreValue(useCallback(() => getResources(STATION), []));
  const zones = useStoreValue(useCallback(() => getZones(STATION), []));

  const [severity, setSeverity] = useState<Tier>('T1');
  const [description, setDescription] = useState('');
  const [assetId, setAssetId] = useState('');
  const [zoneCode, setZoneCode] = useState('A1');
  const [resourceId, setResourceId] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ before: number; after: number } | null>(null);

  const reset = () => {
    setDescription(''); setAssetId(''); setDelta(''); setReason('');
    setError(null); setPreview(null); setBusy(false);
  };

  const closeAll = () => { reset(); onClose(); };

  /** Write locally → chain → outbox → confirm. Never the reverse (NFR-6.2). */
  const submit = async (
    tier: Tier,
    type: SyncRecord['type'],
    label: string,
    extra?: () => Promise<void>
  ) => {
    setBusy(true);
    setError(null);
    try {
      await extra?.();
      const { record, queuePosition } = await enqueueLocalRecord({
        stationId: STATION,
        tier,
        type,
        payloadRef: label,
        sizeBytes: 1024 + label.length * 24,
      });
      await appendAudit(
        {
          actor: actor.name, actorRole: 'station_operator',
          objectType: type, objectId: record.id,
          transition: 'RECORDED_LOCALLY',
          payload: { label, tier },
          payloadSummary: label,
          atStation: record.createdAtStation,
          writtenOffline: true,
        },
        'station'
      );
      reset();
      onConfirm(tier, queuePosition, label);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Local write failed');
      setBusy(false);
    }
  };

  const fieldStyle = {
    backgroundColor: 'var(--panel-raised)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-inner)',
    color: 'var(--text)',
  } as const;

  return (
    <>
      {/* ---- Log fault (FR-6.3) ---- */}
      <Modal open={form === 'fault'} onClose={closeAll} title="Log fault">
        <Label>Zone</Label>
        <select value={zoneCode} onChange={(e) => setZoneCode(e.target.value)}
          className="w-full px-3 mb-3 text-body outline-none" style={{ ...fieldStyle, minHeight: 48 }}>
          {zones.map((z) => <option key={z.code} value={z.code}>{z.code} — {z.name}</option>)}
        </select>

        <Label>Asset</Label>
        <input value={assetId} onChange={(e) => setAssetId(e.target.value)}
          placeholder="Local asset tag" className="w-full px-3 mb-3 text-body outline-none"
          style={{ ...fieldStyle, minHeight: 48 }} />

        <Label>Severity → tier</Label>
        <div className="flex gap-1.5 mb-3">
          {(['T0', 'T1', 'T2', 'T3'] as Tier[]).map((t) => (
            <button key={t} type="button" onClick={() => setSeverity(t)}
              className="flex-1 font-mono text-body-sm rounded-full"
              style={{
                minHeight: 48,
                backgroundColor: severity === t ? 'var(--panel-raised)' : 'transparent',
                border: `1px solid ${severity === t ? 'var(--line-strong)' : 'var(--line)'}`,
                color: severity === t ? 'var(--text)' : 'var(--text-3)',
              }}>
              {t}
            </button>
          ))}
        </div>

        <Label>Description</Label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="w-full px-3 py-2 mb-3 text-body outline-none" style={fieldStyle} />

        {error && <ErrorLine text={error} />}
        <SubmitButton
          disabled={!description.trim() || busy}
          label={busy ? 'Writing locally…' : 'Log fault'}
          onClick={() =>
            submit(severity, 'fault', description.slice(0, 64), async () => {
              await transitions.raise({
                stationId: STATION,
                tier: severity,
                title: description.slice(0, 64),
                reason: description,
                zoneCode,
                assetId: assetId || undefined,
                trigger: {
                  metricName: 'Station observation',
                  measurement: {
                    value: description.slice(0, 40), unit: '',
                    timestamp: new Date().toISOString(),
                    source: 'station operator entry',
                    provenance: 'LIVE',
                    freshnessSeconds: 0,
                  },
                },
              });
            })
          }
        />
      </Modal>

      {/* ---- Record action ---- */}
      <Modal open={form === 'action'} onClose={closeAll} title="Record action">
        <Label>What was done or needs doing</Label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="w-full px-3 py-2 mb-3 text-body outline-none" style={fieldStyle} />

        <Label>Owner</Label>
        <select value={assetId} onChange={(e) => setAssetId(e.target.value)}
          className="w-full px-3 mb-3 text-body outline-none" style={{ ...fieldStyle, minHeight: 48 }}>
          <option value="">Unassigned</option>
          {ROSTER.filter((m) => m.stationId === STATION).map((m) => (
            <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
          ))}
        </select>

        {error && <ErrorLine text={error} />}
        <SubmitButton
          disabled={!description.trim() || busy}
          label={busy ? 'Writing locally…' : 'Record action'}
          onClick={() =>
            submit('T2', 'action', description.slice(0, 64), async () => {
              const id = await transitions.raise({
                stationId: STATION,
                tier: 'T2',
                title: description.slice(0, 64),
                reason: description,
                trigger: {
                  metricName: 'Station operator entry',
                  measurement: {
                    value: 'operator-raised', unit: '',
                    timestamp: new Date().toISOString(),
                    source: 'station operator entry',
                    provenance: 'LIVE', freshnessSeconds: 0,
                  },
                },
              });
              const member = ROSTER.find((m) => m.id === assetId);
              if (member) await transitions.assign(id, { id: member.id, name: member.name, role: member.role });
            })
          }
        />
      </Modal>

      {/* ---- Inventory change (FR-6.4) ---- */}
      <Modal open={form === 'inventory'} onClose={closeAll} title="Inventory change">
        <Label>Resource</Label>
        <select
          value={resourceId}
          onChange={(e) => { setResourceId(e.target.value); setPreview(null); }}
          className="w-full px-3 mb-3 text-body outline-none"
          style={{ ...fieldStyle, minHeight: 48 }}
        >
          <option value="">Select a resource</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>{r.name} — {r.stock.value} {r.unit}</option>
          ))}
        </select>

        <Label>Change (negative to issue, positive to receive)</Label>
        <input
          type="number"
          value={delta}
          onChange={(e) => {
            setDelta(e.target.value);
            const r = resources.find((x) => x.id === resourceId);
            const d = Number(e.target.value);
            if (r && Number.isFinite(d) && d !== 0) {
              const burn = typeof r.burnRate.value === 'number' ? r.burnRate.value : 0;
              const stock = typeof r.stock.value === 'number' ? r.stock.value : 0;
              setPreview({
                before: r.autonomyDays,
                after: burn > 0 ? (stock + d) / burn : r.autonomyDays,
              });
            } else setPreview(null);
          }}
          className="w-full px-3 mb-3 font-mono text-body outline-none"
          style={{ ...fieldStyle, minHeight: 48 }}
        />

        {/* The station sees the consequence of its own entry immediately */}
        {preview && (
          <p className="font-mono text-body mb-3">
            <span className="uppercase" style={{ color: 'var(--text-4)' }}>autonomy </span>
            <span style={{ color: 'var(--text-2)' }}>{Math.round(preview.before)}</span>
            <span style={{ color: 'var(--text-4)' }}> → </span>
            <span style={{ color: preview.after < preview.before ? 'var(--act-soft)' : 'var(--ok-soft)' }}>
              {Math.round(preview.after)} d
            </span>
          </p>
        )}

        <Label>Reason</Label>
        <input value={reason} onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 mb-3 text-body outline-none" style={{ ...fieldStyle, minHeight: 48 }} />

        {error && <ErrorLine text={error} />}
        <SubmitButton
          disabled={!resourceId || !delta || !reason.trim() || busy}
          label={busy ? 'Writing locally…' : 'Record change'}
          onClick={() => {
            const r = resources.find((x) => x.id === resourceId);
            const d = Number(delta);
            return submit('T2', 'inventory', `${r?.name ?? resourceId} ${d > 0 ? '+' : ''}${d} ${r?.unit ?? ''}`, async () => {
              // decrementResource is the single write path for stock, so the
              // change and the autonomy recompute can never land apart.
              await decrementResource(resourceId, -d, getEngineConfig(STATION), 'station');
            });
          }}
        />
      </Modal>

      {/* ---- Compliance record ---- */}
      <Modal open={form === 'compliance'} onClose={closeAll} title="Compliance record">
        <Label>Record</Label>
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Waste return — September"
          className="w-full px-3 mb-3 text-body outline-none" style={{ ...fieldStyle, minHeight: 48 }} />
        <Label>Notes</Label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          className="w-full px-3 py-2 mb-3 text-body outline-none" style={fieldStyle} />
        <p className="text-caption mb-3" style={{ color: 'var(--text-3)' }}>
          Queued at T2. While it is queued, the matching obligation at HQ reads QUEUED OFFLINE
          rather than OVERDUE — the station did its part.
        </p>
        {error && <ErrorLine text={error} />}
        <SubmitButton
          disabled={!description.trim() || busy}
          label={busy ? 'Writing locally…' : 'Submit record'}
          onClick={() => submit('T2', 'compliance', description.slice(0, 64))}
        />
      </Modal>

      {/* ---- Attach evidence (FR-6.6) ---- */}
      <Modal open={form === 'evidence'} onClose={closeAll} title="Attach evidence">
        <Label>Describe the attachment</Label>
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Photo — heater bank 3 contactor"
          className="w-full px-3 mb-3 text-body outline-none" style={{ ...fieldStyle, minHeight: 48 }} />
        <p className="text-caption mb-3" style={{ color: 'var(--text-3)' }}>
          Attachments queue at T3 so they never block the record they belong to.
        </p>
        {error && <ErrorLine text={error} />}
        <SubmitButton
          disabled={!description.trim() || busy}
          label={busy ? 'Storing locally…' : 'Attach'}
          onClick={() => submit('T3', 'attachment', description.slice(0, 64))}
        />
      </Modal>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-mono text-micro uppercase tracking-label mb-1" style={{ color: 'var(--text-4)' }}>
      {children}
    </label>
  );
}

function ErrorLine({ text }: { text: string }) {
  return <p className="font-mono text-caption mb-2" style={{ color: 'var(--act-soft)' }} role="alert">{text}</p>;
}

function SubmitButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-full text-body font-medium"
      style={{
        minHeight: 56,
        backgroundColor: disabled ? 'var(--panel-raised)' : 'var(--act)',
        color: disabled ? 'var(--text-4)' : 'var(--bg)',
      }}
    >
      {label}
    </button>
  );
}

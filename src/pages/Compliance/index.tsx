// OWNER: Dev B
// PAGE 7 — Compliance & Audit (/compliance).
//
// Two framing rules from the spec, both respected here:
//  1. This is a SUPPORTING capability. It is complete and credible but must
//     not out-shout the twin, the action centre or the offline architecture.
//  2. The mechanism is a SHA-256 tamper-evident hash chain. The other word
//     invites one follow-up question this build cannot win, so it appears
//     nowhere in the UI, the code, or any export.

import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import type { InspectionRecord } from '@/shared/contracts';
import { useActionTransitions } from '@/shared/contracts';
import { Obligations } from './Obligations';
import { WasteLedger, STREAM_LABEL } from './WasteLedger';
import { Inspections } from './Inspections';
import { AuditLog } from './AuditLog';
import { Drawer } from '@/components/shared/Drawer';
import {
  getObligations, getWasteEvents, wasteBalance, wasteMonthlySeries,
  getInspections, type WasteBalanceRow,
} from '@/state/data';
import { downloadText } from '@/state/manifest';
import {
  getChain, getChainStatus, refreshChainStatus, exportChainJSON,
  tamperWithEntryForDemo, shortHash,
} from '@/lib/hashChain';
import { useStoreValue } from '@/state/useStore';
import { getParamValue } from '@/state/params';
import { STATION_LABEL, type StationFilter } from '@/state/stationScope';
import { currentActor, useCan } from '@/state/auth';
import { formatShortIST, formatDateIST } from '@/lib/time';
import { synth } from '@/lib/provenance';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { ActiveIndicator } from '@/components/shared/ActiveIndicator';

type Tab = 'obligations' | 'waste' | 'inspections' | 'audit';

const TABS: { id: Tab; label: string }[] = [
  { id: 'obligations', label: 'Obligations' },
  { id: 'waste', label: 'Waste ledger' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'audit', label: 'Audit log' },
];

const SCOPES: { id: StationFilter; label: string }[] = [
  { id: 'all', label: 'Both' },
  { id: 'bharati', label: 'Bharati' },
  { id: 'maitri', label: 'Maitri' },
];

export default function CompliancePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = (searchParams.get('tab') as Tab) ?? 'obligations';
  const [scope, setScope] = useState<StationFilter>('all');
  const [recordId, setRecordId] = useState<string | null>(searchParams.get('record'));
  const [verifying, setVerifying] = useState(false);

  const actor = currentActor();
  const canRaise = useCan('action.transition');
  const canExport = useCan('compliance.export');
  const transitions = useActionTransitions('hq', { name: actor.name, role: actor.role });

  const obligations = useStoreValue(useCallback(() => getObligations(scope), [scope]));
  const wasteEvents = useStoreValue(useCallback(() => getWasteEvents(scope), [scope]));
  const balance = useStoreValue(useCallback(() => wasteBalance(scope), [scope]));
  const monthly = useStoreValue(useCallback(() => wasteMonthlySeries(scope), [scope]));
  const inspections = useStoreValue(useCallback(() => getInspections(scope), [scope]));
  const chain = useStoreValue(() => getChain('hq'));
  const status = useStoreValue(() => getChainStatus('hq'));

  const tolerance = getParamValue<number>('thresholds.wasteBalanceToleranceKg');

  const counts = useMemo(() => ({
    dueIn30: obligations.filter((o) => o.status === 'due_soon').length,
    overdue: obligations.filter((o) => o.status === 'overdue').length,
    queued: obligations.filter((o) => o.status === 'queued_offline').length,
  }), [obligations]);

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const openRecord = (id: string) => {
    setRecordId(id);
    const params = new URLSearchParams(searchParams);
    params.set('record', id);
    setSearchParams(params, { replace: true });
  };

  const closeRecord = () => {
    setRecordId(null);
    const params = new URLSearchParams(searchParams);
    params.delete('record');
    setSearchParams(params, { replace: true });
  };

  const verify = async () => {
    setVerifying(true);
    try { await refreshChainStatus('hq'); } finally { setVerifying(false); }
  };

  /** FR-3.4 — a balance failure earns a T2 action, not just a red number. */
  const raiseBalanceAction = async (row: WasteBalanceRow) => {
    const id = await transitions.raise({
      stationId: row.stationId,
      tier: 'T2',
      title: `Waste mass balance fails — ${STREAM_LABEL[row.stream]}`,
      reason:
        `Generated ${row.generatedKg} kg minus shipped ${row.shippedKg} kg does not equal stored ` +
        `${row.storedKg} kg; the discrepancy of ${row.discrepancyKg} kg exceeds the ${tolerance} kg tolerance.`,
      trigger: {
        metricName: STREAM_LABEL[row.stream] + ' mass balance',
        measurement: synth(row.discrepancyKg, 'kg', 'station waste record feed'),
        threshold: { value: tolerance, unit: 'kg', label: 'balance tolerance' },
      },
      consequence: {
        kind: 'compliance',
        before: 0,
        after: Math.abs(row.discrepancyKg),
        unit: 'kg',
        label: `${Math.abs(row.discrepancyKg)} kg unaccounted`,
      },
    });
    navigate('/actions/' + id);
  };

  const raiseForFinding = async (record: InspectionRecord, itemId: string, label: string) => {
    const id = await transitions.raise({
      stationId: record.stationId as 'bharati' | 'maitri',
      tier: 'T2',
      title: `Inspection finding — ${label}`,
      reason: `Failed item on ${record.type} inspection of ${formatDateIST(record.at)}, recorded by ${record.inspector}.`,
      trigger: {
        metricName: 'Inspection item ' + itemId,
        measurement: synth('fail', '', 'station inspection records'),
      },
    });
    navigate('/actions/' + id);
  };

  const record = useMemo(() => {
    if (!recordId) return null;
    const obligation = obligations.find((o) => o.id === recordId);
    if (obligation) return { kind: 'obligation' as const, obligation };
    const inspection = inspections.find((i) => i.id === recordId);
    if (inspection) return { kind: 'inspection' as const, inspection };
    return null;
  }, [recordId, obligations, inspections]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Title row ---- */}
      <div className="flex items-center gap-x-5 gap-y-3 flex-wrap px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Compliance &amp; Audit
        </h1>

        <div
          data-segmented
          role="group"
          aria-label="Station scope"
          className="relative isolate flex items-center gap-1 p-1 rounded-full"
          style={{ border: '1px solid var(--line-strong)' }}
        >
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              aria-pressed={scope === s.id}
              className="px-4 min-h-9 rounded-full text-body-sm font-medium"
              style={{
                color: scope === s.id ? 'var(--bg)' : 'var(--text-3)',
              }}
            >
              {s.label}
            </button>
          ))}
          <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--text)' }} />
        </div>

        {/* Plain-language counts — each one its own chip, never a joined string. */}
        <ul className="flex items-center gap-2.5 flex-wrap" aria-label="Obligation summary">
          <CountChip
            n={counts.dueIn30}
            label="due within 30 days"
            color="var(--text-2)"
            border="var(--line-strong)"
          />
          <CountChip
            n={counts.overdue}
            label="overdue"
            color={counts.overdue > 0 ? 'var(--act-soft)' : 'var(--text-3)'}
            border={counts.overdue > 0 ? 'var(--act)' : 'var(--line)'}
          />
          <CountChip
            n={counts.queued}
            label="waiting to sync"
            color="var(--watch-soft)"
            border="var(--watch)"
            dashed
            title="Queued offline: the evidence exists at the station and is waiting on the link. It is not overdue."
          />
        </ul>

        <button
          type="button"
          onClick={() => setTab('audit')}
          className="flex items-center gap-2 ml-auto px-4 min-h-9 rounded-full text-body-sm font-medium"
          style={{
            border: `1px solid ${status?.ok === false ? 'var(--act)' : 'var(--ok)'}`,
            color: status?.ok === false ? 'var(--act-soft)' : 'var(--ok-soft)',
            fontFamily: 'var(--font-body)',
          }}
          title="Open the audit log"
        >
          {status?.ok === false ? <ShieldAlert size={16} aria-hidden /> : <ShieldCheck size={16} aria-hidden />}
          {status?.ok === false ? (
            <span>Chain broken at entry <span className="font-mono tabular-nums">{status.brokenAt}</span></span>
          ) : 'Chain verified'}
        </button>
      </div>

      {/* ---- Tabs ---- */}
      <div className="px-6 py-3 shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
        <div role="tablist" aria-label="Compliance sections" className="relative isolate flex items-center gap-1.5 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              onClick={() => setTab(t.id)}
              aria-selected={tab === t.id}
              className="px-4 min-h-9 rounded-full text-body font-medium whitespace-nowrap hover:text-[var(--text-2)]"
              style={{
                color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
                border: '1px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
          <ActiveIndicator
            className="rounded-full"
            style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line-strong)' }}
          />
        </div>
      </div>

      <div key={tab} className="m-panel flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div className="max-w-[100rem] mx-auto">
          {tab === 'obligations' && (
            <Obligations
              obligations={obligations}
              onOpen={openRecord}
              onOpenAction={(id) => navigate('/actions/' + id)}
            />
          )}

          {tab === 'waste' && (
            <WasteLedger
              balance={balance}
              series={monthly}
              events={wasteEvents}
              toleranceKg={tolerance}
              onRaiseBalanceAction={(row) => { void raiseBalanceAction(row); }}
              onOpenVoyage={(voyageId) => navigate('/logistics/manifest/' + voyageId)}
              canRaise={canRaise}
            />
          )}

          {tab === 'inspections' && (
            <Inspections
              records={inspections}
              onRaiseForFinding={(r, itemId, label) => { void raiseForFinding(r, itemId, label); }}
              onOpenAction={(id) => navigate('/actions/' + id)}
              canRaise={canRaise}
            />
          )}

          {tab === 'audit' && (
            <AuditLog
              chain={chain}
              status={status}
              verifying={verifying}
              onVerify={verify}
              onExport={() =>
                downloadText('antarasetu-audit-chain.json', exportChainJSON('hq'), 'application/json')
              }
              onTamper={(seq) => { tamperWithEntryForDemo(seq, 'hq'); void verify(); }}
              canTamper={canExport}
              focusSeq={searchParams.get('seq') ? Number(searchParams.get('seq')) : null}
            />
          )}
        </div>
      </div>

      {/* ---- Record detail drawer (FR-6) ---- */}
      <Drawer
        open={record !== null}
        onClose={closeRecord}
        title={record?.kind === 'obligation' ? 'Obligation' : 'Inspection record'}
        className="w-[32rem] max-w-full"
      >
        {record?.kind === 'obligation' && (
          <div className="flex flex-col gap-5">
            <h3 className="text-title font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              {record.obligation.name}
            </h3>
            <dl>
              <Field k="Station" v={STATION_LABEL[record.obligation.stationId]} />
              <Field k="Category" v={sentence(record.obligation.category)} />
              <Field k="How often" v={sentence(record.obligation.cadence.replace('-', ' '))} />
              <Field k="Due" v={formatDateIST(record.obligation.dueDate)} mono />
              <Field k="Owner" v={record.obligation.owner} />
              <Field k="Status" v={sentence(record.obligation.status.replace('_', ' '))} />
              <Field k="Template" v={`${record.obligation.templateId} v${record.obligation.templateVersion}`} mono />
            </dl>
            {record.obligation.status === 'queued_offline' && (
              <p
                className="text-body px-4 py-3"
                style={{ color: 'var(--watch-soft)', backgroundColor: 'rgba(217,164,65,0.08)', border: '1px dashed var(--watch)', borderRadius: 'var(--r-inner)' }}
              >
                Evidence for this obligation is queued in the station outbox. It is not overdue —
                the record exists, the link does not.
              </p>
            )}
            <div className="flex items-center gap-3">
              <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>
                Data class
              </span>
              <ProvenanceBadge
                measurement={synth(record.obligation.name, '', 'NCPOR compliance register')}
                label="Obligation register"
              />
            </div>
            <button
              type="button"
              disabled={!canExport}
              onClick={() =>
                downloadText(
                  record.obligation.id + '.json',
                  JSON.stringify({ record: record.obligation, note: 'Provenance: SYNTH — register not yet supplied by NCPOR.' }, null, 2),
                  'application/json'
                )
              }
              className="w-full py-3 rounded-full text-body font-medium min-h-10 hover:bg-[var(--panel-raised)]"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', opacity: canExport ? 1 : 0.4 }}
            >
              Download record
            </button>
          </div>
        )}

        {record?.kind === 'inspection' && (
          <div className="flex flex-col gap-5">
            <h3 className="text-title font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              {record.inspection.type}
            </h3>
            <dl>
              <Field k="Station" v={STATION_LABEL[record.inspection.stationId as 'bharati' | 'maitri']} />
              <Field k="Inspector" v={record.inspection.inspector} />
              <Field k="Date" v={formatShortIST(record.inspection.at)} mono />
              <Field k="Result" v={sentence(record.inspection.result.replace(/_/g, ' '))} />
              <Field k="Template" v={`${record.inspection.templateId} v${record.inspection.templateVersion}`} mono />
              <Field k="Chain entry" v={shortHash(record.inspection.auditHash || '—')} mono />
            </dl>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function CountChip({
  n, label, color, border, dashed, title,
}: { n: number; label: string; color: string; border: string; dashed?: boolean; title?: string }) {
  return (
    <li
      className="inline-flex items-baseline gap-2 px-4 py-2 rounded-full text-body-sm"
      style={{ color, border: `1px ${dashed ? 'dashed' : 'solid'} ${border}` }}
      title={title}
    >
      <span className="font-mono font-medium tabular-nums">{n}</span>
      <span>{label}</span>
    </li>
  );
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Field({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-4 py-3" style={{ borderTop: '1px solid var(--line)' }}>
      <dt className="text-body-sm w-28 shrink-0" style={{ color: 'var(--text-3)' }}>
        {k}
      </dt>
      <dd
        className={`${mono ? 'font-mono tabular-nums ' : ''}text-body min-w-0 break-words`}
        style={{ color: 'var(--text)' }}
      >
        {v}
      </dd>
    </div>
  );
}

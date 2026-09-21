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
      <div className="flex items-center gap-3 flex-wrap px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <h1 className="text-[27px] font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Compliance &amp; Audit
        </h1>

        <div className="flex items-center gap-1 ml-2 p-0.5 rounded-full" style={{ border: '1px solid var(--line)' }}>
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              className="px-3 py-1.5 rounded-full text-[11.5px]"
              style={{
                backgroundColor: scope === s.id ? 'var(--text)' : 'transparent',
                color: scope === s.id ? 'var(--bg)' : 'var(--text-3)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tabular-nums">
          <span style={{ color: 'var(--text-2)' }}>{counts.dueIn30} due in 30 d</span>
          <span style={{ color: counts.overdue > 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
            {counts.overdue} overdue
          </span>
          <span style={{ color: 'var(--watch-soft)' }}>{counts.queued} queued offline</span>
        </div>

        <button
          type="button"
          onClick={() => setTab('audit')}
          className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-full text-[11.5px] font-medium min-h-[36px]"
          style={{
            border: `1px solid ${status?.ok === false ? 'var(--act)' : 'var(--ok)'}`,
            color: status?.ok === false ? 'var(--act-soft)' : 'var(--ok-soft)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {status?.ok === false ? <ShieldAlert size={11} /> : <ShieldCheck size={11} />}
          {status?.ok === false ? `Chain broken at entry ${status.brokenAt}` : 'Chain verified'}
        </button>
      </div>

      {/* ---- Tabs ---- */}
      <div className="flex items-center gap-1 px-6 py-2 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-selected={tab === t.id}
            className="px-3.5 py-1.5 rounded-full text-[12px]"
            style={{
              backgroundColor: tab === t.id ? 'var(--panel-raised)' : 'transparent',
              color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
              border: `1px solid ${tab === t.id ? 'var(--line-strong)' : 'transparent'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5">
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
            onVerify={() => { void verify(); }}
            onExport={() =>
              downloadText('antarasetu-audit-chain.json', exportChainJSON('hq'), 'application/json')
            }
            onTamper={(seq) => { tamperWithEntryForDemo(seq, 'hq'); void verify(); }}
            canTamper={canExport}
            focusSeq={searchParams.get('seq') ? Number(searchParams.get('seq')) : null}
          />
        )}
      </div>

      {/* ---- Record detail drawer (FR-6) ---- */}
      <Drawer
        open={record !== null}
        onClose={closeRecord}
        title={record?.kind === 'obligation' ? 'Obligation' : 'Inspection record'}
        className="w-[460px]"
      >
        {record?.kind === 'obligation' && (
          <div className="space-y-3">
            <h3 className="text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              {record.obligation.name}
            </h3>
            <Field k="Station" v={STATION_LABEL[record.obligation.stationId]} />
            <Field k="Category" v={record.obligation.category} />
            <Field k="Cadence" v={record.obligation.cadence} />
            <Field k="Due" v={formatDateIST(record.obligation.dueDate)} />
            <Field k="Owner" v={record.obligation.owner} />
            <Field k="Status" v={record.obligation.status.replace('_', ' ')} />
            <Field k="Template" v={`${record.obligation.templateId} v${record.obligation.templateVersion}`} />
            {record.obligation.status === 'queued_offline' && (
              <p className="text-[11.5px]" style={{ color: 'var(--watch-soft)' }}>
                Evidence for this obligation is queued in the station outbox. It is not overdue —
                the record exists, the link does not.
              </p>
            )}
            <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-4)' }}>
                Class
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
              className="w-full py-2.5 rounded-full text-[12px] min-h-[44px]"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', opacity: canExport ? 1 : 0.4 }}
            >
              Download record
            </button>
          </div>
        )}

        {record?.kind === 'inspection' && (
          <div className="space-y-3">
            <h3 className="text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              {record.inspection.type}
            </h3>
            <Field k="Station" v={STATION_LABEL[record.inspection.stationId as 'bharati' | 'maitri']} />
            <Field k="Inspector" v={record.inspection.inspector} />
            <Field k="Date" v={formatShortIST(record.inspection.at)} />
            <Field k="Result" v={record.inspection.result.replace(/_/g, ' ')} />
            <Field k="Template" v={`${record.inspection.templateId} v${record.inspection.templateVersion}`} />
            <Field k="Chain entry" v={shortHash(record.inspection.auditHash || '—')} />
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1" style={{ borderTop: '1px solid var(--line)' }}>
      <span className="font-mono text-[9px] uppercase tracking-[0.10em] w-24 shrink-0" style={{ color: 'var(--text-4)' }}>
        {k}
      </span>
      <span className="text-[11.5px]" style={{ color: 'var(--text-2)' }}>{v}</span>
    </div>
  );
}

// OWNER: Dev B
// PAGE 7 — Compliance (/compliance).
//
// The stations' official paperwork under the Antarctic Treaty's environmental
// rules and India's Antarctic Act 2022, plus proof nobody changed it
// afterwards. Four question cards are the tabs (`?tab=`); the chosen card's
// panel sits below; `?record=` opens one record in the drawer. The proof is a
// SHA-256 hash chain, shown to people as "record history" — the other word
// for it appears nowhere in the UI, the code, or any export.

import { useCallback, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import type { InspectionRecord, Obligation } from '@/shared/contracts';
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
  tamperWithEntryForDemo, shortHash, type ChainEntry,
} from '@/lib/hashChain';
import { useStoreValue } from '@/state/useStore';
import { getParamValue } from '@/state/params';
import { STATION_LABEL, type StationFilter } from '@/state/stationScope';
import { currentActor, useCan } from '@/state/auth';
import { formatShortIST, formatDateIST } from '@/lib/time';
import { synth } from '@/lib/provenance';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { StatusDot } from '@/components/shared/StatusDot';
import { ActiveIndicator } from '@/components/shared/ActiveIndicator';

type Tab = 'obligations' | 'waste' | 'inspections' | 'audit';

/** The page's four questions. `id` is the `?tab=` value other pages deep-link to. */
const CARDS: { id: Tab; name: string; question: string }[] = [
  { id: 'obligations', name: 'Reports', question: 'Are reports filed on time?' },
  { id: 'waste', name: 'Waste', question: 'Is all waste accounted for?' },
  { id: 'inspections', name: 'Inspections', question: 'Were inspections passed?' },
  { id: 'audit', name: 'Record history', question: 'Are the records untouched?' },
];

const SCOPES: { id: StationFilter; label: string }[] = [
  { id: 'all', label: 'Both' },
  { id: 'bharati', label: 'Bharati' },
  { id: 'maitri', label: 'Maitri' },
];

const PIPELINE = [
  'Station writes a record',
  'reaches HQ, or waits for the satellite link',
  'locked into the record history',
];

const WAITING_TIP = 'Filed at the station; waiting for the satellite link to reach HQ. Not late.';

const REPORT_STATUS: Record<Obligation['status'], string> = {
  future: 'Not due yet',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  submitted: 'Filed',
  queued_offline: 'Waiting for the link',
};

const INSPECTION_RESULT: Record<InspectionRecord['result'], string> = {
  pass: 'Passed',
  pass_with_findings: 'Passed, with findings',
  fail: 'Failed',
};

type Tone = 'act' | 'ok' | 'none';

const TONE: Record<Tone, { dot: 'warning' | 'ok' | 'unknown'; color: string }> = {
  act: { dot: 'warning', color: 'var(--act-soft)' },
  ok: { dot: 'ok', color: 'var(--ok-soft)' },
  none: { dot: 'unknown', color: 'var(--text-3)' },
};

interface CardAnswer {
  tone: Tone;
  answer: ReactNode;
  detail?: ReactNode;
}

const tabId = (id: Tab) => 'compliance-tab-' + id;
const PANEL_ID = 'compliance-panel';

export default function CompliancePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab');
  const tab: Tab = CARDS.some((c) => c.id === rawTab) ? (rawTab as Tab) : 'obligations';
  const recordId = searchParams.get('record');
  const [scope, setScope] = useState<StationFilter>('all');
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

  // ---- One plain answer per question card ----
  const reportsAnswer = useMemo<CardAnswer>(() => {
    const count = (s: Obligation['status']) => obligations.filter((o) => o.status === s).length;
    const overdue = count('overdue');
    const dueSoon = count('due_soon');
    const waiting = count('queued_offline');

    const parts: ReactNode[] = [];
    if (dueSoon > 0) parts.push(<span key="due"><Num n={dueSoon} /> due in the next 30 days</span>);
    if (waiting > 0) {
      parts.push(
        <span
          key="waiting"
          title={WAITING_TIP}
          className="underline decoration-dashed underline-offset-4"
          style={{ color: 'var(--watch-soft)', textDecorationColor: 'var(--watch)' }}
        >
          <Num n={waiting} /> waiting for the link
        </span>
      );
    }
    const detail = parts.length > 0
      ? parts.flatMap((p, i) => (i === 0 ? [p] : [<span key={'sep' + i} aria-hidden> · </span>, p]))
      : undefined;

    if (obligations.length === 0) return { tone: 'none', answer: 'No reports in this view' };
    if (overdue > 0) return { tone: 'act', answer: <><Num n={overdue} /> overdue</>, detail };
    return { tone: 'ok', answer: 'All on time', detail };
  }, [obligations]);

  const wasteFailing = balance.filter((r) => !r.withinTolerance).length;
  const wasteAnswer: CardAnswer =
    balance.length === 0
      ? { tone: 'none', answer: 'No waste recorded' }
      : wasteFailing > 0
        ? {
          tone: 'act',
          answer: (
            <><Num n={wasteFailing} /> {wasteFailing === 1 ? 'type of waste doesn’t add up' : 'types of waste don’t add up'}</>
          ),
        }
        : { tone: 'ok', answer: 'Yes — every type adds up' };
  const wasteMeasurement = synth(wasteFailing, wasteFailing === 1 ? 'type' : 'types', 'station waste record feed');

  const inspectionsAnswer = useMemo<CardAnswer>(() => {
    const items = inspections.flatMap((r) => r.items);
    const failed = items.filter((i) => i.result === 'fail');
    const unhandled = failed.filter((i) => !i.linkedActionId).length;
    const n = inspections.length;
    if (n === 0) return { tone: 'none', answer: 'No inspections recorded' };
    if (unhandled > 0) {
      return {
        tone: 'act',
        answer: <><Num n={unhandled} /> failed {unhandled === 1 ? 'item needs' : 'items need'} an action</>,
      };
    }
    const noun = n === 1 ? 'inspection' : 'inspections';
    return {
      tone: 'ok',
      answer: failed.length > 0
        ? <><Num n={n} /> {noun}, all findings handled</>
        : <><Num n={n} /> {noun}, all passed</>,
    };
  }, [inspections]);

  const historyAnswer: CardAnswer = (() => {
    if (!status) return { tone: 'none', answer: 'Not checked yet' };
    const checked = <>Checked <span className="font-mono tabular-nums">{formatShortIST(status.checkedAt)}</span></>;
    if (!status.ok) {
      return {
        tone: 'act',
        answer: status.brokenAt != null
          ? <>Record <span className="font-mono tabular-nums">#{status.brokenAt}</span> was changed</>
          : 'A record was changed',
        detail: checked,
      };
    }
    if (status.verified === 0) return { tone: 'none', answer: 'No records yet', detail: checked };
    return {
      tone: 'ok',
      answer: status.verified === 1
        ? 'Yes — the record is unchanged'
        : <>Yes — all <Num n={status.verified} /> records unchanged</>,
      detail: checked,
    };
  })();

  const answers: Record<Tab, CardAnswer> = {
    obligations: reportsAnswer,
    waste: wasteAnswer,
    inspections: inspectionsAnswer,
    audit: historyAnswer,
  };

  // ---- URL state ----
  const updateParams = (fn: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams);
    fn(params);
    setSearchParams(params, { replace: true });
  };

  const setTab = (next: Tab) => updateParams((p) => p.set('tab', next));
  const openRecord = (id: string) => updateParams((p) => p.set('record', id));
  const closeRecord = () => updateParams((p) => p.delete('record'));
  const showInHistory = (seq: number) =>
    updateParams((p) => { p.delete('record'); p.set('tab', 'audit'); p.set('seq', String(seq)); });

  /** Arrow keys move between the four cards, as in any tab list. */
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = CARDS.findIndex((c) => c.id === tab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % CARDS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + CARDS.length) % CARDS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = CARDS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(CARDS[next].id);
    document.getElementById(tabId(CARDS[next].id))?.focus();
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
      title: `${STREAM_LABEL[row.stream]} waste doesn't add up`,
      reason:
        `Produced ${Math.round(row.generatedKg)} kg and shipped out ${Math.round(row.shippedKg)} kg, so ` +
        `${Math.round(row.generatedKg - row.shippedKg)} kg should be stored — but ${Math.round(row.storedKg)} kg is. ` +
        `${Math.round(Math.abs(row.discrepancyKg))} kg is unaccounted for (allowed difference: ${tolerance} kg).`,
      trigger: {
        metricName: STREAM_LABEL[row.stream] + ' waste — unaccounted weight',
        measurement: synth(row.discrepancyKg, 'kg', 'station waste record feed'),
        threshold: { value: tolerance, unit: 'kg', label: 'allowed difference' },
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
      title: `Failed inspection item — ${label}`,
      reason: `Failed on the ${record.type} inspection of ${formatDateIST(record.at)}, by ${record.inspector}.`,
      trigger: {
        metricName: 'Inspection item ' + itemId,
        measurement: synth('fail', '', 'station inspection records'),
      },
    });
    navigate('/actions/' + id);
  };

  const record = useMemo(() => {
    if (!recordId) return null;
    const entry = latestEntryFor(chain, recordId);
    const obligation = obligations.find((o) => o.id === recordId);
    if (obligation) return { kind: 'obligation' as const, obligation, entry };
    const inspection = inspections.find((i) => i.id === recordId);
    if (inspection) return { kind: 'inspection' as const, inspection, entry };
    return null;
  }, [recordId, obligations, inspections, chain]);

  const downloadRecord = (id: string, body: unknown, entry: ChainEntry | undefined, provenance: string) =>
    downloadText(
      id + '.json',
      JSON.stringify({
        record: body,
        recordHistoryEntry: entry
          ? { seq: entry.seq, at: entry.at, hash: entry.hash, prevHash: entry.prevHash }
          : null,
        note: provenance,
      }, null, 2),
      'application/json'
    );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Title row + the one-line pipeline ---- */}
      <div className="px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-start flex-wrap gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1 basis-[24rem]">
            <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              Compliance
            </h1>
            <p className="text-body mt-1 max-w-[70ch]" style={{ color: 'var(--text-2)' }}>
              What Bharati and Maitri must report under the Antarctic Treaty, whether it’s done, and
              proof the records haven’t been changed.
            </p>
          </div>

          <div
            data-segmented
            role="group"
            aria-label="Station"
            className="relative isolate flex items-center gap-1 p-1 rounded-full ml-auto"
            style={{ border: '1px solid var(--line-strong)' }}
          >
            {SCOPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScope(s.id)}
                aria-pressed={scope === s.id}
                className="px-4 min-h-10 rounded-full text-body-sm font-medium"
                style={{ color: scope === s.id ? 'var(--bg)' : 'var(--text-2)' }}
              >
                {s.label}
              </button>
            ))}
            <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--text)' }} />
          </div>
        </div>

        <ol
          aria-label="How a record travels"
          className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-3 text-body-sm"
          style={{ color: 'var(--text-3)' }}
        >
          {PIPELINE.map((step, i) => (
            <li key={step} className="inline-flex items-center gap-2">
              {i > 0 && <ArrowRight size={14} className="shrink-0" aria-hidden />}
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="@container flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div className="max-w-[100rem] mx-auto flex flex-col gap-5">
          {/* ---- The four questions (these are the tabs) ---- */}
          <div
            role="tablist"
            aria-label="Compliance questions"
            className="grid grid-cols-1 gap-3 @min-[30rem]:grid-cols-2 @min-[62rem]:grid-cols-4"
          >
            {CARDS.map((card) => {
              const selected = card.id === tab;
              const { tone, answer, detail } = answers[card.id];
              return (
                <div key={card.id} role="presentation" className="relative min-w-0">
                  <button
                    id={tabId(card.id)}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={PANEL_ID}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(card.id)}
                    onKeyDown={onTabKey}
                    className={
                      'w-full h-full flex flex-col items-start gap-1 p-4 text-left border transition-colors '
                      + (selected
                        ? 'bg-[var(--panel-raised)] border-[var(--text)]'
                        : 'bg-[var(--panel)] border-[var(--line)] hover:border-[var(--line-strong)]')
                    }
                    style={{ borderRadius: 'var(--r-card)' }}
                  >
                    <span className={'text-body-sm' + (card.id === 'waste' ? ' pr-14' : '')} style={{ color: 'var(--text-3)' }}>
                      {card.name}
                    </span>
                    <span className="text-body font-semibold" style={{ color: 'var(--text)' }}>
                      {card.question}
                    </span>
                    <span className="flex items-start gap-2 mt-1.5 text-body font-medium" style={{ color: TONE[tone].color }}>
                      <StatusDot status={TONE[tone].dot} size={9} className="mt-[7px]" />
                      <span className="min-w-0">{answer}</span>
                    </span>
                    {detail && (
                      <span className="text-body-sm pl-[17px]" style={{ color: 'var(--text-3)' }}>
                        {detail}
                      </span>
                    )}
                  </button>

                  {/* A sibling, not a child: a button may not sit inside the tab button. */}
                  {card.id === 'waste' && (
                    <span className="absolute top-4 right-4">
                      <ProvenanceBadge measurement={wasteMeasurement} label="Waste figures are sample data" align="right" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ---- The selected question's detail ---- */}
          <div
            key={tab}
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={tabId(tab)}
            className="m-panel min-w-0"
          >
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
                onOpen={openRecord}
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
                  downloadText('antarasetu-record-history.json', exportChainJSON('hq'), 'application/json')
                }
                onTamper={(seq) => { tamperWithEntryForDemo(seq, 'hq'); void verify(); }}
                canTamper={canExport}
                focusSeq={searchParams.get('seq') ? Number(searchParams.get('seq')) : null}
              />
            )}
          </div>
        </div>
      </div>

      {/* ---- Record detail drawer (FR-6), URL-addressable via ?record= ---- */}
      <Drawer
        open={record !== null}
        onClose={closeRecord}
        title={record?.kind === 'obligation' ? 'Report' : 'Inspection'}
        className="w-[32rem] max-w-full"
      >
        {record?.kind === 'obligation' && (() => {
          const o = record.obligation;
          return (
            <div className="flex flex-col gap-5">
              <h3 className="text-title font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                {o.name}
              </h3>
              <dl>
                <Field k="Station" v={STATION_LABEL[o.stationId]} />
                <Field k="Type" v={sentence(o.category)} />
                <Field k="How often" v={sentence(o.cadence.replace('-', ' '))} />
                <Field k="Due" v={formatDateIST(o.dueDate)} mono />
                <Field k="Responsible" v={o.owner} />
                <Field
                  k="Status"
                  v={REPORT_STATUS[o.status]}
                  color={o.status === 'overdue' ? 'var(--act-soft)' : o.status === 'queued_offline' ? 'var(--watch-soft)' : undefined}
                />
              </dl>

              {o.status === 'queued_offline' && (
                <p
                  className="text-body px-4 py-3"
                  style={{
                    color: 'var(--watch-soft)',
                    backgroundColor: 'color-mix(in srgb, var(--watch) 8%, transparent)',
                    border: '1px dashed var(--watch)',
                    borderRadius: 'var(--r-inner)',
                  }}
                >
                  {WAITING_TIP}
                </p>
              )}

              {o.status === 'overdue' && (o.linkedActionId ? (
                <button
                  type="button"
                  onClick={() => navigate('/actions/' + o.linkedActionId)}
                  className="self-start inline-flex items-center gap-2 px-4 min-h-10 rounded-full text-body font-medium hover:bg-[var(--panel-raised)]"
                  style={{ border: '1px solid var(--line-strong)', color: 'var(--text)' }}
                >
                  Open action <ChevronRight size={16} aria-hidden />
                </button>
              ) : (
                <p className="text-body" style={{ color: 'var(--act-soft)' }}>
                  This report is overdue but no action is linked to it.
                </p>
              ))}

              <SourceRow>
                <ProvenanceBadge
                  measurement={synth(o.name, '', 'NCPOR compliance register')}
                  label="Report register"
                />
              </SourceRow>

              <TechnicalDetails
                rows={[
                  { k: 'Form', v: `${o.templateId} v${o.templateVersion}` },
                  { k: 'Record ID', v: o.id },
                  ...(o.lastSubmissionId ? [{ k: 'Last filing', v: o.lastSubmissionId }] : []),
                  ...entryRows(record.entry),
                ]}
                onShowInHistory={record.entry ? () => showInHistory(record.entry!.seq) : undefined}
              />

              <DownloadButton
                enabled={canExport}
                onClick={() => downloadRecord(o.id, o, record.entry, 'Provenance: SYNTH — register not yet supplied by NCPOR.')}
              />
            </div>
          );
        })()}

        {record?.kind === 'inspection' && (() => {
          const insp = record.inspection;
          const covers = [...(insp.scope.zoneCodes ?? []), ...(insp.scope.assetIds ?? [])];
          return (
            <div className="flex flex-col gap-5">
              <h3 className="text-title font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                {insp.type}
              </h3>
              <dl>
                <Field k="Station" v={STATION_LABEL[insp.stationId as 'bharati' | 'maitri']} />
                <Field k="Inspected by" v={insp.inspector} />
                <Field k="Date" v={formatShortIST(insp.at)} mono />
                {covers.length > 0 && <Field k="Covers" v={covers.join(', ')} mono />}
                <Field k="Result" v={INSPECTION_RESULT[insp.result]} />
              </dl>

              <section aria-label="Checklist">
                <h4 className="text-body font-semibold mb-2" style={{ color: 'var(--text)' }}>Checklist</h4>
                <ul className="flex flex-col gap-2">
                  {insp.items.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      canRaise={canRaise}
                      onOpenAction={(id) => navigate('/actions/' + id)}
                      onRaise={() => { void raiseForFinding(insp, item.id, item.label); }}
                    />
                  ))}
                </ul>
              </section>

              <SourceRow>
                <ProvenanceBadge
                  measurement={synth(insp.type, '', 'station inspection records')}
                  label="Inspection records"
                />
              </SourceRow>

              <TechnicalDetails
                rows={[
                  { k: 'Form', v: `${insp.templateId} v${insp.templateVersion}` },
                  { k: 'Record ID', v: insp.id },
                  ...entryRows(record.entry, insp.auditHash),
                ]}
                onShowInHistory={record.entry ? () => showInHistory(record.entry!.seq) : undefined}
              />

              <DownloadButton
                enabled={canExport}
                onClick={() => downloadRecord(insp.id, insp, record.entry, 'Provenance: SYNTH — station inspection records, prototype placeholder.')}
              />
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Num({ n }: { n: number }) {
  return <span className="font-mono tabular-nums">{n}</span>;
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The newest record-history entry written for a record, if any. */
function latestEntryFor(chain: ChainEntry[], objectId: string): ChainEntry | undefined {
  for (let i = chain.length - 1; i >= 0; i--) {
    if (chain[i].objectId === objectId) return chain[i];
  }
  return undefined;
}

function entryRows(entry: ChainEntry | undefined, fallbackHash?: string): { k: string; v: string }[] {
  if (entry) {
    return [
      { k: 'History entry', v: '#' + entry.seq },
      { k: 'Fingerprint', v: shortHash(entry.hash) },
      { k: 'Previous fingerprint', v: shortHash(entry.prevHash) },
    ];
  }
  return fallbackHash ? [{ k: 'Fingerprint', v: shortHash(fallbackHash) }] : [];
}

function Field({ k, v, mono, color }: { k: string; v: string; mono?: boolean; color?: string }) {
  return (
    <div className="flex items-baseline gap-4 py-3" style={{ borderTop: '1px solid var(--line)' }}>
      <dt className="text-body-sm w-32 shrink-0" style={{ color: 'var(--text-3)' }}>
        {k}
      </dt>
      <dd
        className={`${mono ? 'font-mono tabular-nums ' : ''}text-body min-w-0 break-words`}
        style={{ color: color ?? 'var(--text)' }}
      >
        {v}
      </dd>
    </div>
  );
}

function SourceRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>Source</span>
      {children}
    </div>
  );
}

function ChecklistItem({
  item, canRaise, onOpenAction, onRaise,
}: {
  item: InspectionRecord['items'][number];
  canRaise: boolean;
  onOpenAction: (id: string) => void;
  onRaise: () => void;
}) {
  const failed = item.result === 'fail';
  const needsAction = failed && !item.linkedActionId;
  const word = item.result === 'pass'
    ? 'Passed'
    : item.result === 'na'
      ? 'Not applicable'
      : needsAction ? 'Failed — needs an action' : 'Failed — action open';
  const dot = item.result === 'pass' ? 'ok' : item.result === 'na' ? 'unknown' : needsAction ? 'warning' : 'watch';
  const color = needsAction ? 'var(--act-soft)' : failed ? 'var(--watch-soft)' : 'var(--text-3)';

  return (
    <li
      className="flex flex-col gap-1 px-3 py-2.5"
      style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-inner)' }}
    >
      <span className="text-body" style={{ color: 'var(--text)' }}>{item.label}</span>
      <span className="flex items-center gap-2 text-body-sm" style={{ color }}>
        <StatusDot status={dot} size={8} />
        {word}
      </span>
      {item.note && (
        <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>{item.note}</span>
      )}
      {failed && item.linkedActionId && (
        <button
          type="button"
          onClick={() => onOpenAction(item.linkedActionId!)}
          className="self-start mt-1 inline-flex items-center gap-2 px-4 min-h-10 rounded-full text-body-sm font-medium hover:bg-[var(--panel-raised)]"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text)' }}
        >
          Open action <ChevronRight size={16} aria-hidden />
        </button>
      )}
      {needsAction && canRaise && (
        <button
          type="button"
          onClick={onRaise}
          className="self-start mt-1 px-4 min-h-10 rounded-full text-body-sm font-medium"
          style={{ border: '1px solid var(--act)', color: 'var(--act-soft)' }}
        >
          Raise action
        </button>
      )}
    </li>
  );
}

/** Fingerprints live only here, folded away — auditors open it, nobody else has to. */
function TechnicalDetails({
  rows, onShowInHistory,
}: { rows: { k: string; v: string }[]; onShowInHistory?: () => void }) {
  return (
    <details className="group" style={{ borderTop: '1px solid var(--line)' }}>
      <summary
        className="flex items-center gap-2 min-h-10 py-2 cursor-pointer list-none text-body font-medium rounded-md [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ok-soft)]"
        style={{ color: 'var(--text-2)' }}
      >
        <ChevronRight size={16} className="shrink-0 transition-transform group-open:rotate-90" aria-hidden />
        Technical details
      </summary>
      <p className="text-body-sm mt-1 mb-2" style={{ color: 'var(--text-3)' }}>
        Each record’s fingerprint is worked out from the record and the one before it, so any later change would show.
      </p>
      <dl>
        {rows.map((r) => <Field key={r.k} k={r.k} v={r.v} mono />)}
      </dl>
      {onShowInHistory && (
        <button
          type="button"
          onClick={onShowInHistory}
          className="mt-2 inline-flex items-center gap-2 px-4 min-h-10 rounded-full text-body-sm font-medium hover:bg-[var(--panel-raised)]"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
        >
          Show in record history <ChevronRight size={16} aria-hidden />
        </button>
      )}
    </details>
  );
}

function DownloadButton({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      title={enabled ? 'Download this record, with its fingerprint, for an auditor' : 'Your role cannot download records'}
      className="w-full py-3 rounded-full text-body font-medium min-h-10 hover:bg-[var(--panel-raised)]"
      style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', opacity: enabled ? 1 : 0.4 }}
    >
      Download record
    </button>
  );
}

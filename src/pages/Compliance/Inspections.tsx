// OWNER: Dev B
// Inspections — records with their full checklist.
//
// FR-4.3: a failed item must link to an action or offer to raise one. A
// failed item with no action is flagged, because an inspection that finds a
// problem and then loses it is worse than no inspection.

import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import type { InspectionRecord } from '@/shared/contracts';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusDot } from '@/components/shared/StatusDot';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { formatDateIST } from '@/lib/time';
import { shortHash } from '@/lib/hashChain';

const RESULT_STYLE: Record<InspectionRecord['result'], { color: string; label: string }> = {
  pass: { color: 'var(--ok-soft)', label: 'Passed' },
  pass_with_findings: { color: 'var(--watch-soft)', label: 'Passed with findings' },
  fail: { color: 'var(--act-soft)', label: 'Failed' },
};

const ITEM_LABEL: Record<InspectionRecord['items'][number]['result'], { label: string; color: string }> = {
  pass: { label: 'Pass', color: 'var(--ok-soft)' },
  fail: { label: 'Fail', color: 'var(--act-soft)' },
  na: { label: 'N/A', color: 'var(--text-3)' },
};

interface Props {
  records: InspectionRecord[];
  onRaiseForFinding: (record: InspectionRecord, itemId: string, label: string) => void;
  onOpenAction: (actionId: string) => void;
  canRaise: boolean;
}

export function Inspections({ records, onRaiseForFinding, onOpenAction, canRaise }: Props) {
  const [openId, setOpenId] = useState<string | null>(records[0]?.id ?? null);

  if (records.length === 0) {
    return <EmptyState reason="No inspection records for this scope and period." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {records.map((record) => {
        const expanded = record.id === openId;
        const style = RESULT_STYLE[record.result];
        const failures = record.items.filter((i) => i.result === 'fail');
        const unlinked = failures.filter((i) => !i.linkedActionId);
        const station = record.stationId as 'bharati' | 'maitri';

        return (
          <section
            key={record.id}
            style={{
              backgroundColor: 'var(--panel)',
              border: `1px solid ${unlinked.length > 0 ? 'rgba(242,107,33,0.35)' : 'var(--line)'}`,
              borderRadius: 'var(--r-card)',
            }}
          >
            <button
              type="button"
              onClick={() => setOpenId(expanded ? null : record.id)}
              className="w-full flex items-start gap-4 px-5 py-4 text-left"
              aria-expanded={expanded}
            >
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-x-3 gap-y-2 flex-wrap">
                  <span className="text-title font-semibold" style={{ color: 'var(--text)' }}>{record.type}</span>
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium whitespace-nowrap"
                    style={{ border: `1px solid ${style.color}`, color: style.color }}
                  >
                    {style.label}
                  </span>
                </span>
                <span className="flex items-center gap-x-5 gap-y-1.5 flex-wrap mt-2 text-body-sm" style={{ color: 'var(--text-3)' }}>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-body-sm"
                    style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
                    title={STATION_CODE[station]}
                  >
                    {STATION_LABEL[station]}
                  </span>
                  <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{formatDateIST(record.at)}</span>
                  <span>Inspected by <span style={{ color: 'var(--text-2)' }}>{record.inspector}</span></span>
                  <span>
                    <span className="font-mono tabular-nums" style={{ color: failures.length > 0 ? 'var(--text)' : 'var(--text-2)' }}>
                      {failures.length}
                    </span>{' '}
                    finding{failures.length === 1 ? '' : 's'}
                  </span>
                </span>
              </span>
              <ChevronDown
                size={20}
                aria-hidden
                className="shrink-0 mt-1 transition-transform"
                style={{ color: 'var(--text-3)', transform: expanded ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            {expanded && (
              <div className="px-5 pb-5">
                {unlinked.length > 0 && (
                  <p
                    className="flex items-start gap-2.5 text-body mb-4 px-4 py-3"
                    style={{ color: 'var(--act-soft)', backgroundColor: 'rgba(242,107,33,0.08)', border: '1px solid rgba(242,107,33,0.35)', borderRadius: 'var(--r-inner)' }}
                  >
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
                    <span>
                      <span className="font-mono tabular-nums">{unlinked.length}</span> failed item{unlinked.length === 1 ? '' : 's'} with
                      no linked action. Raise one so the finding is not lost.
                    </span>
                  </p>
                )}
                <ul className="flex flex-col gap-2">
                  {record.items.map((item) => {
                    const itemStyle = ITEM_LABEL[item.result] ?? { label: item.result, color: 'var(--text-3)' };
                    return (
                      <li
                        key={item.id}
                        className="flex items-start gap-4 px-4 py-3 flex-wrap sm:flex-nowrap"
                        style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}
                      >
                        <span className="flex items-center gap-2 w-[4.5rem] shrink-0 mt-0.5">
                          <StatusDot
                            status={item.result === 'pass' ? 'ok' : item.result === 'fail' ? 'warning' : 'unknown'}
                            size={9}
                          />
                          <span className="text-body-sm font-medium" style={{ color: itemStyle.color }}>
                            {itemStyle.label}
                          </span>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-body" style={{ color: 'var(--text)' }}>{item.label}</span>
                          {item.note && (
                            <span className="block text-body-sm mt-1" style={{ color: 'var(--text-3)' }}>{item.note}</span>
                          )}
                        </span>
                        {item.result === 'fail' && (
                          item.linkedActionId ? (
                            <button
                              type="button"
                              onClick={() => onOpenAction(item.linkedActionId!)}
                              className="text-body-sm font-medium px-4 min-h-9 rounded-full shrink-0 hover:bg-[var(--panel-alt)]"
                              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
                            >
                              Open action
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!canRaise}
                              onClick={() => onRaiseForFinding(record, item.id, item.label)}
                              className="text-body-sm font-medium px-4 min-h-9 rounded-full shrink-0"
                              style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', fontFamily: 'var(--font-body)', opacity: canRaise ? 1 : 0.4 }}
                            >
                              Raise action
                            </button>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>

                <p className="flex items-center gap-x-5 gap-y-1 flex-wrap mt-4 text-body-sm" style={{ color: 'var(--text-3)' }}>
                  <span>
                    Checklist template <span className="font-mono tabular-nums">v{record.templateVersion}</span>
                  </span>
                  <span title="Fingerprint of this record in the tamper-evident audit chain">
                    Audit chain entry{' '}
                    <span className="font-mono text-caption">{shortHash(record.auditHash || '—')}</span>
                  </span>
                </p>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

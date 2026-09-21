// OWNER: Dev B
// Inspections — records with their full checklist.
//
// FR-4.3: a failed item must link to an action or offer to raise one. A
// failed item with no action is flagged, because an inspection that finds a
// problem and then loses it is worse than no inspection.

import { useState } from 'react';
import type { InspectionRecord } from '@/shared/contracts';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusDot } from '@/components/shared/StatusDot';
import { STATION_CODE } from '@/state/stationScope';
import { formatDateIST } from '@/lib/time';
import { shortHash } from '@/lib/hashChain';

const RESULT_STYLE: Record<InspectionRecord['result'], { color: string; label: string }> = {
  pass: { color: 'var(--ok-soft)', label: 'PASS' },
  pass_with_findings: { color: 'var(--watch-soft)', label: 'PASS WITH FINDINGS' },
  fail: { color: 'var(--act-soft)', label: 'FAIL' },
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
    <div className="space-y-2.5">
      {records.map((record) => {
        const expanded = record.id === openId;
        const style = RESULT_STYLE[record.result];
        const failures = record.items.filter((i) => i.result === 'fail');
        const unlinked = failures.filter((i) => !i.linkedActionId);

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
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left flex-wrap"
              aria-expanded={expanded}
            >
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{record.type}</span>
              <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>
                {STATION_CODE[record.stationId as 'bharati' | 'maitri']} · {formatDateIST(record.at)} · {record.inspector}
              </span>
              <span className="font-mono text-[8.5px] tracking-[0.06em] px-1.5 py-0.5 rounded"
                style={{ border: `1px solid ${style.color}`, color: style.color }}>
                {style.label}
              </span>
              <span className="font-mono text-[9.5px] ml-auto" style={{ color: 'var(--text-4)' }}>
                template v{record.templateVersion} · {failures.length} finding{failures.length === 1 ? '' : 's'} · {shortHash(record.auditHash || '—')}
              </span>
            </button>

            {expanded && (
              <div className="px-4 pb-3">
                {unlinked.length > 0 && (
                  <p className="font-mono text-[10px] mb-2" style={{ color: 'var(--act-soft)' }}>
                    {unlinked.length} failed item{unlinked.length === 1 ? '' : 's'} with no linked action.
                  </p>
                )}
                <ul className="space-y-1.5">
                  {record.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5 py-1.5" style={{ borderTop: '1px solid var(--line)' }}>
                      <span className="mt-1">
                        <StatusDot
                          status={item.result === 'pass' ? 'ok' : item.result === 'fail' ? 'warning' : 'unknown'}
                          size={7}
                        />
                      </span>
                      <span className="font-mono text-[9px] w-8 shrink-0 mt-0.5" style={{ color: 'var(--text-4)' }}>
                        {item.result.toUpperCase()}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[11.5px]" style={{ color: 'var(--text-2)' }}>{item.label}</span>
                        {item.note && (
                          <span className="block text-[10.5px]" style={{ color: 'var(--text-4)' }}>{item.note}</span>
                        )}
                      </span>
                      {item.result === 'fail' && (
                        item.linkedActionId ? (
                          <button
                            type="button"
                            onClick={() => onOpenAction(item.linkedActionId!)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded shrink-0 min-h-[30px]"
                            style={{ border: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
                          >
                            Open action
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canRaise}
                            onClick={() => onRaiseForFinding(record, item.id, item.label)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded shrink-0 min-h-[30px]"
                            style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', fontFamily: 'var(--font-body)', opacity: canRaise ? 1 : 0.4 }}
                          >
                            Raise action
                          </button>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

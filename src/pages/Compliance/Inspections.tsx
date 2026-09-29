// OWNER: Dev B
// Inspections — answers "Were inspections passed?".
//
// One card per inspection, newest first: what was inspected, where, by whom,
// and the result. Failed items sit on the card with their action, or an offer
// to raise one (FR-4.3); a failed item with no action is the orange case.
// The card itself opens the full checklist in the record drawer (FR-4.2).

import { useMemo, type MouseEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import type { InspectionRecord } from '@/shared/contracts';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusDot } from '@/components/shared/StatusDot';
import { STATION_LABEL } from '@/state/stationScope';
import { getZones } from '@/state/data';
import { formatDateIST } from '@/lib/time';

type Result = InspectionRecord['result'];
type Item = InspectionRecord['items'][number];

const RESULT: Record<Result, { label: string; color: string; border: string }> = {
  pass: { label: 'Passed', color: 'var(--ok-soft)', border: 'var(--ok)' },
  pass_with_findings: { label: 'Passed with findings', color: 'var(--watch-soft)', border: 'var(--watch)' },
  fail: { label: 'Failed', color: 'var(--act-soft)', border: 'var(--act)' },
};

const ACT_LINE = 'color-mix(in srgb, var(--act) 45%, transparent)';

interface Props {
  records: InspectionRecord[];
  onRaiseForFinding: (record: InspectionRecord, itemId: string, label: string) => void;
  onOpenAction: (actionId: string) => void;
  canRaise: boolean;
  /** Opens the record drawer with the full checklist. */
  onOpen?: (id: string) => void;
}

export function Inspections({ records, onRaiseForFinding, onOpenAction, canRaise, onOpen }: Props) {
  const zoneNames = useZoneNames();
  const sorted = useMemo(
    () => records.slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    [records]
  );

  if (records.length === 0) {
    return <EmptyState reason="No inspection records for this scope and period." />;
  }

  return (
    <div className="@container flex flex-col gap-4">
      {onOpen && (
        <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
          Newest first — select an inspection to see its full checklist.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 items-start @min-[72rem]:grid-cols-2">
        {sorted.map((record) => (
          <InspectionCard
            key={record.id}
            record={record}
            zoneNames={zoneNames}
            canRaise={canRaise}
            onOpen={onOpen}
            onOpenAction={onOpenAction}
            onRaiseForFinding={onRaiseForFinding}
          />
        ))}
      </div>
    </div>
  );
}

function InspectionCard({
  record, zoneNames, canRaise, onOpen, onOpenAction, onRaiseForFinding,
}: {
  record: InspectionRecord;
  zoneNames: Map<string, string>;
  canRaise: boolean;
  onOpen?: (id: string) => void;
  onOpenAction: (actionId: string) => void;
  onRaiseForFinding: Props['onRaiseForFinding'];
}) {
  const result = RESULT[record.result] ?? RESULT.fail;
  const failed = record.items.filter((i) => i.result === 'fail');
  const passed = record.items.filter((i) => i.result === 'pass').length;
  const notApplicable = record.items.filter((i) => i.result === 'na').length;

  // The whole card opens the checklist; its own buttons stop propagation.
  // A click that ends a text selection is not treated as "open".
  const openCard = (e: MouseEvent) => {
    if (!onOpen) return;
    if (e.defaultPrevented || window.getSelection()?.toString()) return;
    onOpen(record.id);
  };

  return (
    <article
      onClick={onOpen ? openCard : undefined}
      className={`@container px-5 py-4 border border-[var(--line)] ${onOpen ? 'cursor-pointer hover:border-[var(--line-strong)]' : ''}`}
      style={{ backgroundColor: 'var(--panel)', borderRadius: 'var(--r-card)' }}
    >
      <div className="flex items-start gap-x-4 gap-y-2 flex-wrap">
        <h3 className="flex-1 min-w-[12rem] text-title font-semibold" style={{ color: 'var(--text)' }}>
          {onOpen ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpen(record.id); }}
              className="text-left min-h-10 hover:underline underline-offset-4"
              style={{ color: 'var(--text)' }}
            >
              {record.type}
            </button>
          ) : (
            <span className="inline-flex items-center min-h-10">{record.type}</span>
          )}
        </h3>
        <span className="flex items-center gap-3 min-h-10">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium"
            style={{ border: `1px solid ${result.border}`, color: result.color }}
          >
            {result.label}
          </span>
          {onOpen && <ChevronRight size={18} aria-hidden className="shrink-0" style={{ color: 'var(--text-3)' }} />}
        </span>
      </div>

      <p className="flex items-baseline gap-x-5 gap-y-1.5 flex-wrap mt-1 text-body-sm" style={{ color: 'var(--text-3)' }}>
        <time dateTime={record.at} className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>
          {formatDateIST(record.at)}
        </time>
        <Where record={record} zoneNames={zoneNames} />
        <span>
          Inspected by <span style={{ color: 'var(--text-2)' }}>{record.inspector}</span>
        </span>
      </p>

      {failed.length === 0 ? (
        <p className="flex items-center gap-2.5 mt-3 text-body-sm" style={{ color: 'var(--text-3)' }}>
          <StatusDot status="ok" size={8} />
          <span>
            {notApplicable === 0 ? (
              <>All <span className="font-mono tabular-nums">{passed}</span> items passed</>
            ) : (
              <>
                <span className="font-mono tabular-nums">{passed}</span> item{passed === 1 ? '' : 's'} passed,{' '}
                <span className="font-mono tabular-nums">{notApplicable}</span> not applicable
              </>
            )}
          </span>
        </p>
      ) : (
        <>
          <p className="mt-3 text-body-sm" style={{ color: 'var(--text-3)' }}>
            <span className="font-mono tabular-nums">{failed.length}</span> of{' '}
            <span className="font-mono tabular-nums">{record.items.length}</span> items failed
          </p>
          <ul className="flex flex-col gap-2 mt-2">
            {failed.map((item) => (
              <FailedItem
                key={item.id}
                item={item}
                canRaise={canRaise}
                onOpenAction={onOpenAction}
                onRaise={() => onRaiseForFinding(record, item.id, item.label)}
              />
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function FailedItem({
  item, canRaise, onOpenAction, onRaise,
}: { item: Item; canRaise: boolean; onOpenAction: (id: string) => void; onRaise: () => void }) {
  const actionId = item.linkedActionId;
  return (
    <li
      className="flex flex-col gap-3 px-4 py-3 @min-[34rem]:flex-row @min-[34rem]:items-center @min-[34rem]:gap-4"
      style={{
        backgroundColor: 'var(--panel-raised)',
        borderRadius: 'var(--r-inner)',
        border: `1px solid ${actionId ? 'var(--line)' : ACT_LINE}`,
      }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="flex items-center h-[1.375rem] shrink-0">
          <StatusDot status={actionId ? 'watch' : 'warning'} size={9} />
        </span>
        <div className="min-w-0">
          <p className="text-body break-words" style={{ color: 'var(--text)' }}>{item.label}</p>
          {item.note && (
            <p className="text-body-sm mt-0.5 break-words" style={{ color: 'var(--text-3)' }}>{item.note}</p>
          )}
          <p className="text-body-sm mt-1" style={{ color: actionId ? 'var(--text-3)' : 'var(--act-soft)' }}>
            {actionId ? 'Action raised' : 'No action raised yet'}
          </p>
        </div>
      </div>

      {actionId ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenAction(actionId); }}
          className="self-start @min-[34rem]:self-center shrink-0 px-4 min-h-10 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
        >
          Open action
        </button>
      ) : canRaise ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRaise(); }}
          className="self-start @min-[34rem]:self-center shrink-0 px-4 min-h-10 rounded-full text-body-sm font-medium"
          style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', fontFamily: 'var(--font-body)' }}
        >
          Raise action
        </button>
      ) : null}
    </li>
  );
}

/** "Bharati · Power House (A1) · Equipment bhr-gen-01, bhr-gen-02" */
function Where({ record, zoneNames }: { record: InspectionRecord; zoneNames: Map<string, string> }) {
  const station = record.stationId as 'bharati' | 'maitri';
  const zones = record.scope.zoneCodes ?? [];
  const assets = record.scope.assetIds ?? [];
  return (
    <span style={{ color: 'var(--text-2)' }}>
      {STATION_LABEL[station] ?? record.stationId}
      {zones.map((code) => (
        <span key={code}>
          {' · '}
          {zoneNames.get(`${station}:${code}`) ?? 'Zone'}{' '}
          (<span className="font-mono">{code}</span>)
        </span>
      ))}
      {assets.length > 0 && (
        <>
          {' · '}Equipment <span className="font-mono">{assets.join(', ')}</span>
        </>
      )}
    </span>
  );
}

/** Zone code → plain name ("A2" → "Fuel Storage"), per station. Names are static. */
function useZoneNames(): Map<string, string> {
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const station of ['bharati', 'maitri'] as const) {
      for (const zone of getZones(station)) map.set(`${station}:${zone.code}`, zone.name);
    }
    return map;
  }, []);
}

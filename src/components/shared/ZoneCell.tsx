// OWNER: Dev A
// ZoneCell — zone grid cell for the Overview zone panel and Twin page zone list.
// Cell styling by status: nominal, watch, warning per FRONTEND.md §FR-7.3.

import { type Zone } from '@/shared/contracts';
import { StatusDot } from './StatusDot';

interface ZoneCellProps {
  zone: Zone;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

const STATUS_BG: Record<string, string> = {
  ok: 'var(--panel-alt)',
  watch: 'rgba(217,164,65,0.08)',
  warning: 'rgba(242,107,33,0.08)',
  unknown: 'var(--panel-alt)',
};

const STATUS_BORDER: Record<string, string> = {
  ok: 'var(--line)',
  watch: 'rgba(217,164,65,0.35)',
  warning: 'rgba(242,107,33,0.35)',
  unknown: 'var(--line)',
};

export function ZoneCell({ zone, selected = false, onClick, className = '' }: ZoneCellProps) {
  return (
    <button
      onClick={onClick}
      className={`m-lift rounded-lg p-2.5 text-left ${className}`}
      style={{
        backgroundColor: STATUS_BG[zone.status] ?? STATUS_BG.unknown,
        border: `1px solid ${selected ? 'var(--text)' : STATUS_BORDER[zone.status] ?? STATUS_BORDER.unknown}`,
        borderStyle: selected ? 'dashed' : 'solid',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-mono text-micro uppercase tracking-label" style={{ color: 'var(--text-3)' }}>
          {zone.code}
        </span>
        <StatusDot status={zone.status} size={6} />
      </div>
      <p
        className="text-body-sm mb-0.5"
        style={{
          color: 'var(--text)',
          fontFamily: 'var(--font-body)',
          fontWeight: zone.status === 'warning' ? 600 : 400,
        }}
      >
        {zone.name}
      </p>
      {zone.summary && (
        <span className="font-mono text-micro" style={{ color: 'var(--text-3)' }}>
          {zone.summary.value !== null ? `${zone.summary.value} ${zone.summary.unit}` : '—'}
        </span>
      )}
    </button>
  );
}

// OWNER: Dev A
// DiffPanel — Before/After comparison cards for the Sandbox.
import { type Risk, type Provenance } from '@/shared/contracts';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';

interface DiffMetric {
  key: string;
  label: string;
  unit: string;
  before: { value: number; band?: number; risk: Risk; provenance: Provenance };
  after: { value: number; band?: number; risk: Risk; provenance: 'SIM' };
  delta: number;
}

interface DiffPanelProps {
  metrics: DiffMetric[];
  className?: string;
}

export function DiffPanel({ metrics, className = '' }: DiffPanelProps) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-3 gap-3 ${className}`}>
      {metrics.map(m => {
        const worsening = m.delta < 0; // simplistic: assume negative is worse (true for autonomy/LSOD)
        const deltaColor = m.delta === 0 ? 'var(--text-3)' : worsening ? 'var(--act-soft)' : 'var(--ok-soft)';
        const sign = m.delta > 0 ? '+' : '';
        
        return (
          <div key={m.key} className="p-3 rounded-xl flex flex-col gap-2" style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)' }}>
            <span className="font-mono text-[10px] uppercase text-[var(--text-3)]">{m.label}</span>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-[var(--text-4)] mb-0.5">BEFORE</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-[14px] text-[var(--text)] font-medium">
                    {Math.round(m.before.value)}{m.before.band ? ` ±${Math.round(m.before.band)}` : ''}
                  </span>
                  <span className="font-mono text-[9px] text-[var(--text-3)]">{m.unit}</span>
                </div>
              </div>
              <div className="text-[12px] text-[var(--text-4)]">→</div>
              <div className="flex flex-col items-end">
                <span className="font-mono text-[9px] text-[var(--sim-soft)] mb-0.5">AFTER</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-[14px] text-[var(--text)] font-medium">
                    {Math.round(m.after.value)}{m.after.band ? ` ±${Math.round(m.after.band)}` : ''}
                  </span>
                  <span className="font-mono text-[9px] text-[var(--text-3)]">{m.unit}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <ProvenanceBadge measurement={{ provenance: 'SIM', value: null, unit: '', timestamp: '', source: '', freshnessSeconds: 0 }} />
              <span className="font-mono text-[11px] font-semibold" style={{ color: deltaColor }}>
                {sign}{Math.round(m.delta)} {m.unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

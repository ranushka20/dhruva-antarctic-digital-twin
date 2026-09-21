// OWNER: Dev A
// ZoneGrid — Compact 3x2 grid of zones used in Overview and Sandbox.
import { type Zone, type Risk } from '@/shared/contracts';
import { ZoneCell } from '../shared/ZoneCell';

interface ZoneGridProps {
  zones: Zone[];
  impactOverrides?: { zoneCode: string; after: Risk }[];
  className?: string;
}

export function ZoneGrid({ zones, impactOverrides, className = '' }: ZoneGridProps) {
  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {zones.map((zone) => {
        const impact = impactOverrides?.find(o => o.zoneCode === zone.code);
        const simBadge = impact ? <span className="absolute top-1 right-1 w-2 h-2 rounded-full border border-[var(--sim)]" style={{ backgroundColor: 'var(--sim-soft)' }} title="SIM impact" /> : null;
        
        return (
          <div key={zone.code} className="relative">
            {simBadge}
            <ZoneCell
              zone={{ ...zone, status: (impact ? impact.after : zone.status) as any }}
            />
          </div>
        );
      })}
    </div>
  );
}

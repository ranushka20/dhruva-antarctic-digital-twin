// OWNER: Dev A
// IsoStationModel — The primary inline SVG isometric renderer.
// See FRONTEND.md §9.

import { useMemo } from 'react';
import { type ZoneModel, type ZoneStatus } from '@/shared/contracts';

interface IsoStationModelProps {
  zones: ZoneModel[];
  selectedZoneCode?: string;
  onZoneSelect?: (code: string) => void;
  colorMode: 'status' | 'provenance' | 'freshness';
  className?: string;
}

const TILE_W = 120;
const TILE_H = 60;
const ISO_ORIGIN_X = 400;
const ISO_ORIGIN_Y = 100;

function toIso(gx: number, gy: number, z: number = 0) {
  return {
    x: ISO_ORIGIN_X + (gx - gy) * (TILE_W / 2),
    y: ISO_ORIGIN_Y + (gx + gy) * (TILE_H / 2) - z,
  };
}

export function IsoStationModel({
  zones,
  selectedZoneCode,
  onZoneSelect,
  colorMode,
  className = '',
}: IsoStationModelProps) {
  // Sort by draw order: ascending (gx + gy)
  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => {
      const aDepth = a.grid.gx + a.grid.gy;
      const bDepth = b.grid.gx + b.grid.gy;
      return aDepth - bDepth;
    });
  }, [zones]);

  const getColors = (zone: ZoneModel) => {
    // If colorMode is 'status', use standard status colors from tokens.css
    // For simplicity in this demo build, we map status directly to CSS variables
    let edge = 'var(--line-strong)';
    let topFace = 'var(--panel-raised)';
    let leftFace = 'var(--panel-deep)';
    let rightFace = 'var(--panel-alt)';

    if (colorMode === 'status') {
      if (zone.status === 'ok') {
        edge = 'var(--edge-ok)';
        topFace = 'var(--face-top-ok)';
        leftFace = 'var(--face-left-ok)';
        rightFace = 'var(--face-right-ok)';
      } else if (zone.status === 'watch') {
        edge = 'var(--edge-watch)';
        topFace = 'var(--face-top-ok)'; // watch uses nominal faces
        leftFace = 'var(--face-left-ok)';
        rightFace = 'var(--face-right-ok)';
      } else if (zone.status === 'warning' || zone.status === 'critical') {
        edge = 'var(--edge-warn)';
        topFace = 'var(--face-top-warn)';
        leftFace = 'var(--face-left-warn)';
        rightFace = 'var(--face-right-warn)';
      }
    } else if (colorMode === 'provenance') {
       // Just mapping provenance to status colors for visual distinction in demo
       const p = zone.topValue.provenance;
       if (p === 'LIVE') edge = 'var(--ok)';
       if (p === 'MODELED') edge = 'var(--watch)';
       if (p === 'SYNTH') edge = 'var(--text-3)';
       if (p === 'SIM') edge = 'var(--sim)';
    } else if (colorMode === 'freshness') {
       const age = zone.topValue.freshnessSeconds;
       if (age < 300) edge = 'var(--ok)';
       else if (age < 3600) edge = 'var(--watch)';
       else edge = 'var(--text-4)';
    }

    if (zone.code === selectedZoneCode) {
       edge = 'var(--edge-selected)';
    }

    return { edge, topFace, leftFace, rightFace };
  };

  return (
    <div className={`relative w-full h-[600px] flex items-center justify-center overflow-hidden ${className}`}>
      {/* Floor glow ellipse */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-[50%]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(79,174,133,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <svg viewBox="0 0 800 600" className="w-full h-full" style={{ filter: 'drop-shadow(0 24px 32px rgba(0,0,0,0.4))' }}>
        {/* Ground plane grid (simple bounding box for demo) */}
        <path
          d={`M ${toIso(0, 0).x} ${toIso(0, 0).y}
              L ${toIso(3, 0).x} ${toIso(3, 0).y}
              L ${toIso(3, 2).x} ${toIso(3, 2).y}
              L ${toIso(0, 2).x} ${toIso(0, 2).y} Z`}
          fill="none"
          stroke="var(--grid-line)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {sortedZones.map((zone) => {
          const { gx, gy } = zone.grid;
          const h = zone.height;
          const isSelected = zone.code === selectedZoneCode;
          // Hover raises block 4px
          const zOffset = isSelected ? 4 : 0;
          
          const pOrigin = toIso(gx, gy, zOffset);
          const pTop = toIso(gx, gy, h + zOffset);
          
          // Vertices for the top rhombus
          const tN = toIso(gx, gy, h + zOffset);
          const tE = toIso(gx + 1, gy, h + zOffset);
          const tS = toIso(gx + 1, gy + 1, h + zOffset);
          const tW = toIso(gx, gy + 1, h + zOffset);

          // Vertices for the left face
          const lN = tW;
          const lE = tS;
          const lS = toIso(gx + 1, gy + 1, zOffset);
          const lW = toIso(gx, gy + 1, zOffset);

          // Vertices for the right face
          const rN = tS;
          const rE = tE;
          const rS = toIso(gx + 1, gy, zOffset);
          const rW = toIso(gx + 1, gy + 1, zOffset);

          const { edge, topFace, leftFace, rightFace } = getColors(zone);

          return (
            <g
              key={zone.code}
              className="cursor-pointer transition-transform duration-200"
              onClick={() => onZoneSelect?.(zone.code)}
              style={{ transform: `translateY(${zOffset ? '-4px' : '0'})` }}
            >
              {/* Left Face */}
              <path
                d={`M ${lN.x} ${lN.y} L ${lE.x} ${lE.y} L ${lS.x} ${lS.y} L ${lW.x} ${lW.y} Z`}
                fill={leftFace}
                stroke={edge}
                strokeWidth="1"
              />
              {/* Right Face */}
              <path
                d={`M ${rN.x} ${rN.y} L ${rE.x} ${rE.y} L ${rS.x} ${rS.y} L ${rW.x} ${rW.y} Z`}
                fill={rightFace}
                stroke={edge}
                strokeWidth="1"
              />
              {/* Top Face */}
              <path
                d={`M ${tN.x} ${tN.y} L ${tE.x} ${tE.y} L ${tS.x} ${tS.y} L ${tW.x} ${tW.y} Z`}
                fill={topFace}
                stroke={edge}
                strokeWidth={isSelected ? "2" : "1"}
                strokeDasharray={isSelected ? "4 4" : "none"}
              />

              {/* Text Label on Top Face */}
              <text
                x={tN.x}
                y={tN.y + TILE_H/2}
                textAnchor="middle"
                className="font-mono text-micro pointer-events-none select-none"
                fill="var(--text)"
                style={{ fontWeight: 600, letterSpacing: '0.05em' }}
              >
                {zone.code}
              </text>
              <text
                x={tN.x}
                y={tN.y + TILE_H/2 + 12}
                textAnchor="middle"
                className="font-mono text-micro pointer-events-none select-none"
                fill="var(--text-3)"
              >
                {zone.topValue.value} {zone.topValue.unit}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

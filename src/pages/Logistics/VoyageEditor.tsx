// OWNER: Dev B
// VoyageEditor — the arrival-window editor behind the "Next resupply" tile.
//
// This used to be a full side panel restating the voyage's name, windows,
// capacity and status next to three other panels saying much the same thing.
// The tile carries the numbers now; this is just the edit.
//
// FR-5.2 is the reason it exists: moving a window recomputes every LSOD on
// the page immediately. Nothing is cached — the engine is pure and
// synchronous, so the bars and ticks move with the save.

import { useState } from 'react';
import type { Voyage } from '@/shared/contracts';
import { Modal } from '@/components/shared/Modal';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { updateVoyageWindow } from '@/state/data';
import { STATION_LABEL } from '@/state/stationScope';
import { synth } from '@/lib/provenance';

interface Props {
  open: boolean;
  voyage: Voyage;
  onClose: () => void;
  onSaved: () => void;
}

export function VoyageEditor({ open, voyage, onClose, onSaved }: Props) {
  const [bhrFrom, setBhrFrom] = useState(voyage.arrival.bharati?.from.slice(0, 10) ?? '');
  const [bhrTo, setBhrTo] = useState(voyage.arrival.bharati?.to.slice(0, 10) ?? '');
  const [mtrFrom, setMtrFrom] = useState(voyage.arrival.maitri?.from.slice(0, 10) ?? '');
  const [mtrTo, setMtrTo] = useState(voyage.arrival.maitri?.to.slice(0, 10) ?? '');

  const field = {
    backgroundColor: 'var(--panel-raised)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-inner)',
    color: 'var(--text)',
  } as const;

  const save = () => {
    updateVoyageWindow(voyage.id, {
      arrival: {
        bharati: bhrFrom && bhrTo
          ? { from: new Date(bhrFrom).toISOString(), to: new Date(bhrTo).toISOString() }
          : voyage.arrival.bharati,
        maitri: mtrFrom && mtrTo
          ? { from: new Date(mtrFrom).toISOString(), to: new Date(mtrTo).toISOString() }
          : voyage.arrival.maitri,
      },
    });
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={'Arrival windows — ' + voyage.name}>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-micro tracking-[0.06em] px-1.5 py-0.5 rounded"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-3)' }}>
          {voyage.status.toUpperCase()}
        </span>
        <span className="font-mono text-caption" style={{ color: 'var(--text-3)' }}>
          season {voyage.season} · {voyage.capacityKg.min.toLocaleString()}–
          {voyage.capacityKg.max.toLocaleString()} kg
        </span>
        <ProvenanceBadge
          measurement={synth(voyage.name, '', 'confirmed NCPOR voyage schedule')}
          label="Voyage schedule"
        />
      </div>

      <p className="text-body-sm mb-3" style={{ color: 'var(--text-3)' }}>
        Moving a window recomputes every Last Safe Order Date on the page immediately. That is not
        a preview — the bars and ticks move with the save.
      </p>

      {(['bharati', 'maitri'] as const).map((id) => (
        <div key={id} className="mb-3">
          <p className="font-mono text-micro uppercase tracking-label mb-1" style={{ color: 'var(--text-4)' }}>
            {STATION_LABEL[id]} arrival
          </p>
          <div className="flex gap-2">
            <input
              type="date"
              value={id === 'bharati' ? bhrFrom : mtrFrom}
              onChange={(e) => (id === 'bharati' ? setBhrFrom : setMtrFrom)(e.target.value)}
              className="flex-1 px-3 py-2 font-mono text-body outline-none"
              style={field}
              aria-label={STATION_LABEL[id] + ' earliest arrival'}
            />
            <input
              type="date"
              value={id === 'bharati' ? bhrTo : mtrTo}
              onChange={(e) => (id === 'bharati' ? setBhrTo : setMtrTo)(e.target.value)}
              className="flex-1 px-3 py-2 font-mono text-body outline-none"
              style={field}
              aria-label={STATION_LABEL[id] + ' latest arrival'}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={save}
        className="w-full py-2.5 rounded-full text-body font-medium min-h-[44px]"
        style={{ backgroundColor: 'var(--act)', color: 'var(--bg)' }}
      >
        Apply and recompute
      </button>
    </Modal>
  );
}

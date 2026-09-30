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
    border: '1px solid var(--line-strong)',
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
    <Modal open={open} onClose={onClose} title={'Arrival dates — ' + voyage.name}>
      <div className="flex items-center gap-x-4 gap-y-2 flex-wrap mb-3.5 text-body-sm" style={{ color: 'var(--text-3)' }}>
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium capitalize"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
        >
          {voyage.status}
        </span>
        <span>
          Season <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{voyage.season}</span>
        </span>
        <span>
          Cargo <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>
            {voyage.capacityKg.min.toLocaleString()}–{voyage.capacityKg.max.toLocaleString()}
          </span> kg
        </span>
        <ProvenanceBadge
          measurement={synth(voyage.name, '', 'confirmed NCPOR voyage schedule')}
          label="Voyage schedule"
        />
      </div>

      <p className="text-body-sm mb-4 max-w-[60ch]" style={{ color: 'var(--text-2)' }}>
        Changing these dates immediately recalculates every order deadline on the page. This is not
        a preview — the bars and deadlines update as soon as you apply.
      </p>

      {(['bharati', 'maitri'] as const).map((id) => (
        <fieldset key={id} className="mb-4">
          <legend className="text-body font-medium mb-2" style={{ color: 'var(--text)' }}>
            {STATION_LABEL[id]} — ship arrival window
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>Earliest</span>
              <input
                type="date"
                value={id === 'bharati' ? bhrFrom : mtrFrom}
                onChange={(e) => (id === 'bharati' ? setBhrFrom : setMtrFrom)(e.target.value)}
                className="w-full px-3.5 min-h-10 font-mono text-body-sm outline-none"
                style={field}
                aria-label={STATION_LABEL[id] + ' earliest arrival'}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>Latest</span>
              <input
                type="date"
                value={id === 'bharati' ? bhrTo : mtrTo}
                onChange={(e) => (id === 'bharati' ? setBhrTo : setMtrTo)(e.target.value)}
                className="w-full px-3.5 min-h-10 font-mono text-body-sm outline-none"
                style={field}
                aria-label={STATION_LABEL[id] + ' latest arrival'}
              />
            </label>
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={save}
        className="w-full mt-1 px-5 rounded-full text-body-sm font-semibold min-h-10"
        style={{ backgroundColor: 'var(--act)', color: 'var(--bg)' }}
      >
        Apply and recalculate
      </button>
    </Modal>
  );
}

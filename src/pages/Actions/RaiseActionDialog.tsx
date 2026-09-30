// OWNER: Dev B
// Raise action — how HQ staff log a problem they heard about by phone, radio
// or email, for ONE station. Rules and the station console raise actions
// automatically; this is the human path from HQ. Priority is chosen by the
// person (the tier rules are shown beside each choice); the owner is optional
// and, if picked, is recorded as a normal assign step with its own note.

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Tier } from '@/shared/contracts';
import { useActionTransitions } from '@/shared/contracts';
import { Modal } from '@/components/shared/Modal';
import { ROSTER, getZones, type RosterMember } from '@/state/data';
import { STATION_LABEL } from '@/state/stationScope';
import { currentActor } from '@/state/auth';
import { formatShortIST } from '@/lib/time';
import { TIER_META } from './TierRail';

type StationId = 'bharati' | 'maitri';

const fieldStyle = {
  backgroundColor: 'var(--panel-raised)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-inner)',
  color: 'var(--text)',
} as const;

interface Props {
  /** The station the action is for; null keeps the dialog closed. */
  stationId: StationId | null;
  onClose: () => void;
  /** Called with the new action's id, so the page can open it. */
  onRaised: (id: string) => void;
}

export function RaiseActionDialog({ stationId, onClose, onRaised }: Props) {
  return (
    <Modal
      open={!!stationId}
      onClose={onClose}
      title={stationId ? `Raise an action for ${STATION_LABEL[stationId]}` : undefined}
    >
      {stationId && <RaiseForm key={stationId} stationId={stationId} onRaised={onRaised} />}
    </Modal>
  );
}

function RaiseForm({ stationId, onRaised }: { stationId: StationId; onRaised: (id: string) => void }) {
  const actor = currentActor();
  const transitions = useActionTransitions('hq', { name: actor.name, role: actor.role });
  const zones = getZones(stationId);
  const roster = ROSTER.filter((m) => m.stationId === stationId);

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [tier, setTier] = useState<Tier>('T2');
  const [zoneCode, setZoneCode] = useState('');
  const [owner, setOwner] = useState<RosterMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = !title.trim() ? 'Say what the problem is.' : null;

  const submit = async () => {
    if (missing) return;
    setBusy(true);
    setError(null);
    try {
      const id = await transitions.raise({
        stationId,
        tier,
        title: title.trim(),
        reason: details.trim() || title.trim(),
        zoneCode: zoneCode || undefined,
        trigger: {
          metricName: 'Reported by HQ staff',
          measurement: {
            value: 'staff-reported', unit: '',
            timestamp: new Date().toISOString(),
            source: `HQ staff entry — ${actor.name}`,
            provenance: 'LIVE', freshnessSeconds: 0,
          },
        },
      });
      if (owner) {
        await transitions.assign(id, { id: owner.id, name: owner.name, role: owner.role },
          'Owner chosen when the action was raised at HQ');
      }
      onRaised(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not raise the action');
      setBusy(false);
    }
  };

  const label = (htmlFor: string, text: string, hint?: string) => (
    <label htmlFor={htmlFor} className="block text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
      {text}
      {hint && <span className="font-normal" style={{ color: 'var(--text-3)' }}> — {hint}</span>}
    </label>
  );

  return (
    <div>
      <p className="text-body-sm mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        For a problem you heard about from the station or elsewhere. It joins {STATION_LABEL[stationId]}'s list
        as "not acknowledged yet", like any other action.
      </p>

      {label('raise-title', 'What is the problem?')}
      <input
        id="raise-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={90}
        placeholder="e.g. Boiler room smoke detector keeps sounding"
        className="w-full px-4 min-h-10 text-body outline-none mb-4"
        style={fieldStyle}
      />

      {label('raise-details', 'Details', 'optional')}
      <textarea
        id="raise-details"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={3}
        placeholder="Who reported it, what they saw, anything already tried"
        className="w-full px-4 py-2.5 text-body outline-none mb-4"
        style={fieldStyle}
      />

      <p className="text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>How urgent?</p>
      <div className="grid grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label="Priority">
        {(Object.keys(TIER_META) as Tier[]).map((t) => {
          const picked = t === tier;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={picked}
              onClick={() => setTier(t)}
              className="flex items-center gap-2.5 px-3.5 min-h-11 text-left rounded-lg"
              style={{
                backgroundColor: picked ? 'var(--panel-alt)' : 'var(--panel-raised)',
                border: `1px solid ${picked ? TIER_META[t].color : 'var(--line)'}`,
              }}
            >
              <span
                className="shrink-0"
                style={{ width: 8, height: 8, backgroundColor: TIER_META[t].color, borderRadius: TIER_META[t].square ? 2 : 999 }}
                aria-hidden
              />
              <span className="font-mono text-body-sm font-medium" style={{ color: 'var(--text)' }}>{t}</span>
              <span className="text-body-sm leading-snug" style={{ color: 'var(--text-3)' }}>{TIER_META[t].label}</span>
            </button>
          );
        })}
      </div>

      {zones.length > 0 && (
        <>
          {label('raise-zone', 'Where?', 'optional')}
          <select
            id="raise-zone"
            value={zoneCode}
            onChange={(e) => setZoneCode(e.target.value)}
            className="w-full px-4 min-h-10 text-body outline-none mb-4"
            style={fieldStyle}
          >
            <option value="">Whole station / not sure</option>
            {zones.map((z) => <option key={z.code} value={z.code}>{z.code} — {z.name}</option>)}
          </select>
        </>
      )}

      <p className="text-body-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
        Owner <span className="font-normal" style={{ color: 'var(--text-3)' }}>— optional, you can assign later</span>
      </p>
      <ul className="flex flex-col gap-1.5 mb-4">
        {roster.map((m) => {
          const picked = owner?.id === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setOwner(picked ? null : m)}
                aria-pressed={picked}
                className="w-full flex items-center gap-3 flex-wrap px-4 min-h-10 text-left rounded-lg hover:bg-[var(--panel-alt)]"
                style={{
                  backgroundColor: 'var(--panel-raised)',
                  border: `1px solid ${picked ? 'var(--text-3)' : 'var(--line)'}`,
                }}
              >
                <span className="w-4 shrink-0" aria-hidden>
                  {picked && <Check size={16} style={{ color: 'var(--text)' }} />}
                </span>
                <span className="text-body font-medium" style={{ color: 'var(--text)' }}>{m.name}</span>
                <span className="text-body-sm ml-auto" style={{ color: 'var(--text-3)' }}>{m.role}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="text-body-sm mb-3" style={{ color: 'var(--act-soft)' }} role="alert">{error}</p>
      )}

      <p className="text-body-sm mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        Recorded as <span style={{ color: 'var(--text-2)' }}>{actor.name}</span> at{' '}
        <span className="font-mono tabular-nums">{formatShortIST(new Date())}</span>, in the action's history and
        the record history.
      </p>

      <button
        type="button"
        disabled={!!missing || busy}
        onClick={submit}
        title={missing ?? undefined}
        className="w-full py-2.5 rounded-full text-body font-semibold min-h-10"
        style={{
          backgroundColor: missing || busy ? 'var(--panel-raised)' : 'var(--act)',
          color: missing || busy ? 'var(--text-3)' : 'var(--bg)',
        }}
      >
        {busy ? 'Recording…' : 'Raise action'}
      </button>
      {missing && (
        <p className="text-body-sm mt-2 text-center" style={{ color: 'var(--text-3)' }}>{missing}</p>
      )}
    </div>
  );
}

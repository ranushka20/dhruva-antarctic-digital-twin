// OWNER: Dev B
// AsyncButton — a plain <button> for work that returns a promise.
// idle → pending (spinner, disabled, aria-busy) → done (drawn check, small
// bump) → idle; a rejection shakes the button and returns to idle.
// The spinner only appears if the work takes longer than 120ms, so instant
// local writes go straight to "done" instead of flashing a spinner.
// Styling stays with the call site — pass className/style as for a button.

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Status = 'idle' | 'pending' | 'done' | 'error';

interface AsyncButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> {
  onClick: () => unknown;
  children: ReactNode;
  pendingLabel?: ReactNode;
  /** Shown for ~1.2s after success. Pass null to skip the done state. */
  doneLabel?: ReactNode | null;
}

const SPINNER_DELAY_MS = 120;
const DONE_MS = 1200;

export function AsyncButton({
  onClick, children, pendingLabel, doneLabel = 'Done', disabled, className = '', ...rest
}: AsyncButtonProps) {
  const [status, setStatus] = useState<Status>('idle');
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const handle = async () => {
    if (status === 'pending') return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    let settled = false;
    later(() => { if (!settled) setStatus('pending'); }, SPINNER_DELAY_MS);
    try {
      await onClick();
      settled = true;
      if (doneLabel === null) { setStatus('idle'); return; }
      setStatus('done');
      later(() => setStatus('idle'), DONE_MS);
    } catch (err) {
      settled = true;
      setStatus('error');
      later(() => setStatus('idle'), 400);
      throw err;
    }
  };

  const label =
    status === 'pending' ? (
      <><span className="m-spinner" aria-hidden />{pendingLabel ?? children}</>
    ) : status === 'done' ? (
      <><CheckMark />{doneLabel}</>
    ) : (
      children
    );

  return (
    <button
      type="button"
      {...rest}
      className={`m-async ${className}`}
      data-status={status}
      aria-busy={status === 'pending' || undefined}
      disabled={disabled || status === 'pending'}
      onClick={() => { void handle().catch(() => {}); }}
    >
      {/* keyed on status so each state re-enters with the swap animation */}
      <span key={status} className="m-async-label" aria-live="polite">{label}</span>
    </button>
  );
}

function CheckMark() {
  return (
    <svg className="m-check shrink-0" width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 6.3 5 8.7l4.5-5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// OWNER: Dev B
// Popover — positioned overlay on --panel-alt.
// Used by ProvenanceBadge hover popover and other in-context info panels.

import { type ReactNode, useState, useRef, useEffect } from 'react';
import { usePresence } from '@/hooks/usePresence';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Popover({ trigger, children, className = '' }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { mounted, state } = usePresence(open, 120);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {mounted && (
        <div
          data-state={state}
          className="m-pop absolute z-50 mt-1.5 rounded-xl p-4 min-w-64 shadow-lg"
          style={{
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--line-strong)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.40)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

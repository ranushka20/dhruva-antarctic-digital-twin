// OWNER: Dev B
// Popover — positioned overlay on --panel-alt.
// Used by ProvenanceBadge hover popover and other in-context info panels.

import { type ReactNode, useState, useRef, useEffect } from 'react';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Popover({ trigger, children, className = '' }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
      {open && (
        <div
          className="absolute z-50 mt-1 rounded-lg p-3 min-w-48 shadow-lg"
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

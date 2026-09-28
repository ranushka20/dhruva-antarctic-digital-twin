// OWNER: Dev B
// Drawer — slide-over overlay panel on --panel-alt.
// See FRONTEND.md §7. Slides + fades in, and plays a faster exit before
// unmounting (usePresence) with its last content still showing.

import { type ReactNode, useEffect } from 'react';
import { usePresence, useLastWhileOpen } from '@/hooks/usePresence';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, title: titleProp, children: childrenProp, className = '' }: DrawerProps) {
  const { mounted, state } = usePresence(open, 160);
  const title = useLastWhileOpen(open, titleProp);
  const children = useLastWhileOpen(open, childrenProp);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        data-overlay
        data-state={state}
        className="m-backdrop fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(10,13,12,0.60)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        data-overlay
        data-state={state}
        className={`m-sheet fixed top-0 right-0 bottom-0 z-50 w-96 max-w-[90vw] overflow-y-auto ${className}`}
        style={{
          backgroundColor: 'var(--panel-alt)',
          borderLeft: '1px solid var(--line-strong)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.40)',
        }}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-title font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              data-press="icon"
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--panel-raised)]"
              style={{ color: 'var(--text-3)' }}
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </aside>
    </>
  );
}

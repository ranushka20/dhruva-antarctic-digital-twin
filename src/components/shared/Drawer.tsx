// OWNER: Dev B
// Drawer — slide-over overlay panel on --panel-alt.
// See FRONTEND.md §7.

import { type ReactNode, useEffect } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, title, children, className = '' }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(10,13,12,0.60)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-96 max-w-[90vw] overflow-y-auto ${className}`}
        style={{
          backgroundColor: 'var(--panel-alt)',
          borderLeft: '1px solid var(--line-strong)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.40)',
        }}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-[13.5px] font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
              {title}
            </h3>
            <button
              onClick={onClose}
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

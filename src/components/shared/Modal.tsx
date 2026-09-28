// OWNER: Dev B
// Modal — centred overlay dialog on --panel-alt. Scales up from 0.97 about
// its centre (a modal has no trigger to grow from) and plays a faster exit.

import { type ReactNode, useEffect } from 'react';
import { usePresence, useLastWhileOpen } from '@/hooks/usePresence';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title: titleProp, children: childrenProp, className = '' }: ModalProps) {
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
      <div
        data-overlay
        data-state={state}
        className="m-backdrop fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(10,13,12,0.65)' }}
        onClick={onClose}
      />
      <div
        data-overlay
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ pointerEvents: state === 'closed' ? 'none' : undefined }}
      >
        <div
          data-state={state}
          role="dialog"
          aria-modal="true"
          className={`m-dialog rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto ${className}`}
          style={{
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--line-strong)',
            boxShadow: '0 16px 64px rgba(0,0,0,0.50)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="text-title font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                {title}
              </h3>
              <button
                onClick={onClose}
                data-press="icon"
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--panel-raised)]"
                style={{ color: 'var(--text-3)' }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
          )}
          <div className="p-5">{children}</div>
        </div>
      </div>
    </>
  );
}

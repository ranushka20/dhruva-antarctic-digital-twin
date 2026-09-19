// PageHeader — standard second row: optional back pill, page title, controls, clock.
// Per FRONTEND.md §6.2.

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  children?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  backTo,
  backLabel = 'Back',
  children,
  rightContent,
  className = '',
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`flex items-center gap-3 h-[48px] px-5 shrink-0 ${className}`}
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors hover:bg-[var(--panel-alt)]"
          style={{
            color: 'var(--text-2)',
            fontFamily: 'var(--font-body)',
            border: '1px solid var(--line)',
          }}
        >
          <ArrowLeft size={12} />
          {backLabel}
        </button>
      )}

      <h1
        className="text-[27px] font-medium"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
      >
        {title}
      </h1>

      {children && <div className="flex items-center gap-2">{children}</div>}

      <div className="flex-1" />

      {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
    </div>
  );
}

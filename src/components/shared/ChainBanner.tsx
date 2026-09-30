// OWNER: Dev B
// ChainBanner — NFR-7.2: a broken chain surfaces a persistent,
// non-dismissable banner across the WHOLE app, not only on /compliance.
// There is deliberately no close button.

import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { getChainStatus } from '@/lib/hashChain';
import { useStoreValue } from '@/state/useStore';

export function ChainBanner({ linkToAudit = true }: { linkToAudit?: boolean }) {
  const status = useStoreValue(() => getChainStatus('hq'));
  if (!status || status.ok) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 flex-wrap px-6 py-3 shrink-0"
      style={{
        backgroundColor: 'rgba(242,107,33,0.14)',
        borderBottom: '1px solid var(--act)',
      }}
    >
      <ShieldAlert size={15} style={{ color: 'var(--act)' }} aria-hidden />
      <span className="text-body" style={{ color: 'var(--act-soft)', fontFamily: 'var(--font-body)' }}>
        Audit chain broken at entry{' '}
        <span className="font-mono">#{status.brokenAt}</span>. Records after this point cannot be
        shown as unaltered. Bulk operations are disabled until the chain is reviewed.
      </span>
      {linkToAudit && (
        <Link
          to="/compliance?tab=audit"
          className="ml-auto text-body-sm font-medium px-4 min-h-10 rounded-full shrink-0"
          style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', fontFamily: 'var(--font-body)' }}
        >
          Open audit log
        </Link>
      )}
    </div>
  );
}

/** Convenience for pages that need to know whether writes should be gated. */
export function useChainBroken(): boolean {
  const status = useStoreValue(() => getChainStatus('hq'));
  return Boolean(status && !status.ok);
}

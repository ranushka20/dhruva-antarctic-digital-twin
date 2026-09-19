// Overview page — Coming soon placeholder
// Route: /
// OWNER: Dev B

import { PageHeader } from '@/components/shell/PageHeader';

export default function OverviewPage() {
  return (
    <div className="p-5">
      <PageHeader title="HQ Overview" />
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-[20px] font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            HQ Overview
          </h2>
          <p className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
            Coming soon — owned by Dev B
          </p>
        </div>
      </div>
    </div>
  );
}

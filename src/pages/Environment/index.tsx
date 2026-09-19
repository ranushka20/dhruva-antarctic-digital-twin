// Environment page — Coming soon placeholder
// Route: /environment
// OWNER: Dev A

import { PageHeader } from '@/components/shell/PageHeader';

export default function EnvironmentPage() {
  return (
    <div className="p-5">
      <PageHeader title="Environment & Data Sources" />
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-[20px] font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            Environment & Data Sources
          </h2>
          <p className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
            Coming soon — owned by Dev A
          </p>
        </div>
      </div>
    </div>
  );
}

// Sandbox page — Coming soon placeholder
// Route: /sandbox
// OWNER: Dev A

import { PageHeader } from '@/components/shell/PageHeader';

export default function SandboxPage() {
  return (
    <div className="p-5">
      <PageHeader title="Research Sandbox" />
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-[20px] font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            Research Sandbox
          </h2>
          <p className="font-mono text-[11px]" style={{ color: 'var(--sim-soft)' }}>
            Coming soon — owned by Dev A
          </p>
        </div>
      </div>
    </div>
  );
}

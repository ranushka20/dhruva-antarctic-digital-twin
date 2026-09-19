// Comms page — Coming soon placeholder
// Route: /comms
// OWNER: Dev B

import { PageHeader } from '@/components/shell/PageHeader';

export default function CommsPage() {
  return (
    <div className="p-5">
      <PageHeader title="Sync & Comms" />
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-[20px] font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            Sync & Communications
          </h2>
          <p className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
            Coming soon — owned by Dev B
          </p>
        </div>
      </div>
    </div>
  );
}

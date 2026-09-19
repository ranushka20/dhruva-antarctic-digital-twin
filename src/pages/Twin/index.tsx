// Twin page — Coming soon placeholder (the real 3D viewer from src/twin/ will be wired here later)
// Route: /stations/:id/twin
// OWNER: Dev A

import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/shell/PageHeader';

export default function TwinPage() {
  const { id } = useParams<{ id: string }>();
  const stationName = id === 'maitri' ? 'Maitri' : 'Bharati';

  return (
    <div className="p-5">
      <PageHeader title="Digital Twin" backTo="/" backLabel="← HQ" />
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-[20px] font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            {stationName} Digital Twin
          </h2>
          <p className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
            Coming soon — owned by Dev A
          </p>
          <p className="font-mono text-[9.5px] mt-2" style={{ color: 'var(--text-4)' }}>
            The existing 3D model in src/twin/ will be integrated here
          </p>
        </div>
      </div>
    </div>
  );
}

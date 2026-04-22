import { Suspense } from 'react';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="studio-root"
      style={{
        minHeight: '100dvh',
        background: 'var(--bg-main)',
        color: 'var(--text-primary)',
      }}
    >
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#000000' }} />}>{children}</Suspense>
    </div>
  );
}

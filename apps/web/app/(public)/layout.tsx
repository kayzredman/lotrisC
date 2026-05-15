/**
 * Public layout — no Clerk auth, no sidebar.
 * Used by the external-facing /request web form.
 */
import { LotrisLogo } from '@/components/brand/lotris-mark';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Minimal header bar */}
      <header style={{
        background: 'var(--sidebar-bg)',
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <LotrisLogo variant="dark" markHeight={22} uid="pub" />
      </header>

      {/* Page content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
        {children}
      </main>
    </div>
  );
}

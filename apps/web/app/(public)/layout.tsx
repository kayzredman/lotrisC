/**
 * Public layout — no Clerk auth, no sidebar.
 * Used by the external-facing /request web form.
 */
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
        <span style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.3px',
        }}>
          Lotris
        </span>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
        {children}
      </main>
    </div>
  );
}

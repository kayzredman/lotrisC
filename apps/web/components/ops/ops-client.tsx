'use client';

import Link from 'next/link';
import { LogIn, LogOut, ExternalLink } from 'lucide-react';
import { LotrisMark } from '@/components/brand/lotris-mark';
import { SystemHealthClient } from '@/components/system-health/system-health-client';
import { OpsProviders } from '@/components/ops/ops-providers';
import { useAuth } from '@/lib/auth/auth-context';
import { useCurrentUser } from '@/lib/api/hooks/useAuth';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPERADMIN']);

function OpsGate() {
  const { accessToken, logout, isLoading: authLoading } = useAuth();
  const { data: me, isLoading: userLoading } = useCurrentUser();

  const loading = authLoading || (Boolean(accessToken) && userLoading);
  const isAdmin = me?.roleName ? ADMIN_ROLES.has(me.roleName) : false;

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        Loading session…
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="v2-card" style={{ maxWidth: 420, margin: '48px auto', padding: 32, textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
          Sign in required
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Ops console requires an admin account. Sign in, then return here.
        </p>
        <Link href="/login?redirect=/ops" className="v2-btn v2-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <LogIn size={14} />
          Sign in
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="v2-card" style={{ maxWidth: 420, margin: '48px auto', padding: 32, textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
          Admin access only
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Signed in as {me?.email ?? 'unknown'}. System health controls are limited to ADMIN and SUPERADMIN roles.
        </p>
        <Link href="/dashboard" className="v2-btn v2-btn-secondary">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <SystemHealthClient />
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 24, textAlign: 'center' }}>
        Tip: bookmark <code>/ops</code> — this page runs outside the main app shell.
        If Next.js returns 500 after a prod build, run <code>pnpm web:dev-reset</code>.
      </p>
    </div>
  );
}

function OpsTopbar() {
  const { accessToken, logout, session } = useAuth();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LotrisMark height={22} uid="ops" />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Lotris Ops
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>System health · independent console</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {session && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {session.email}
          </span>
        )}
        <Link href="/dashboard" className="v2-btn v2-btn-ghost v2-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ExternalLink size={12} />
          Main app
        </Link>
        {accessToken ? (
          <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={logout} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={12} />
            Sign out
          </button>
        ) : (
          <Link href="/login?redirect=/ops" className="v2-btn v2-btn-primary v2-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <LogIn size={12} />
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

function OpsShell() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <OpsTopbar />
      <OpsGate />
    </div>
  );
}

export default function OpsClient() {
  return (
    <OpsProviders>
      <OpsShell />
    </OpsProviders>
  );
}

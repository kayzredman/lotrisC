'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Ticket, BarChart2 } from 'lucide-react';
import { LotrisLogo } from '@/components/brand/lotris-mark';
import { useLogin, useRegister } from '@/lib/api/hooks/useAuth';
import { apiFetch } from '@/lib/api/client';
import { buildMicrosoftLoginUrl, MicrosoftSignInButton } from '@/components/auth/microsoft-sign-in-button';
import styles from './login.module.css';

type Tab = 'login' | 'register';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

  useEffect(() => {
    const msError = searchParams.get('microsoft_error');
    if (msError) setError(msError);
  }, [searchParams]);

  useEffect(() => {
    void apiFetch<{ identity?: boolean; microsoft?: boolean }>('/api/v1/auth/providers')
      .then((p) => setMicrosoftEnabled(Boolean(p.microsoft)))
      .catch(() => setMicrosoftEnabled(false));
  }, []);

  function handleMicrosoftLogin() {
    window.location.href = buildMicrosoftLoginUrl(redirect);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (tab === 'login') {
        await loginMutation.mutateAsync({ email, password });
      } else {
        await registerMutation.mutateAsync({
          email,
          password,
          fullName,
          tenantName: tenantName || undefined,
        });
      }
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }

  return (
    <div className={styles.loginCard}>
      <div className={styles.formWelcome}>
        <div className={styles.formLogo}>
          <LotrisLogo variant="light" markHeight={26} uid="login-form" />
        </div>
        <h2 className={styles.formWelcomeHeading}>
          {tab === 'login' ? 'Welcome back' : 'Create your workspace'}
        </h2>
        <p className={styles.formWelcomeSub}>
          {tab === 'login'
            ? 'Sign in to your workspace to continue.'
            : 'Register with email and password to get started.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={tab === 'login' ? 'v2-btn v2-btn-primary v2-btn-sm' : 'v2-btn v2-btn-secondary v2-btn-sm'}
          style={{ flex: 1, minHeight: 44 }}
          onClick={() => setTab('login')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={tab === 'register' ? 'v2-btn v2-btn-primary v2-btn-sm' : 'v2-btn v2-btn-secondary v2-btn-sm'}
          style={{ flex: 1, minHeight: 44 }}
          onClick={() => setTab('register')}
        >
          Register
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className={styles.loginForm}>
        {tab === 'register' && (
          <>
            <label htmlFor="fullName" className={styles.fieldLabel}>Full name</label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={styles.fieldInput}
            />

            <label htmlFor="tenantName" className={styles.fieldLabel}>Organization name (optional)</label>
            <input
              id="tenantName"
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className={styles.fieldInput}
              placeholder="Creates a new tenant when provided"
            />
          </>
        )}

        <label htmlFor="email" className={styles.fieldLabel}>Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.fieldInput}
        />

        <label htmlFor="password" className={styles.fieldLabel}>Password</label>
        <input
          id="password"
          type="password"
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.fieldInput}
        />

        {error && (
          <p role="alert" style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={styles.submitButton}
          style={{ minHeight: 44 }}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Please wait…' : tab === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {tab === 'login' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: 'var(--text-muted)', fontSize: 12 }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            or
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <MicrosoftSignInButton
            fullWidth
            onClick={handleMicrosoftLogin}
            disabled={!microsoftEnabled}
            hint={
              microsoftEnabled
                ? 'You will be redirected to Microsoft to enter your work email and password — the same sign-in used by Copilot and Microsoft 365.'
                : 'Microsoft sign-in requires Entra on the deployment (see docs/INTELLIGENCE-ENTERPRISE-SETUP.md).'
            }
          />
        </>
      )}

      <div className={styles.securityNote}>
        <ShieldCheck size={12} strokeWidth={2.5} />
        Secured with TLS 1.3 · SOC 2 Type II certified
      </div>
    </div>
  );
}

export function LoginBrandingPanel() {
  return (
    <div className={styles.loginPanel}>
      <div className={styles.panelLogo}>
        <LotrisLogo variant="dark" markHeight={34} uid="login-panel" showTagline />
      </div>

      <h1 className={styles.panelHeadline}>
        Your helpdesk,<br />fully in command.
      </h1>
      <p className={styles.panelSub}>
        Track tickets, measure KPI performance, and surface insights — all in one enterprise-grade platform.
      </p>

      <div className={styles.panelFeatures}>
        <div className={styles.panelFeature}>
          <div className={styles.featureIcon}>
            <Ticket size={14} strokeWidth={1.8} />
          </div>
          <div className={styles.featureText}>
            <h4>Unified Ticket Management</h4>
            <p>Assign, escalate, and track tickets from a single view with full SLA visibility.</p>
          </div>
        </div>
        <div className={styles.panelFeature}>
          <div className={styles.featureIcon}>
            <BarChart2 size={14} strokeWidth={1.8} />
          </div>
          <div className={styles.featureText}>
            <h4>Real-Time KPI Dashboards</h4>
            <p>Monitor resolution rates, CSAT, and agent performance with live data.</p>
          </div>
        </div>
        <div className={styles.panelFeature}>
          <div className={styles.featureIcon}>
            <ShieldCheck size={14} strokeWidth={1.8} />
          </div>
          <div className={styles.featureText}>
            <h4>Audit &amp; Compliance Ready</h4>
            <p>Full activity logs, role-based access, and exportable audit trails.</p>
          </div>
        </div>
      </div>

      <div className={styles.panelStats}>
        <div className={styles.panelStat}>
          <div className={styles.panelStatVal}>247</div>
          <div className={styles.panelStatLbl}>Open tickets</div>
        </div>
        <div className={styles.panelStat}>
          <div className={styles.panelStatVal}>94%</div>
          <div className={styles.panelStatLbl}>SLA rate</div>
        </div>
        <div className={styles.panelStat}>
          <div className={styles.panelStatVal}>4.7</div>
          <div className={styles.panelStatLbl}>Avg CSAT</div>
        </div>
      </div>

      <div className={styles.panelFooter}>
        © 2026 Lotris · Enterprise Edition · v2.4.1
      </div>
    </div>
  );
}

import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Ticket, BarChart2, ShieldCheck } from 'lucide-react';
import styles from './login.module.css';

export const metadata: Metadata = { title: 'Sign in — Lotris' };

export default function LoginPage() {
  return (
    <div className={styles.loginOuter}>
      <div className={styles.loginShell}>

        {/* ── Left branding panel ── */}
        <div className={styles.loginPanel}>
          <div className={styles.panelLogo}>
            <div className={styles.panelLogoIcon}>L</div>
            <span className={styles.panelLogoText}>Lotris</span>
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

        {/* ── Right form area ── */}
        <div className={styles.loginFormArea}>
          <div className={styles.loginCard}>

            {/* Our own heading — Clerk's header is hidden via appearance */}
            <div className={styles.formWelcome}>
              <div className={styles.formLogo}>
                <div className={styles.formLogoIcon}>L</div>
                <span className={styles.formLogoText}>Lotris</span>
              </div>
              <h2 className={styles.formWelcomeHeading}>Welcome back</h2>
              <p className={styles.formWelcomeSub}>Sign in to your workspace to continue.</p>
            </div>

            {/* Clerk widget — card chrome is applied via appearance.elements.card */}
            <SignIn
              appearance={{
                layout: {
                  unsafe_disableDevelopmentModeWarnings: true,
                },
                variables: {
                  colorBackground: '#FFFFFF',
                  colorText: '#0F172A',
                  colorTextSecondary: '#64748B',
                  colorInputBackground: '#FFFFFF',
                  colorInputText: '#0F172A',
                  colorPrimary: '#4F46E5',
                  colorTextOnPrimaryBackground: '#FFFFFF',
                  colorNeutral: '#64748B',
                  borderRadius: '6px',
                  fontFamily: 'Inter, -apple-system, sans-serif',
                  fontSize: '13.5px',
                  spacingUnit: '14px',
                },
                elements: {
                  rootBox: { width: '100%' },
                  card: {
                    width: '100%',
                    maxWidth: '100%',
                    margin: '0',
                    padding: '28px 28px 20px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E8EDF3',
                    borderRadius: '10px',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                  },
                  // Hide Clerk's own header — we render ours above
                  header: { display: 'none' },
                  // Form layout
                  main: { gap: '14px' },
                  form: { gap: '12px' },
                  formFields: { gap: '12px' },
                  formFieldRow: { gap: '12px' },
                  // Labels
                  formFieldLabel: {
                    fontSize: '12.5px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px',
                  },
                  // Inputs — taller, clean border, focus ring
                  formFieldInput: {
                    border: '1.5px solid #E2E8F0',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    backgroundColor: '#FAFBFC',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    boxShadow: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    lineHeight: '1.4',
                  },
                  formFieldInputShowPasswordButton: { color: '#94A3B8' },
                  // Primary CTA button — solid indigo, prominent
                  formButtonPrimary: {
                    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    padding: '11px 16px',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                    letterSpacing: '0.01em',
                    border: 'none',
                    marginTop: '4px',
                    transition: 'opacity 0.15s, box-shadow 0.15s',
                  },
                  // Social OAuth buttons
                  socialButtonsBlockButton: {
                    border: '1.5px solid #E8EDF3',
                    color: '#1E293B',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    padding: '9px 14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'border-color 0.15s, background 0.15s',
                  },
                  socialButtonsBlockButtonText: { color: '#1E293B', fontWeight: '500' },
                  // Divider
                  dividerLine: { backgroundColor: '#E8EDF3' },
                  dividerText: { color: '#94A3B8', fontSize: '11px', fontWeight: '500' },
                  // Footer "Don't have an account?"
                  footerActionLink: { color: '#4F46E5', fontWeight: '600' },
                  footerActionText: { color: '#94A3B8', fontSize: '12px' },
                  footer: {
                    backgroundColor: 'transparent',
                    paddingTop: '0',
                    marginTop: '4px',
                  },
                  // Clerk branding + dev mode — also hidden via CSS globals in login.module.css
                  badge: { display: 'none' },
                  footerPages: { display: 'none' },
                  identityPreviewText: { color: '#0F172A' },
                  identityPreviewEditButton: { color: '#4F46E5' },
                  alternativeMethodsBlockButton: {
                    border: '1.5px solid #E8EDF3',
                    color: '#0F172A',
                    fontSize: '13px',
                    borderRadius: '6px',
                  },
                },
              }}
              redirectUrl="/dashboard"
              afterSignInUrl="/dashboard"
            />

            {/* Security note */}
            <div className={styles.securityNote}>
              <ShieldCheck size={12} strokeWidth={2.5} />
              Secured with TLS 1.3 · SOC 2 Type II certified
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

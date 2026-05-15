import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Ticket, BarChart2, ShieldCheck } from 'lucide-react';
import { LotrisLogo } from '@/components/brand/lotris-mark';
import styles from '../../login/[[...sign-in]]/login.module.css';

export const metadata: Metadata = { title: 'Accept invite — Lotris' };

export default function SignUpPage() {
  return (
    <div className={styles.loginOuter}>
      <div className={styles.loginShell}>

        {/* ── Left branding panel ── */}
        <div className={styles.loginPanel}>
          <div className={styles.panelLogo}>
            <LotrisLogo variant="dark" markHeight={34} uid="signup-panel" showTagline />
          </div>

          <h1 className={styles.panelHeadline}>
            You&apos;ve been invited<br />to Lotris.
          </h1>
          <p className={styles.panelSub}>
            Create your account to start managing tickets, tracking KPIs, and collaborating with your team.
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

          <div className={styles.panelFooter}>
            © 2026 Lotris · Enterprise Edition · v2.4.1
          </div>
        </div>

        {/* ── Right form area ── */}
        <div className={styles.loginFormArea}>
          <div className={styles.loginCard}>

            <div className={styles.formWelcome}>
              <div className={styles.formLogo}>
                <LotrisLogo variant="light" markHeight={26} uid="signup-form" />
              </div>
              <h2 className={styles.formWelcomeHeading}>Create your account</h2>
              <p className={styles.formWelcomeSub}>Complete your invite to get started.</p>
            </div>

            <SignUp
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
                  header: { display: 'none' },
                  main: { gap: '14px' },
                  form: { gap: '12px' },
                  formFields: { gap: '12px' },
                  formFieldRow: { gap: '12px' },
                  formFieldLabel: {
                    fontSize: '12.5px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px',
                  },
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
                  },
                  footerActionLink: { color: '#4F46E5', fontWeight: '500' },
                  identityPreviewText: { color: '#374151', fontSize: '13px' },
                  identityPreviewEditButton: { color: '#4F46E5' },
                  dividerLine: { background: '#E2E8F0' },
                  dividerText: { color: '#94A3B8', fontSize: '12px' },
                  socialButtonsBlockButton: {
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#374151',
                    padding: '9px 12px',
                  },
                  alert: { borderRadius: '6px', fontSize: '13px' },
                  alertText: { fontSize: '13px' },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

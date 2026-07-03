import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginBrandingPanel, LoginForm } from './login-form';
import styles from './login.module.css';

export const metadata: Metadata = { title: 'Sign in — Lotris' };

export default function LoginPage() {
  return (
    <div className={styles.loginOuter}>
      <div className={styles.loginShell}>
        <LoginBrandingPanel />

        <div className={styles.loginFormArea}>
          <Suspense fallback={<div className={styles.loginCard}>Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

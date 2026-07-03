'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TOKEN_KEY } from '@/lib/auth/auth-context';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('access_token');
    const returnUrl = searchParams.get('returnUrl') ?? '/dashboard';

    if (!token) {
      setError('Microsoft sign-in did not return a token.');
      return;
    }

    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    window.location.replace(returnUrl);
  }, [searchParams]);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#dc2626' }}>{error}</p>
        <a href="/login" className="v2-btn v2-btn-primary v2-btn-sm" style={{ marginTop: 16, display: 'inline-block' }}>
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
      Completing Microsoft sign-in…
    </div>
  );
}

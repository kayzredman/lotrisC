'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LandingPage } from '@/components/landing/landing-page';
import { TOKEN_KEY } from '@/lib/auth/auth-context';

export function HomePageClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      router.replace('/dashboard');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;
  return <LandingPage />;
}

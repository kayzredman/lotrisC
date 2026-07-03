'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStatus } from '@/lib/api/hooks/useOnboarding';

/**
 * OnboardingGuard — wraps the (app) layout.
 *
 * Queries onboarding.getStatus and redirects ADMIN+ to /onboarding
 * when the wizard has not been completed (status === 'PENDING').
 *
 * Non-admin roles are never redirected — the procedure itself enforces
 * adminProcedure so the query will return an error for non-admins, which
 * we silently ignore (keep them on their current route).
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, error } = useOnboardingStatus({ retry: false, staleTime: 60_000 });

  useEffect(() => {
    if (error) return; // non-admin role — do not redirect
    if (data?.status === 'PENDING') {
      router.replace('/onboarding');
    }
  }, [data, error, router]);

  return <>{children}</>;
}

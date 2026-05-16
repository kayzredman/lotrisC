import { Providers } from '@/components/providers';

export const dynamic = 'force-dynamic';
import { AppShell } from '@/components/layout/app-shell';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <OnboardingGuard>
        <AppShell>{children}</AppShell>
      </OnboardingGuard>
    </Providers>
  );
}

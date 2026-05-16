import { Providers } from '@/components/providers';

export const dynamic = 'force-dynamic';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}

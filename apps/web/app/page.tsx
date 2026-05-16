import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing/landing-page';

export const dynamic = 'force-dynamic';

/** Authenticated users go straight to the app; everyone else sees the marketing page. */
export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');
  return <LandingPage />;
}

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { SystemHealthClient } from '@/components/system-health/system-health-client';

export const metadata: Metadata = { title: 'System Health — Lotris' };

/** System Health Monitoring — ADMIN / SUPERADMIN only */
export default async function SystemHealthPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    redirect('/dashboard');
  }

  return <SystemHealthClient />;
}

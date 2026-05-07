import type { Metadata } from 'next';
import { SystemHealthClient } from '@/components/system-health/system-health-client';

export const metadata: Metadata = { title: 'System Health | Lotris' };

/** Role enforcement is handled by tRPC server-side. */
export default function SystemHealthPage() {
  return <SystemHealthClient />;
}

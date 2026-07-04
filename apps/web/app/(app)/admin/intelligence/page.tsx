import { Metadata } from 'next';
import IntelligenceAdminClient from '@/components/admin/intelligence-admin-client';

export const metadata: Metadata = { title: 'Intelligence and AI Setup | Lotris' };

export default function IntelligenceAdminPage() {
  return <IntelligenceAdminClient />;
}

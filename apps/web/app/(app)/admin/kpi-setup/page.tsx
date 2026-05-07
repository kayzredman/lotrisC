import { Metadata } from 'next';
import KpiSetupClient from '@/components/admin/kpi-setup-client';

export const metadata: Metadata = { title: 'KPI Setup | Lotris' };

export default function KpiSetupPage() {
  return <KpiSetupClient />;
}

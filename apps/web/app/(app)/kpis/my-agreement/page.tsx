import type { Metadata } from 'next';
import KpiMyAgreement from '@/components/kpis/kpi-my-agreement';

export const metadata: Metadata = { title: 'My KPI Agreement | Lotris' };

export default function KpiMyAgreementPage() {
  return <KpiMyAgreement />;
}

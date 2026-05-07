import type { Metadata } from 'next';
import KpiAgreementBuilder from '@/components/kpis/kpi-agreement-builder';

export const metadata: Metadata = { title: 'KPI Agreement Builder | Lotris' };

export default function KpiAgreementsPage() {
  return <KpiAgreementBuilder />;
}

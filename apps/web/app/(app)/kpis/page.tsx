import { Metadata } from 'next';
import KpiPageClient from '@/components/kpis/kpi-page-client';

export const metadata: Metadata = { title: 'KPIs | Lotris' };

export default function KpisPage() {
  return <KpiPageClient />;
}


import { Metadata } from 'next';
import KpiPageClient from '@/components/kpis/kpi-page-client';

export const metadata: Metadata = {
  title: 'KPIs | Lotris',
  description: 'KPI definitions, assignments, agreements and performance dashboard.',
};

export default function KpisPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">KPI Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define metrics, assign targets, manage agreements and track performance.
        </p>
      </div>
      <KpiPageClient />
    </div>
  );
}

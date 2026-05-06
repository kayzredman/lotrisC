import type { Metadata } from 'next';
import { ReportsLayout } from '../../../components/reports/reports-layout';

export const metadata: Metadata = { title: 'Reports' };

export default function ReportsPage() {
  return <ReportsLayout />;
}

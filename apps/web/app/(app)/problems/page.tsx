import { Metadata } from 'next';
import ProblemsTable from '@/components/problems/problems-table';

export const metadata: Metadata = { title: 'Problems | Lotris' };

export default function ProblemsPage() {
  return <ProblemsTable />;
}

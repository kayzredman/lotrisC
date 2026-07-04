import { Metadata } from 'next';
import RcaWizard from '@/components/rca/rca-wizard';

export const metadata: Metadata = { title: 'RCA | Lotris' };

type Props = { params: Promise<{ id: string }> };

export default async function RcaPage({ params }: Props) {
  const { id } = await params;
  return <RcaWizard rcaId={id} />;
}

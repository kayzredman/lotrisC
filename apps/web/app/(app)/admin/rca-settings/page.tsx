import { Metadata } from 'next';
import RcaSettingsClient from '@/components/admin/rca-settings-client';

export const metadata: Metadata = { title: 'RCA Settings | Lotris' };

export default function RcaSettingsPage() {
  return <RcaSettingsClient />;
}

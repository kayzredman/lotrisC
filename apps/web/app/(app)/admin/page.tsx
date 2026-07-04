import type { Metadata } from 'next';
import { AdminPageClient } from '@/components/admin/admin-page-client';

export const metadata: Metadata = { title: 'Admin | Lotris' };

export default function AdminPage() {
  return <AdminPageClient />;
}

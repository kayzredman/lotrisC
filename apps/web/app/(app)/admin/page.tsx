import type { Metadata } from 'next';
import { AdminTabs } from '@/components/admin/admin-tabs';

export const metadata: Metadata = { title: 'Admin | Lotris' };

/** Role enforcement is handled by tRPC server-side. */
export default function AdminPage() {
  return (
    <div>
      <div className="v2-page-header">
        <div>
          <h1>Admin</h1>
          <p>Manage users and teams for your organisation</p>
        </div>
      </div>
      <AdminTabs />
    </div>
  );
}

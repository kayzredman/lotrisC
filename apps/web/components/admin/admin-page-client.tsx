'use client';

import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import { AdminTabs } from '@/components/admin/admin-tabs';

export function AdminPageClient() {
  const { data: me } = useCurrentUser({ staleTime: 60_000 });
  const role = me?.roleName ?? '';

  return (
    <div>
      <div className="v2-page-header">
        <div>
          <h1>Admin</h1>
          <p>
            {role === 'TEAM_LEAD'
              ? 'Manage engineers on your team and unit settings'
              : 'Manage users and teams for your organisation'}
          </p>
        </div>
      </div>
      <AdminTabs />
    </div>
  );
}

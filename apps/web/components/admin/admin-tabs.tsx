'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { UsersTable } from './users-table';
import { TeamsTable } from './teams-table';
import { TeamAccessPanel } from './team-access-panel';
import { CategoryRoutingPanel } from './category-routing-panel';

type Tab = 'users' | 'teams' | 'access' | 'routing';

export function AdminTabs() {
  const { data: me } = trpc['users.me'].useQuery(undefined, { staleTime: 60_000 });
  const role = me?.roleName ?? '';
  const isManagerOnly = role === 'IT_MANAGER'; // sees Teams + Access but NOT Users

  // IT_MANAGER: start on 'teams'; ADMIN/SUPERADMIN: start on 'users'
  const [active, setActive] = useState<Tab>(isManagerOnly ? 'teams' : 'users');

  const tabs: { key: Tab; label: string }[] = [
    ...(!isManagerOnly ? [{ key: 'users' as Tab, label: 'Users' }] : []),
    { key: 'teams', label: 'Teams' },
    { key: 'access', label: 'Cross-Team Access' },
    { key: 'routing', label: 'Intake Routing' },
  ];

  return (
    <div>
      {/* Tab bar — v2 design system */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: active === tab.key ? '2px solid var(--indigo)' : '2px solid transparent',
              color: active === tab.key ? 'var(--indigo)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'users'   && !isManagerOnly && <UsersTable />}
      {active === 'teams'   && <TeamsTable />}
      {active === 'access'  && <TeamAccessPanel />}
      {active === 'routing' && <CategoryRoutingPanel />}
    </div>
  );
}

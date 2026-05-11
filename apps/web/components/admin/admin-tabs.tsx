'use client';

import { useState } from 'react';
import { UsersTable } from './users-table';
import { TeamsTable } from './teams-table';
import { TeamAccessPanel } from './team-access-panel';

type Tab = 'users' | 'teams' | 'access';

export function AdminTabs() {
  const [active, setActive] = useState<Tab>('users');

  return (
    <div>
      {/* Tab bar — v2 design system */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {([
          { key: 'users', label: 'Users' },
          { key: 'teams', label: 'Teams' },
          { key: 'access', label: 'Cross-Team Access' },
        ] as const).map((tab) => (
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

      {active === 'users'  && <UsersTable />}
      {active === 'teams'  && <TeamsTable />}
      {active === 'access' && <TeamAccessPanel />}
    </div>
  );
}

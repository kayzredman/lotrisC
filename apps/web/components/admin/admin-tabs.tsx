'use client';

import { useState } from 'react';
import { UsersTable } from './users-table';
import { TeamsTable } from './teams-table';

type Tab = 'users' | 'teams';

export function AdminTabs() {
  const [active, setActive] = useState<Tab>('users');

  return (
    <div>
      {/* Tab bar — v2 design system */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {(['users', 'teams'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: active === tab ? '2px solid var(--indigo)' : '2px solid transparent',
              color: active === tab ? 'var(--indigo)' : 'var(--text-muted)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'color 0.15s, border-color 0.15s',
              marginBottom: -1,
            }}
          >
            {tab === 'users' ? 'Users' : 'Teams'}
          </button>
        ))}
      </div>

      {active === 'users' && <UsersTable />}
      {active === 'teams' && <TeamsTable />}
    </div>
  );
}

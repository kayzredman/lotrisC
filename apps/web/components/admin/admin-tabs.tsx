'use client';

import { useState } from 'react';
import { UsersTable } from './users-table';
import { TeamsTable } from './teams-table';
import { cn } from '@lotris/ui';

type Tab = 'users' | 'teams';

export function AdminTabs() {
  const [active, setActive] = useState<Tab>('users');

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-slate-700 mb-6">
        {(['users', 'teams'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize',
              active === tab
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === 'users' && <UsersTable />}
      {active === 'teams' && <TeamsTable />}
    </div>
  );
}

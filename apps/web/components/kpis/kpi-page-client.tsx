'use client';

import { useState } from 'react';
import KpiDefinitionsTable from './kpi-definitions-table';
import KpiAssignmentsPanel from './kpi-assignments-panel';
import KpiAgreementBuilder from './kpi-agreement-builder';
import KpiDashboard from './kpi-dashboard';

type Tab = 'definitions' | 'assignments' | 'agreements' | 'dashboard';

const TABS: { value: Tab; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'definitions', label: 'KPI Definitions' },
  { value: 'assignments', label: 'Assignments' },
  { value: 'agreements', label: 'Agreements' },
];

export default function KpiPageClient() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors -mb-px border-b-2 ${
              activeTab === tab.value
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'dashboard' && <KpiDashboard />}
      {activeTab === 'definitions' && <KpiDefinitionsTable />}
      {activeTab === 'assignments' && <KpiAssignmentsPanel />}
      {activeTab === 'agreements' && <KpiAgreementBuilder />}
    </div>
  );
}

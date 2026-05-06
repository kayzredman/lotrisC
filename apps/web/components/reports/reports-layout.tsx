'use client';

import { useState } from 'react';
import { GenerateReportForm } from './generate-report-form';
import { ScheduledReports } from './scheduled-reports';

type Tab = 'generate' | 'history' | 'scheduled';

const TABS: { key: Tab; label: string }[] = [
  { key: 'generate', label: 'Generate Report' },
  { key: 'history', label: 'Report History' },
  { key: 'scheduled', label: 'Scheduled Reports' },
];

const REPORT_TYPES = [
  { key: 'TICKET_SUMMARY', label: 'Ticket Summary' },
  { key: 'SLA_COMPLIANCE', label: 'SLA Compliance' },
  { key: 'KPI_REPORT', label: 'KPI Report' },
  { key: 'ENGINEER_PERF', label: 'Engineer Performance' },
];

export function ReportsLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [selectedType, setSelectedType] = useState('TICKET_SUMMARY');

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-slate-700 bg-slate-900 flex flex-col gap-1 p-3">
        <p className="text-xs text-slate-500 uppercase tracking-wide px-2 py-1">Reports</p>
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.key}
            onClick={() => {
              setSelectedType(rt.key);
              setActiveTab('generate');
            }}
            className={`text-left px-3 py-2 rounded-lg text-sm transition ${
              selectedType === rt.key && activeTab === 'generate'
                ? 'bg-violet-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {rt.label}
          </button>
        ))}

        <div className="mt-4 border-t border-slate-700 pt-3 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('history')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition ${
              activeTab === 'history' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition ${
              activeTab === 'scheduled' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Scheduled
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-slate-700 pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 text-sm rounded-t transition ${
                activeTab === t.key
                  ? 'text-violet-400 border-b-2 border-violet-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'generate' && <GenerateReportForm initialType={selectedType} />}
        {activeTab === 'history' && <ReportHistoryPanel />}
        {activeTab === 'scheduled' && <ScheduledReports />}
      </div>
    </div>
  );
}

function ReportHistoryPanel() {
  // Fetch from REST API directly since tRPC doesn't have a list procedure yet
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-100 mb-4">Report History</h2>
      <p className="text-sm text-slate-500">
        Previously generated reports appear here. Download links are available for 24 hours.
      </p>
    </div>
  );
}

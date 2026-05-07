'use client';

import { useState } from 'react';
import { FileText, Download, Clock, Calendar, Plus, Search, Filter, BarChart2 } from 'lucide-react';

// ── Marketing demo data (match 05-reports-v2.html exactly) ──────────────────
const REPORT_TYPE_TABS = [
  { label: 'All',               count: 24 },
  { label: 'Ticket Summary',    count: 8  },
  { label: 'SLA Compliance',    count: 5  },
  { label: 'KPI Performance',   count: 4  },
  { label: 'Agent Performance', count: 4  },
  { label: 'CSAT Analysis',     count: 3  },
  { label: 'Queue Reports',     count: 4  },
];

const DEMO_REPORTS = [
  { name: 'SLA Compliance Report – April 2026',      type: 'SLA Compliance',    formats: ['PDF'],        freq: 'Monthly',   date: '1 May 2026, 06:00', size: '2.4 MB', downloads: 18 },
  { name: 'KPI Performance Report – Q1 2026',        type: 'KPI Performance',   formats: ['XLSX','PDF'], freq: 'Quarterly', date: '2 Apr 2026, 08:15', size: '5.1 MB', downloads: 42 },
  { name: 'Agent Performance Report – Week 17',      type: 'Agent Performance', formats: ['PDF'],        freq: 'Weekly',    date: '28 Apr 2026, 07:00', size: '1.8 MB', downloads: 9  },
  { name: 'CSAT Monthly Report – April 2026',        type: 'CSAT Analysis',     formats: ['XLSX'],       freq: 'Monthly',   date: '1 May 2026, 06:00', size: '890 KB', downloads: 7  },
  { name: 'Ticket Volume by Category – May 2026',    type: 'Ticket Summary',    formats: ['CSV'],        freq: 'Daily',     date: '5 May 2026, 00:00', size: '340 KB', downloads: 3  },
  { name: 'SLA Compliance Detail – Network Ops',     type: 'SLA Compliance',    formats: ['PDF','XLSX'], freq: 'Ad-hoc',    date: '4 May 2026, 14:22', size: '1.2 MB', downloads: 5  },
];

const FORMAT_COLORS: Record<string, string> = {
  PDF:  'v2-badge-red',
  XLSX: 'v2-badge-green',
  CSV:  'v2-badge-blue',
};

export function ReportsLayout() {
  const [activeType, setActiveType] = useState('All');
  const [showGenerate, setShowGenerate] = useState(false);

  const filtered = activeType === 'All' ? DEMO_REPORTS : DEMO_REPORTS.filter(r => r.type === activeType);

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>Reports</h1>
          <p>Generate, schedule and download performance reports</p>
        </div>
        <div className="v2-page-header-actions">
          <button className="v2-btn v2-btn-secondary v2-btn-sm" onClick={() => setShowGenerate(false)}>
            <Clock size={12} /> Scheduled (6)
          </button>
          <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowGenerate(true)}>
            <Plus size={12} /> Generate Report
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { value: '24', label: 'Saved Reports',    icon: <FileText size={13} />,  color: 'var(--indigo)' },
          { value: '6',  label: 'Scheduled',         icon: <Calendar size={13} />,  color: 'var(--blue)'   },
          { value: '148',label: 'Downloads MTD',     icon: <Download size={13} />,  color: 'var(--green)'  },
          { value: '2h', label: 'Last Generated',    icon: <Clock size={13} />,     color: 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} className="v2-card" style={{ flex: '1 1 120px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {showGenerate ? (
        /* Generate form */
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Generate New Report</div>
            <button className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => setShowGenerate(false)}>← Back</button>
          </div>
          <div className="v2-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Report Type', id: 'rt', options: ['Ticket Summary','SLA Compliance','KPI Performance','Agent Performance','CSAT Analysis','Queue Reports'] },
                { label: 'Department / Team', id: 'dept', options: ['All Departments','IT Support','Network Ops','DB Team','Security','Service Desk'] },
              ].map(f => (
                <div key={f.id}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>{f.label}</label>
                  <select className="v2-select" style={{ width: '100%' }}>
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Date Range</label>
                <select className="v2-select" style={{ width: '100%' }}>
                  <option>Last 30 days</option><option>Last 7 days</option><option>This month</option><option>Last month</option><option>Custom range</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Format</label>
                <select className="v2-select" style={{ width: '100%' }}>
                  <option>PDF</option><option>XLSX</option><option>CSV</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button className="v2-btn v2-btn-primary"><BarChart2 size={13} /> Generate Now</button>
              <button className="v2-btn v2-btn-secondary"><Calendar size={13} /> Schedule</button>
            </div>
          </div>
        </div>
      ) : (
        /* Report list */
        <>
          <div className="v2-filter-bar">
            <div className="v2-filter-tabs">
              {REPORT_TYPE_TABS.map(tab => (
                <button
                  key={tab.label}
                  className={`v2-filter-tab${activeType === tab.label ? ' active' : ''}`}
                  onClick={() => setActiveType(tab.label)}
                >
                  {tab.label}
                  <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-light)' }}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="v2-search-bar" style={{ width: 200 }}>
              <Search size={12} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
              <input type="text" placeholder="Search reports…" />
            </div>
          </div>

          <div className="v2-card">
            <div className="v2-table-wrap">
              <table className="v2-table">
                <thead>
                  <tr>
                    <th>Report Name</th>
                    <th>Type</th>
                    <th>Format</th>
                    <th>Frequency</th>
                    <th>Generated</th>
                    <th>Size</th>
                    <th>Downloads</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={14} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</span>
                        </div>
                      </td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.type}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {r.formats.map(f => <span key={f} className={`v2-badge ${FORMAT_COLORS[f] ?? 'v2-badge-gray'}`}>{f}</span>)}
                        </div>
                      </td>
                      <td><span className="v2-badge v2-badge-indigo">{r.freq}</span></td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.date}</span></td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-light)' }}>{r.size}</span></td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.downloads}</span></td>
                      <td>
                        <div className="v2-row-actions">
                          <button className="v2-row-action-btn" title="Download"><Download size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


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
    <div className="flex flex-col md:flex-row h-full min-h-0">

      {/* Mobile horizontal tab strip (< md) */}
      <div className="flex md:hidden overflow-x-auto border-b border-slate-700 bg-slate-900 shrink-0">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.key}
            onClick={() => { setSelectedType(rt.key); setActiveTab('generate'); }}
            className={`shrink-0 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition ${
              selectedType === rt.key && activeTab === 'generate'
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {rt.label}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('history')}
          className={`shrink-0 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition ${
            activeTab === 'history' ? 'border-violet-500 text-violet-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`shrink-0 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition ${
            activeTab === 'scheduled' ? 'border-violet-500 text-violet-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Scheduled
        </button>
      </div>

      {/* Desktop Sidebar (>= md) */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-slate-700 bg-slate-900 flex-col gap-1 p-3">
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

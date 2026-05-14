'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { FileText, Download, Clock, Calendar, Plus, Search, BarChart2, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { ReportSettingsPanel } from './report-settings-panel';

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
  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history');
  const [reportType, setReportType] = useState('TICKET_SUMMARY');
  const [format, setFormat] = useState('PDF');
  const [dateRange, setDateRange] = useState('last_30');
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const { getToken } = useAuth();

  const { data: me } = trpc['users.me'].useQuery(undefined, { staleTime: 60_000 });
  const { data: liveReports, isLoading: reportsLoading } = trpc['reports.list'].useQuery(undefined, { staleTime: 15_000 });
  const { data: schedules } = trpc['reports.schedules.list'].useQuery(undefined, { staleTime: 15_000 });

  const isAdmin = me?.roleName === 'ADMIN' || me?.roleName === 'SUPERADMIN';

  const dateRangeParams = (range: string): { dateFrom: string; dateTo: string } => {
    const to = new Date();
    const from = new Date();
    if (range === 'last_7')  from.setDate(to.getDate() - 7);
    else if (range === 'last_30') from.setDate(to.getDate() - 30);
    else if (range === 'this_month') from.setDate(1);
    else if (range === 'last_month') { from.setMonth(from.getMonth() - 1); from.setDate(1); to.setDate(0); }
    else from.setDate(to.getDate() - 30);
    return { dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) };
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenStatus(null);
    try {
      const token = await getToken();
      const { dateFrom, dateTo } = dateRangeParams(dateRange);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reportType, format: format === 'XLSX' ? 'EXCEL' : format, dateFrom, dateTo }),
      });
      if (res.ok || res.status === 202) {
        setGenStatus({ ok: true, message: 'Report generation queued. It will appear in your list shortly.' });
      } else {
        const body = await res.json().catch(() => ({}));
        setGenStatus({ ok: false, message: (body as { message?: string }).message ?? 'Generation failed. Please try again.' });
      }
    } catch {
      setGenStatus({ ok: false, message: 'Network error — could not reach the API.' });
    } finally {
      setGenerating(false);
    }
  };

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
          <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={() => { setShowGenerate(false); setActiveTab('history'); }}>
            <Clock size={12} /> Scheduled ({schedules?.length ?? 0})
          </button>
          <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowGenerate(true)}>
            <Plus size={12} /> Generate Report
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { value: String(liveReports?.length ?? '—'), label: 'Saved Reports', icon: <FileText size={13} />, color: 'var(--indigo)' },
          { value: String(schedules?.length ?? '—'),   label: 'Scheduled',     icon: <Calendar size={13} />, color: 'var(--blue)'   },
          { value: String(liveReports?.filter(r => r.status === 'DONE').length ?? '—'), label: 'Completed', icon: <Download size={13} />, color: 'var(--green)' },
          { value: liveReports?.filter(r => r.status === 'PROCESSING').length ? 'Running' : 'Idle', label: 'Queue Status', icon: <Clock size={13} />, color: 'var(--text-muted)' },
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

      {/* Tab bar: History | Settings (admin only) */}
      {!showGenerate && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          <button
            type="button"
            className={`v2-filter-tab${activeTab === 'history' ? ' active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Report History
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`v2-filter-tab${activeTab === 'settings' ? ' active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={11} style={{ marginRight: 4 }} />
              Settings
            </button>
          )}
        </div>
      )}

      {showGenerate ? (
        /* Generate form */
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Generate New Report</div>
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => setShowGenerate(false)}>← Back</button>
          </div>
          <div className="v2-card-body">
            {genStatus && (
              <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                background: genStatus.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${genStatus.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: genStatus.ok ? '#16a34a' : '#dc2626', fontSize: 13 }}>
                {genStatus.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {genStatus.message}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label htmlFor="rt-select" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Report Type</label>
                <select id="rt-select" className="v2-select" style={{ width: '100%' }} value={reportType} onChange={e => setReportType(e.target.value)}>
                  <option value="TICKET_SUMMARY">Ticket Summary</option>
                  <option value="SLA_COMPLIANCE">SLA Compliance</option>
                  <option value="KPI_REPORT">KPI Performance</option>
                  <option value="ENGINEER_PERF">Agent Performance</option>
                </select>
              </div>
              <div>
                <label htmlFor="dept-select" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Department / Team</label>
                <select id="dept-select" className="v2-select" style={{ width: '100%' }}>
                  <option>All Departments</option>
                  <option>IT Support</option>
                  <option>Network Ops</option>
                  <option>DB Team</option>
                </select>
              </div>
              <div>
                <label htmlFor="dr-select" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Date Range</label>
                <select id="dr-select" className="v2-select" style={{ width: '100%' }} value={dateRange} onChange={e => setDateRange(e.target.value)}>
                  <option value="last_30">Last 30 days</option>
                  <option value="last_7">Last 7 days</option>
                  <option value="this_month">This month</option>
                  <option value="last_month">Last month</option>
                </select>
              </div>
              <div>
                <label htmlFor="fmt-select" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Format</label>
                <select id="fmt-select" className="v2-select" style={{ width: '100%' }} value={format} onChange={e => setFormat(e.target.value)}>
                  <option value="PDF">PDF</option>
                  <option value="XLSX">XLSX</option>
                  <option value="CSV">CSV</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button type="button" className="v2-btn v2-btn-primary" onClick={handleGenerate} disabled={generating}>
                <BarChart2 size={13} /> {generating ? 'Generating…' : 'Generate Now'}
              </button>
              <button type="button" className="v2-btn v2-btn-secondary"><Calendar size={13} /> Schedule</button>
            </div>
          </div>
        </div>
      ) : (
        /* Report list or Settings */
        activeTab === 'settings' && isAdmin ? (
          <ReportSettingsPanel />
        ) : (
        <>
          <div className="v2-filter-bar">
            <div className="v2-filter-tabs">
              {REPORT_TYPE_TABS.map(tab => (
                <button
                  key={tab.label}
                  type="button"
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
                    <th>Status</th>
                    <th>Generated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reportsLoading && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading…</td></tr>
                  )}
                  {!reportsLoading && (!liveReports || liveReports.length === 0) && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>No reports generated yet.</td></tr>
                  )}
                  {liveReports?.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={14} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {r.reportType.replace(/_/g, ' ')} — {r.dateFrom ?? ''}{r.dateTo ? ` to ${r.dateTo}` : ''}
                          </span>
                        </div>
                      </td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.reportType}</span></td>
                      <td><span className={`v2-badge ${r.format === 'EXCEL' ? 'v2-badge-green' : 'v2-badge-red'}`}>{r.format}</span></td>
                      <td>
                        <span className={`v2-badge ${r.status === 'DONE' ? 'v2-badge-green' : r.status === 'FAILED' ? 'v2-badge-red' : 'v2-badge-amber'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</span></td>
                      <td>
                        {r.status === 'DONE' && r.filePath && (
                          <div className="v2-row-actions">
                            <button type="button" className="v2-row-action-btn" title="Download">
                              <Download size={11} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
        )
      )}
    </div>
  );
}

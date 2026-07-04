'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/auth-context';
import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import {
  useReportsList,
  useReportSchedules,
  useCreateReportSchedule,
  useDeleteReportSchedule,
  useGenerateReport,
  useReportJobStatus,
  downloadReportFile,
} from '@/lib/api/hooks/useReports';
import { FileText, Download, Clock, Calendar, Plus, Search, BarChart2, CheckCircle, AlertCircle, Settings, Trash2, Lock } from 'lucide-react';
import { ReportSettingsPanel } from './report-settings-panel';

const REPORT_TYPE_LABELS = [
  'All',
  'Ticket Summary',
  'SLA Compliance',
  'KPI Performance',
  'Agent Performance',
  'CSAT Analysis',
  'Queue Reports',
] as const;

const REPORT_TYPE_API: Record<string, string> = {
  'Ticket Summary': 'TICKET_SUMMARY',
  'SLA Compliance': 'SLA_COMPLIANCE',
  'KPI Performance': 'KPI_REPORT',
  'Agent Performance': 'ENGINEER_PERF',
  'CSAT Analysis': 'CSAT_ANALYSIS',
  'Queue Reports': 'QUEUE_REPORT',
};

function reportTypeLabel(apiType: string): string {
  const entry = Object.entries(REPORT_TYPE_API).find(([, v]) => v === apiType);
  if (entry) return entry[0];
  return apiType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function ReportsLayout() {
  const [activeType, setActiveType] = useState('All');
  const [showGenerate, setShowGenerate] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history');
  const [reportType, setReportType] = useState('TICKET_SUMMARY');
  const [format, setFormat] = useState('PDF');
  const [dateRange, setDateRange] = useState('last_30');
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [highlightJobId, setHighlightJobId] = useState<string | null>(null);

  const { accessToken } = useAuth();
  const { data: me } = useCurrentUser({ staleTime: 60_000 });
  const { data: liveReportsRaw, isLoading: reportsLoading } = useReportsList({
    staleTime: 5_000,
    refetchInterval: (query) => {
      const rows = (query.state.data as Array<Record<string, unknown>> | undefined) ?? [];
      return rows.some((r) => r.status === 'PROCESSING') ? 3000 : false;
    },
  });
  const { data: pendingJob } = useReportJobStatus(pendingJobId);
  const { data: schedulesRaw } = useReportSchedules({ staleTime: 15_000 });
  const generateReport = useGenerateReport();

  const liveReports = (Array.isArray(liveReportsRaw) ? liveReportsRaw : []) as Array<Record<string, unknown>>;
  const schedules = (Array.isArray(schedulesRaw) ? schedulesRaw : []) as Array<Record<string, unknown>>;

  const isAdmin     = me?.roleName === 'ADMIN' || me?.roleName === 'SUPERADMIN';
  const canAccessReports = ['TEAM_LEAD', 'IT_MANAGER', 'ADMIN', 'SUPERADMIN'].includes(me?.roleName ?? '');

  // Schedule mutations
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pendingJob) return;
    const status = String(pendingJob.status ?? '');
    void queryClient.invalidateQueries({ queryKey: ['reports', 'list'] });
    if (status === 'DONE') {
      setGenStatus({ ok: true, message: 'Report generated successfully. Showing in history below.' });
      setHighlightJobId(String(pendingJob.id ?? pendingJobId));
      setPendingJobId(null);
      setShowGenerate(false);
      setActiveTab('history');
    } else if (status === 'FAILED') {
      setGenStatus({ ok: false, message: String(pendingJob.errorMsg ?? 'Report generation failed.') });
      setPendingJobId(null);
    }
  }, [pendingJob, pendingJobId, queryClient]);

  async function handleDownload(jobId: string, format: string) {
    if (!accessToken) return;
    try {
      await downloadReportFile(jobId, accessToken, format);
    } catch {
      setGenStatus({ ok: false, message: 'Download failed. Try again from the report list.' });
    }
  }
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [schedForm, setSchedForm] = useState({ reportType: 'TICKET_SUMMARY', format: 'PDF', frequency: 'WEEKLY', recipients: '' });
  const createScheduleMutation = useCreateReportSchedule();
  const deleteScheduleMutation = useDeleteReportSchedule();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    setHighlightJobId(null);
    setPendingJobId(null);
    try {
      const { dateFrom, dateTo } = dateRangeParams(dateRange);
      const apiFormat = format === 'XLSX' ? 'EXCEL' : format;
      const result = await generateReport.mutateAsync({
        reportType,
        format: apiFormat,
        dateFrom,
        dateTo,
      }) as Record<string, unknown>;
      const jobId = String(result.jobId ?? result.JobId ?? '');
      if (!jobId) throw new Error('No job id returned from server.');
      setPendingJobId(jobId);
      setGenStatus({ ok: true, message: 'Generating report… this usually takes a few seconds.' });
      void queryClient.invalidateQueries({ queryKey: ['reports', 'list'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed. Please try again.';
      setGenStatus({ ok: false, message });
    } finally {
      setGenerating(false);
    }
  };

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: liveReports.length };
    for (const r of liveReports) {
      const label = reportTypeLabel(String(r.reportType));
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return counts;
  }, [liveReports]);

  const filteredReports = activeType === 'All'
    ? liveReports
    : liveReports.filter(r => reportTypeLabel(String(r.reportType)) === activeType);

  // Role gate — ENGINEER sees Not Authorised
  if (me && !canAccessReports) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 12 }}>
        <Lock size={32} style={{ color: 'var(--text-light)' }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Not Authorised</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 340 }}>Reports are available to Team Leads, Managers and Admins. Contact your manager for access.</div>
      </div>
    );
  }

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
          { value: String(liveReports.filter(r => r.status === 'DONE').length), label: 'Completed', icon: <Download size={13} />, color: 'var(--green)' },
          { value: liveReports.filter(r => r.status === 'PROCESSING').length ? 'Running' : 'Idle', label: 'Queue Status', icon: <Clock size={13} />, color: 'var(--text-muted)' },
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
                </select>
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button type="button" className="v2-btn v2-btn-primary" onClick={handleGenerate} disabled={generating}>
                <BarChart2 size={13} /> {generating ? 'Generating…' : 'Generate Now'}
              </button>
              <button
                type="button"
                className="v2-btn v2-btn-secondary"
                onClick={() => {
                  setShowGenerate(false);
                  setActiveTab('history');
                  setShowAddSchedule(true);
                }}
              >
                <Calendar size={13} /> Schedule
              </button>
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
              {REPORT_TYPE_LABELS.map(label => (
                <button
                  key={label}
                  type="button"
                  className={`v2-filter-tab${activeType === label ? ' active' : ''}`}
                  onClick={() => setActiveType(label)}
                >
                  {label}
                  <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-light)' }}>{typeCounts[label] ?? 0}</span>
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
                  {!reportsLoading && filteredReports.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>No reports generated yet.</td></tr>
                  )}
                  {filteredReports.map(r => (
                    <tr
                      key={r.id as string}
                      style={highlightJobId === String(r.id) ? { background: 'rgba(79,70,229,0.06)' } : undefined}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={14} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {String(r.reportType).replace(/_/g, ' ')} — {String(r.dateFrom ?? '')}{r.dateTo ? ` to ${String(r.dateTo)}` : ''}
                          </span>
                        </div>
                      </td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{String(r.reportType)}</span></td>
                      <td><span className={`v2-badge ${r.format === 'EXCEL' ? 'v2-badge-green' : 'v2-badge-red'}`}>{String(r.format)}</span></td>
                      <td>
                        <span className={`v2-badge ${r.status === 'DONE' ? 'v2-badge-green' : r.status === 'FAILED' ? 'v2-badge-red' : 'v2-badge-amber'}`}>
                          {String(r.status)}
                        </span>
                      </td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.createdAt ? new Date(String(r.createdAt)).toLocaleString() : '—'}</span></td>
                      <td>
                        {r.status === 'DONE' && Boolean(r.filePath) && (
                          <div className="v2-row-actions">
                            <button
                              type="button"
                              className="v2-row-action-btn"
                              title="Download"
                              onClick={() => void handleDownload(String(r.id), String(r.format))}
                            >
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
          {/* ── Scheduled Reports section (below history table) ── */}
          <div className="v2-card" id="scheduled-reports-section" style={{ marginTop: 20 }}>
            <div className="v2-card-header">
              <div>
                <div className="v2-card-title"><Calendar size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--blue)' }} />Scheduled Reports</div>
                <div className="v2-card-subtitle">Auto-generated on a recurring schedule and emailed to recipients</div>
              </div>
              <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowAddSchedule(true)}>
                <Plus size={12} /> Add Schedule
              </button>
            </div>

            {/* Add Schedule inline form */}
            {showAddSchedule && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Report Type</label>
                    <select className="v2-select" style={{ width: '100%' }} value={schedForm.reportType} onChange={e => setSchedForm(f => ({ ...f, reportType: e.target.value }))}>
                      <option value="TICKET_SUMMARY">Ticket Summary</option>
                      <option value="SLA_COMPLIANCE">SLA Compliance</option>
                      <option value="KPI_REPORT">KPI Performance</option>
                      <option value="ENGINEER_PERF">Agent Performance</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Format</label>
                    <select className="v2-select" style={{ width: '100%' }} value={schedForm.format} onChange={e => setSchedForm(f => ({ ...f, format: e.target.value }))}>
                      <option value="PDF">PDF</option>
                      <option value="EXCEL">Excel</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Frequency</label>
                    <select className="v2-select" style={{ width: '100%' }} value={schedForm.frequency} onChange={e => setSchedForm(f => ({ ...f, frequency: e.target.value }))}>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Recipients (comma-separated emails)</label>
                  <input
                    type="text"
                    className="v2-input"
                    style={{ width: '100%' }}
                    placeholder="alice@company.com, bob@company.com"
                    value={schedForm.recipients}
                    onChange={e => setSchedForm(f => ({ ...f, recipients: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="v2-btn v2-btn-primary v2-btn-sm"
                    disabled={createScheduleMutation.isPending || !schedForm.recipients.trim()}
                    onClick={() => {
                      const emails = schedForm.recipients.split(',').map(e => e.trim()).filter(Boolean);
                      createScheduleMutation.mutate(
                        { reportType: schedForm.reportType, format: schedForm.format, frequency: schedForm.frequency, recipients: JSON.stringify(emails) },
                        {
                          onSuccess: () => {
                            setShowAddSchedule(false);
                            setSchedForm({ reportType: 'TICKET_SUMMARY', format: 'PDF', frequency: 'WEEKLY', recipients: '' });
                            void queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] });
                          },
                        },
                      );
                    }}
                  >
                    {createScheduleMutation.isPending ? 'Saving…' : 'Save Schedule'}
                  </button>
                  <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => setShowAddSchedule(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div className="v2-table-wrap">
              <table className="v2-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Format</th>
                    <th>Frequency</th>
                    <th>Recipients</th>
                    <th>Next Run</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(!schedules || schedules.length === 0) && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>No scheduled reports. Click &quot;Add Schedule&quot; to create one.</td></tr>
                  )}
                  {schedules.map(s => (
                    <tr key={s.id as string}>
                      <td><span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{String(s.reportType).replace(/_/g, ' ')}</span></td>
                      <td><span className={`v2-badge ${s.format === 'EXCEL' ? 'v2-badge-green' : 'v2-badge-red'}`}>{String(s.format)}</span></td>
                      <td><span className="v2-badge v2-badge-indigo">{String(s.frequency)}</span></td>
                      <td>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          {(() => { try { const arr = JSON.parse(String(s.recipients)) as string[]; return arr.slice(0,2).join(', ') + (arr.length > 2 ? ` +${arr.length - 2}` : ''); } catch { return String(s.recipients); } })()}
                        </span>
                      </td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.nextRunAt ? new Date(String(s.nextRunAt)).toLocaleString() : '—'}</span></td>
                      <td><span className={`v2-badge ${s.isActive === 'true' ? 'v2-badge-green' : 'v2-badge-gray'}`}>{s.isActive === 'true' ? 'Active' : 'Paused'}</span></td>
                      <td>
                        {deleteConfirmId === s.id ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" className="v2-btn v2-btn-danger v2-btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}
                              onClick={() => {
                                deleteScheduleMutation.mutate(
                                  { id: s.id as string },
                                  { onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] }) },
                                );
                                setDeleteConfirmId(null);
                              }}>
                              Confirm
                            </button>
                            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setDeleteConfirmId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="v2-row-actions">
                            <button type="button" className="v2-row-action-btn" title="Delete" onClick={() => setDeleteConfirmId(s.id as string)}>
                              <Trash2 size={11} />
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

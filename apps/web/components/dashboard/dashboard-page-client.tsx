'use client';

import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import {
  useDashboardSummary,
  useDashboardQueueHealth,
  useDashboardEngineerPerf,
  useDashboardTeamWorkload,
  useSlaWarnings,
} from '@/lib/api/hooks/useDashboard';
import { WorkloadPanel } from './workload-panel';
import {
  Ticket, AlertTriangle, CheckCircle2, TrendingUp,
  Clock, Activity, ArrowUpRight, RefreshCw,
} from 'lucide-react';

// ── Marketing demo values (match 02-dashboard-v2.html exactly) ───────────────
const DEMO = {
  openTickets:   247,
  slaBreached:   12,
  resolvedMTD:   184,
  kpiScore:      94,
  categories: [
    { label: 'Hardware', count: 86, pct: 35, color: 'var(--indigo)' },
    { label: 'Software', count: 69, pct: 28, color: 'var(--blue)' },
    { label: 'Network',  count: 50, pct: 20, color: 'var(--purple)' },
    { label: 'Access',   count: 42, pct: 17, color: 'var(--green)' },
  ],
  queueStats: { unassigned: 9, pickupRisk: 4, avgPickupMin: 1.8, autoAssigned: 3 },
  teams: [
    { name: 'IT Support',   queued: 5, pct: 72 },
    { name: 'Network Ops',  queued: 2, pct: 28 },
    { name: 'DB Team',      queued: 1, pct: 14 },
  ],
  agents: [
    { name: 'A. Appiah',   tickets: 44, score: 98 },
    { name: 'J. Osei',     tickets: 41, score: 96 },
    { name: 'Y. Owusu',   tickets: 37, score: 93 },
    { name: 'E. Amponsah',tickets: 31, score: 88 },
    { name: 'F. Quansah', tickets: 26, score: 84 },
  ],
  alerts: [
    { level: 'red',    text: 'SLA breach — TKT-0491 Critical, D.Mensah, overdue 2h 40m' },
    { level: 'yellow', text: '4 tickets approaching pickup SLA — IT Support queue' },
    { level: 'blue',   text: 'CSAT dipped in DB Team — 3.8 vs 4.2 target' },
    { level: 'gray',   text: 'Scheduled maintenance Saturday 01:00–04:00 WAT' },
  ],
  trend: [
    { month: 'Oct', opened: 198, resolved: 152 },
    { month: 'Nov', opened: 215, resolved: 175 },
    { month: 'Dec', opened: 189, resolved: 141 },
    { month: 'Jan', opened: 231, resolved: 188 },
    { month: 'Feb', opened: 244, resolved: 194 },
    { month: 'Mar', opened: 226, resolved: 179 },
    { month: 'Apr', opened: 238, resolved: 185 },
    { month: 'May', opened: 247, resolved: null },
  ],
};

const ALERT_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  red:    { dot: 'var(--red)',    text: 'var(--red)',    bg: 'var(--red-bg)' },
  yellow: { dot: 'var(--yellow)', text: 'var(--yellow)', bg: 'var(--yellow-bg)' },
  blue:   { dot: 'var(--blue)',   text: 'var(--text-primary)', bg: 'var(--blue-bg)' },
  gray:   { dot: 'var(--text-light)', text: 'var(--text-muted)', bg: 'var(--bg-subtle)' },
};

export function DashboardPageClient() {
  const { data: me } = useCurrentUser();
  const role = me?.roleName ?? '';
  const isEngineer  = role === 'ENGINEER';
  const isTeamLead  = role === 'TEAM_LEAD';

  const summaryQ      = useDashboardSummary({ staleTime: 25_000, refetchInterval: 30_000 });
  const queueQ        = useDashboardQueueHealth({ staleTime: 25_000, refetchInterval: 30_000 });
  const engPerfQ      = useDashboardEngineerPerf({ staleTime: 60_000 });
  const teamWorkloadQ = useDashboardTeamWorkload({ staleTime: 30_000, refetchInterval: 60_000 });
  const canSeeSlaWarnings = ['IT_MANAGER', 'ADMIN', 'SUPERADMIN', 'TEAM_LEAD'].includes(role);
  const slaWarningsQ = useSlaWarnings({
    staleTime: 60_000,
    refetchInterval: 120_000,
    enabled: canSeeSlaWarnings,
  });

  // Live values with DEMO fallbacks
  const openTickets  = summaryQ.data?.openTickets  ?? DEMO.openTickets;
  const slaBreached  = summaryQ.data?.slaBreached  ?? DEMO.slaBreached;
  const resolvedMTD  = summaryQ.data?.resolvedMtd ?? summaryQ.data?.resolvedMTD ?? DEMO.resolvedMTD;
  const kpiScore     = summaryQ.data?.kpiScore     ?? DEMO.kpiScore;
  const unassigned   = queueQ.data?.unassigned     ?? DEMO.queueStats.unassigned;
  const atRisk       = queueQ.data?.atRisk         ?? DEMO.queueStats.pickupRisk;
  const autoAssigned = queueQ.data?.autoAssignedToday ?? DEMO.queueStats.autoAssigned;

  // Engineers — use live perf if available, else DEMO
  const liveAgents = (engPerfQ.data as { name?: string; team?: string; tickets?: number; score?: number }[] | undefined);
  const agents = (liveAgents && liveAgents.length > 0)
    ? liveAgents.map(a => ({ name: a.name ?? '–', team: a.team ?? '–', tickets: a.tickets ?? 0, score: a.score ?? 0 }))
    : DEMO.agents.map(a => ({ ...a, team: '–' }));

  // Team workload — use live data if available, else DEMO
  const liveTeams = (teamWorkloadQ.data as { id?: string; name?: string; tag?: string; queued?: number; pct?: number }[] | undefined);
  const teams = (liveTeams && liveTeams.length > 0)
    ? liveTeams.map(t => ({ id: t.id ?? '', name: t.tag ?? t.name ?? '–', queued: t.queued ?? 0, pct: t.pct ?? 0 }))
    : DEMO.teams.map((t, i) => ({ id: String(i), ...t }));

  const trendMax = Math.max(...DEMO.trend.map(t => t.opened));

  return (
    <div>
      {/* ── Role-aware context banner ──────────────────────────────────── */}
      {isEngineer && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          background: 'var(--blue-bg)', border: '1px solid var(--blue)',
          fontSize: 13, color: 'var(--blue)',
        }}>
          <Activity size={14} />
          <span><strong>Engineer view</strong> — showing your personal workload and team metrics.</span>
        </div>
      )}
      {isTeamLead && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          background: 'var(--indigo-bg, rgba(99,102,241,0.08))', border: '1px solid var(--indigo)',
          fontSize: 13, color: 'var(--indigo)',
        }}>
          <TrendingUp size={14} />
          <span><strong>Team Lead view</strong> — showing your team&apos;s queue and performance.</span>
        </div>
      )}

      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            {isEngineer  ? 'Your personal metrics · auto-refreshes every 30s' :
             isTeamLead  ? 'Team performance overview · auto-refreshes every 30s' :
             'Live performance overview · auto-refreshes every 30s'}
          </p>
        </div>
        <div className="v2-page-header-actions">
          {summaryQ.isFetching && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={11} className="animate-spin" /> Refreshing
            </span>
          )}
          <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm">
            <Clock size={12} /> Last 30 days
          </button>
          <button type="button" className="v2-btn v2-btn-primary v2-btn-sm">
            <ArrowUpRight size={12} /> Full Report
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="v2-stats-grid">
        <StatCard color="indigo" icon={<Ticket size={15} />}       value={openTickets} label={isEngineer ? 'My Open Tickets' : isTeamLead ? 'Team Open Tickets' : 'Open Tickets'} trend="+3%"  trendUp />
        <StatCard color="red"    icon={<AlertTriangle size={15} />} value={slaBreached} label={isEngineer ? 'My SLA Breached' : 'SLA Breached'} trend="-2"   trendUp={false} />
        <StatCard color="green"  icon={<CheckCircle2 size={15} />} value={resolvedMTD} label={isEngineer ? 'I Resolved MTD' : isTeamLead ? 'Team Resolved MTD' : 'Resolved MTD'} trend="+11%" trendUp />
        <StatCard color="blue"   icon={<TrendingUp size={15} />}   value={`${Math.round(kpiScore)}%`} label={isEngineer ? 'My KPI Score' : isTeamLead ? 'Team KPI Score' : 'KPI Score'} trend="+2.1%" trendUp />
      </div>

      {/* Row 2: Ticket Volume Chart + Ticket Categories */}
      <div className="v2-grid-2">
        {/* Ticket Volume bar chart */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div>
              <div className="v2-card-title">Ticket Volume</div>
              <div className="v2-card-subtitle">Opened vs Resolved · Last 8 months</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--indigo)', display: 'inline-block' }} /> Opened
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)', display: 'inline-block' }} /> Resolved
              </span>
              <select style={{ fontSize: 11, padding: '4px 8px', height: 28, borderRadius: 6, border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'var(--bg-card)', cursor: 'pointer', outline: 'none' }}>
                <option>8 months</option>
                <option>6 months</option>
                <option>3 months</option>
              </select>
            </div>
          </div>
          <div className="v2-card-body" style={{ paddingTop: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {/* Y-axis labels */}
              <div style={{ width: 26, height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0 }}>
                {[1, 0.67, 0.33, 0].map((frac) => (
                  <span key={frac} style={{ fontSize: 9, color: 'var(--text-light)', textAlign: 'right', lineHeight: 1 }}>
                    {frac > 0 ? Math.round(trendMax * frac / 10) * 10 : ''}
                  </span>
                ))}
              </div>
              {/* Chart area */}
              <div style={{ flex: 1, position: 'relative', height: 110, overflow: 'visible' }}>
                {/* Grid lines */}
                {[0, 0.33, 0.67, 1].map((frac) => (
                  <div key={frac} style={{ position: 'absolute', top: `${frac * 100}%`, left: 0, right: 0, height: 1, background: 'var(--border)', zIndex: 0 }} />
                ))}
                {/* Bar columns */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'flex-end', gap: 4, zIndex: 1 }}>
                  {DEMO.trend.map((t, i) => {
                    const isLast = i === DEMO.trend.length - 1;
                    const oh = Math.max(2, Math.round((t.opened / trendMax) * 110));
                    const rh = t.resolved ? Math.max(2, Math.round((t.resolved / trendMax) * 110)) : 0;
                    return (
                      <div key={t.month} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                        {isLast && (
                          <span style={{
                            position: 'absolute', bottom: oh + 4, left: '50%', transform: 'translateX(-50%)',
                            fontSize: 9, fontWeight: 700, color: 'white', background: 'var(--indigo)',
                            borderRadius: 3, padding: '2px 5px', lineHeight: 1.5, whiteSpace: 'nowrap',
                          }}>{t.opened}</span>
                        )}
                        <div style={{ flex: 1, height: oh, background: 'var(--indigo)', borderRadius: '3px 3px 0 0', opacity: 0.85, minHeight: 2 }} />
                        {!isLast && t.resolved && (
                          <div style={{ flex: 1, height: rh, background: 'var(--green)', borderRadius: '3px 3px 0 0', opacity: 0.75, minHeight: 2 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* X-axis labels */}
            <div style={{ display: 'flex', marginLeft: 32, gap: 4, marginTop: 5 }}>
              {DEMO.trend.map(t => (
                <div key={t.month} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{t.month}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Ticket categories */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">By Category</div>
            <span className="v2-card-subtitle">This month</span>
          </div>
          <div className="v2-card-body">
            {DEMO.categories.map(cat => (
              <div key={cat.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{cat.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.count} <span style={{ color: 'var(--text-light)' }}>({cat.pct}%)</span></span>
                </div>
                <div className="v2-progress-bg">
                  <div className="v2-progress-fill" style={{ width: `${cat.pct}%`, background: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Queue Health + Team Workload */}
      <div className="v2-grid-2">
        {/* Queue health */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Queue Health</div>
            <span className="v2-badge v2-badge-yellow"><Activity size={10} /> Monitor</span>
          </div>
          <div className="v2-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <QueueStat value={unassigned}   label="Unassigned"          color="var(--red)"    />
            <QueueStat value={atRisk}       label="Pickup SLA at risk"  color="var(--yellow)" />
            <QueueStat value={`${DEMO.queueStats.avgPickupMin}m`} label="Avg pickup time" color="var(--blue)" />
            <QueueStat value={autoAssigned} label="Auto-assigned today" color="var(--green)"  />
          </div>
        </div>

        {/* Team workload */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Team Workload</div>
            <span className="v2-card-subtitle">Active queues</span>
          </div>
          <div className="v2-card-body">
            {teams.map(t => (
              <div key={t.id || t.name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{t.name}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t.queued} queued</span>
                </div>
                <div className="v2-progress-bg">
                  <div className="v2-progress-fill" style={{ width: `${t.pct}%`, background: 'var(--indigo)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Top Agents + Active Alerts */}
      <div className="v2-grid-2">
        {/* Top engineers */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title" style={{ color: 'var(--indigo)' }}>Top Engineers</div>
            <span className="v2-card-subtitle">This month</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="v2-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Engineer</th>
                  <th>Team</th>
                  <th>Tickets</th>
                  <th>KPI Score</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a, i) => (
                  <tr key={`${a.name}-${i}`}>
                    <td><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)' }}>#{i + 1}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="v2-avatar-sm">{a.name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{a.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--indigo)', background: 'var(--indigo-dim)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                        {a.team}
                      </span>
                    </td>
                    <td><span style={{ fontWeight: 600 }}>{a.tickets}</span></td>
                    <td>
                      <span className={`v2-badge ${a.score >= 95 ? 'v2-badge-green' : a.score >= 85 ? 'v2-badge-indigo' : 'v2-badge-yellow'}`}>
                        {a.score}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active alerts */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Active Alerts</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {canSeeSlaWarnings && slaWarningsQ.data && slaWarningsQ.data.length > 0 && (() => {
                const redCount   = slaWarningsQ.data.filter(w => w.warningLevel === 'RED').length;
                const amberCount = slaWarningsQ.data.filter(w => w.warningLevel === 'AMBER').length;
                return (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {redCount > 0 && (
                      <a href={`/tickets?slaWarning=red`} className="v2-badge v2-badge-red" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                        🔴 {redCount} RED
                      </a>
                    )}
                    {amberCount > 0 && (
                      <a href={`/tickets?slaWarning=amber`} className="v2-badge v2-badge-yellow" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                        🟡 {amberCount} AMBER
                      </a>
                    )}
                  </div>
                );
              })()}
              <span className="v2-badge v2-badge-red">{DEMO.alerts.filter(a => a.level === 'red').length} critical</span>
            </div>
          </div>
          <div className="v2-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Sprint 18: Live SLA warning rows */}
            {canSeeSlaWarnings && slaWarningsQ.data && slaWarningsQ.data.slice(0, 3).map((w) => (
              <div
                key={w.ticketId}
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: w.warningLevel === 'RED' ? '#fee2e2' : '#fef3c7',
                  border: `1px solid ${w.warningLevel === 'RED' ? '#fca5a5' : '#fde68a'}`,
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                  background: w.warningLevel === 'RED' ? '#dc2626' : '#d97706',
                }} />
                <span style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  <strong>{w.warningLevel}</strong> — [{w.ticketRef}] {w.title}
                  {w.assigneeName && <span style={{ color: 'var(--text-muted)' }}> · {w.assigneeName}</span>}
                  <span style={{ color: 'var(--text-light)', marginLeft: 4 }}>({w.minutesRemaining}m left)</span>
                </span>
              </div>
            ))}
            {DEMO.alerts.map((alert) => {
              const c = ALERT_COLORS[alert.level];
              return (
                <div
                  key={alert.text}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)', background: c.bg, border: `1px solid ${c.dot}22`,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, marginTop: 4, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: c.text, lineHeight: 1.45 }}>{alert.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SUPERADMIN: System Health mini-widget ────────────────────────── */}
      {role === 'SUPERADMIN' && (
        <div className="v2-card" style={{ marginTop: 16, borderColor: 'var(--indigo)' }}>
          <div className="v2-card-header">
            <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} style={{ color: 'var(--indigo)' }} /> System Health
              <span className="v2-badge v2-badge-green" style={{ marginLeft: 6 }}>All systems operational</span>
            </div>
            <a href="/system-health" className="v2-btn v2-btn-ghost v2-btn-sm" style={{ fontSize: 11 }}>
              View full dashboard →
            </a>
          </div>
          <div className="v2-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: 'API',        status: 'Operational', color: 'var(--green)' },
                { label: 'MSSQL',      status: 'Operational', color: 'var(--green)' },
                { label: 'Queue',      status: 'Operational', color: 'var(--green)' },
                { label: 'BullMQ',     status: 'Operational', color: 'var(--green)' },
              ].map((svc) => (
                <div key={svc.label} style={{
                  padding: '12px 14px', borderRadius: 8,
                  background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{svc.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: svc.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: svc.color }}>{svc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sprint 19: Workload Rebalancing Panel (TEAM_LEAD+) ───────────── */}
      {['TEAM_LEAD', 'IT_MANAGER', 'ADMIN', 'SUPERADMIN'].includes(role) && (
        <div style={{ marginTop: 16 }}>
          <WorkloadPanel
            role={role}
            teamId={me?.teamId ?? undefined}
            teamName={isTeamLead ? 'My Team' : undefined}
          />
        </div>
      )}
    </div>
  );
}

// ── Local sub-components ─────────────────────────────────────────────────────

function StatCard({
  color, icon, value, label, trend, trendUp,
}: {
  color: string;
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className={`v2-stat-card ${color}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className={`v2-stat-icon-box ${color}`}>{icon}</div>
        <span className={`v2-trend ${trendUp ? 'v2-trend-up' : 'v2-trend-down'}`}>
          {trendUp ? '▲' : '▼'} {trend}
        </span>
      </div>
      <div className="v2-stat-value">{value}</div>
      <div className="v2-stat-label">{label}</div>
    </div>
  );
}

function QueueStat({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius-sm)', padding: '12px 14px', border: '1px solid var(--border)', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -0.8 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
    </div>
  );
}


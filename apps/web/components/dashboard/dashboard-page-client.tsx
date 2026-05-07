'use client';

import { trpc } from '../../lib/trpc/client';
import {
  Ticket, AlertTriangle, CheckCircle2, TrendingUp,
  Users, Clock, Activity, ArrowUpRight, RefreshCw,
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
    { name: 'A. Okonkwo',  tickets: 42, score: 98 },
    { name: 'F. Mohammed', tickets: 38, score: 95 },
    { name: 'C. Boateng',  tickets: 35, score: 91 },
    { name: 'N. Kamara',   tickets: 29, score: 89 },
    { name: 'D. Mensah',   tickets: 27, score: 82 },
  ],
  alerts: [
    { level: 'red',    text: 'SLA breach — TKT-0491 Critical, D.Mensah, overdue 2h 40m' },
    { level: 'yellow', text: '4 tickets approaching pickup SLA — IT Support queue' },
    { level: 'blue',   text: 'CSAT dipped in DB Team — 3.8 vs 4.2 target' },
    { level: 'gray',   text: 'Scheduled maintenance Saturday 01:00–04:00 WAT' },
  ],
  trend: [
    { month: 'Oct', val: 198 }, { month: 'Nov', val: 215 }, { month: 'Dec', val: 189 },
    { month: 'Jan', val: 231 }, { month: 'Feb', val: 244 }, { month: 'Mar', val: 226 },
    { month: 'Apr', val: 238 }, { month: 'May', val: 247 },
  ],
};

const ALERT_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  red:    { dot: 'var(--red)',    text: 'var(--red)',    bg: 'var(--red-bg)' },
  yellow: { dot: 'var(--yellow)', text: 'var(--yellow)', bg: 'var(--yellow-bg)' },
  blue:   { dot: 'var(--blue)',   text: 'var(--text-primary)', bg: 'var(--blue-bg)' },
  gray:   { dot: 'var(--text-light)', text: 'var(--text-muted)', bg: 'var(--bg-subtle)' },
};

export function DashboardPageClient() {
  // Live data from tRPC (used to hydrate over demo values)
  const summaryQ = trpc['dashboard.summary'].useQuery(undefined, { staleTime: 25_000, refetchInterval: 30_000 });
  const queueQ   = trpc['dashboard.queueHealth'].useQuery(undefined, { staleTime: 25_000 });

  const liveOpen     = (summaryQ.data as { openTickets?: number } | undefined)?.openTickets;
  const openTickets  = liveOpen ?? DEMO.openTickets;
  const trendMax     = Math.max(...DEMO.trend.map(t => t.val));

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Live performance overview · auto-refreshes every 30s</p>
        </div>
        <div className="v2-page-header-actions">
          {summaryQ.isFetching && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={11} className="animate-spin" /> Refreshing
            </span>
          )}
          <button className="v2-btn v2-btn-secondary v2-btn-sm">
            <Clock size={12} /> Last 30 days
          </button>
          <button className="v2-btn v2-btn-primary v2-btn-sm">
            <ArrowUpRight size={12} /> Full Report
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="v2-stats-grid">
        <StatCard color="indigo" icon={<Ticket size={15} />} value={openTickets} label="Open Tickets" trend="+3%" trendUp />
        <StatCard color="red"    icon={<AlertTriangle size={15} />} value={DEMO.slaBreached} label="SLA Breached" trend="-2" trendUp={false} />
        <StatCard color="green"  icon={<CheckCircle2 size={15} />} value={DEMO.resolvedMTD} label="Resolved MTD" trend="+11%" trendUp />
        <StatCard color="blue"   icon={<TrendingUp size={15} />}  value={`${DEMO.kpiScore}%`} label="KPI Score" trend="+2.1%" trendUp />
      </div>

      {/* Row 2: Ticket Volume Chart + Ticket Categories */}
      <div className="v2-grid-2">
        {/* Ticket Volume bar chart */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div>
              <div className="v2-card-title">Ticket Volume Trend</div>
              <div className="v2-card-subtitle">Oct 2025 – May 2026</div>
            </div>
            <span className="v2-badge v2-badge-indigo"><ArrowUpRight size={10} /> 3.8%</span>
          </div>
          <div className="v2-card-body" style={{ paddingTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, paddingBottom: 8 }}>
              {DEMO.trend.map((t, i) => {
                const isLast = i === DEMO.trend.length - 1;
                const h = Math.round((t.val / trendMax) * 100);
                return (
                  <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    {isLast && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--indigo)' }}>{t.val}</span>
                    )}
                    <div
                      style={{
                        width: '100%', height: `${h}%`,
                        background: isLast ? 'var(--indigo)' : 'var(--indigo-dim)',
                        border: isLast ? '1.5px solid var(--indigo)' : '1px solid var(--indigo-border)',
                        borderRadius: '3px 3px 0 0', minHeight: 4, transition: 'height 0.3s',
                      }}
                    />
                    <span style={{ fontSize: 9, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{t.month}</span>
                  </div>
                );
              })}
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
            <QueueStat value={DEMO.queueStats.unassigned} label="Unassigned" color="var(--red)" />
            <QueueStat value={DEMO.queueStats.pickupRisk} label="Pickup SLA at risk" color="var(--yellow)" />
            <QueueStat value={`${DEMO.queueStats.avgPickupMin}m`} label="Avg pickup time" color="var(--blue)" />
            <QueueStat value={DEMO.queueStats.autoAssigned} label="Auto-assigned today" color="var(--green)" />
          </div>
        </div>

        {/* Team workload */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Team Workload</div>
            <span className="v2-card-subtitle">Active queues</span>
          </div>
          <div className="v2-card-body">
            {DEMO.teams.map(t => (
              <div key={t.name} style={{ marginBottom: 14 }}>
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
        {/* Top agents */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Top Agents</div>
            <span className="v2-card-subtitle">This month</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="v2-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Agent</th>
                  <th>Tickets</th>
                  <th>KPI Score</th>
                </tr>
              </thead>
              <tbody>
                {DEMO.agents.map((a, i) => (
                  <tr key={a.name}>
                    <td><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)' }}>#{i + 1}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="v2-avatar-sm">{a.name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{a.name}</span>
                      </div>
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
            <span className="v2-badge v2-badge-red">{DEMO.alerts.filter(a => a.level === 'red').length} critical</span>
          </div>
          <div className="v2-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO.alerts.map((alert, i) => {
              const c = ALERT_COLORS[alert.level];
              return (
                <div
                  key={i}
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
    <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -0.8 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
    </div>
  );
}


export function DashboardPageClient() {
  const queryOpts = { refetchInterval: 30_000, staleTime: 25_000, placeholderData: (prev: unknown) => prev };
  const summaryQ = trpc['dashboard.summary'].useQuery(undefined, queryOpts);
  const analyticsQ = trpc['dashboard.ticketAnalytics'].useQuery(undefined, queryOpts);
  const engineerQ = trpc['dashboard.engineerPerf'].useQuery(undefined, queryOpts);
  const queueQ = trpc['dashboard.queueHealth'].useQuery(undefined, queryOpts);

  const summary = summaryQ.data as {
    openTickets: number;
    slaCompliancePct: number;
    avgResolutionHours: number;
  } | undefined;

  const analytics = analyticsQ.data as {
    ticketTrend: {
      date: string;
      totalCreated: number;
      totalResolved: number;
      slaBreachCount: number;
    }[];
    slaTrend: { date: string; compliancePct: string | null }[];
  } | undefined;

  const engineers = engineerQ.data as {
    engineerId: string;
    weekKey: string;
    ticketsResolved: number;
    tasksCompleted: number;
    slaBreaches: number;
    avgResolutionHours: string | null;
    kpiScore: string | null;
  }[] | undefined;

  const queue = queueQ.data as {
    openTickets: number;
    recentBreaches: number;
    resolvedLast3Days: number;
  } | undefined;

  const isLoadingSummary = summaryQ.isPending;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="border-l-4 border-brand pl-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>Live performance overview · auto-refreshes every 30s</p>
        </div>
        {(summaryQ.isFetching || analyticsQ.isFetching) && (
          <span className="text-xs text-brand/70 animate-pulse font-medium tracking-wide uppercase">Refreshing…</span>
        )}
      </div>

      {/* Stat cards */}
      <StatCards
        openTickets={summary?.openTickets ?? 0}
        slaCompliancePct={summary?.slaCompliancePct ?? 0}
        avgResolutionHours={summary?.avgResolutionHours ?? 0}
        isLoading={isLoadingSummary}
      />

      {/* Queue health banner */}
      {queue && (
        <div className="rounded-xl p-4 flex flex-wrap gap-6 text-sm border-l-4 border-l-brand" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderLeftWidth: '4px', borderLeftColor: '#f57f20' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Queue Health:
            <span className="ml-2 font-semibold text-brand">{queue.openTickets} open</span>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            SLA breaches (3d):
            <span className={`ml-2 font-semibold ${queue.recentBreaches > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {queue.recentBreaches}
            </span>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Resolved (3d):
            <span className="ml-2 font-semibold text-emerald-400">{queue.resolvedLast3Days}</span>
          </span>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TicketAnalytics
          ticketTrend={analytics?.ticketTrend}
          slaTrend={analytics?.slaTrend}
          isLoading={analyticsQ.isPending}
        />

        {/* Placeholder for future donut chart */}
        <div className="rounded-xl p-5 flex flex-col justify-center items-center text-center gap-2" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status Breakdown</p>
          {queue ? (
            <div className="space-y-1 text-sm">
              <p style={{ color: 'var(--text-primary)' }}>Open: <span className="font-semibold text-[#f57f20]">{queue.openTickets}</span></p>
              <p style={{ color: 'var(--text-primary)' }}>Resolved (3d): <span className="font-semibold text-emerald-500">{queue.resolvedLast3Days}</span></p>
              <p style={{ color: 'var(--text-primary)' }}>SLA Breaches (3d): <span className={`font-semibold ${queue.recentBreaches > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{queue.recentBreaches}</span></p>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          )}
        </div>
      </div>

      {/* Engineer performance */}
      <EngineerPerfTable rows={engineers} isLoading={engineerQ.isPending} />
    </div>
  );
}

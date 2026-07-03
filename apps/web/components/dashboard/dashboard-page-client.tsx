'use client';

import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import {
  useDashboardSummary,
  useDashboardQueueHealth,
  useDashboardEngineerPerf,
  useDashboardTeamWorkload,
  useDashboardTicketAnalytics,
  useSlaWarnings,
} from '@/lib/api/hooks/useDashboard';
import { EmptyState } from '@/components/ui/empty-state';
import { WorkloadPanel } from './workload-panel';
import {
  Ticket, AlertTriangle, CheckCircle2, TrendingUp,
  Clock, Activity, ArrowUpRight, RefreshCw,
} from 'lucide-react';

type TrendPoint = { label: string; opened: number; resolved: number };

function statVal(value: number | undefined | null, loading: boolean): string | number {
  if (loading && value == null) return '—';
  return value ?? 0;
}

function parseTicketTrend(raw: Record<string, unknown> | undefined): TrendPoint[] {
  const trend = (raw?.ticketTrend ?? raw?.TicketTrend) as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(trend) || trend.length === 0) return [];
  return trend.map((row) => {
    const dateStr = String(row.date ?? row.Date ?? '');
    const d = dateStr ? new Date(dateStr) : new Date();
    return {
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      opened: Number(row.totalCreated ?? row.TotalCreated ?? 0),
      resolved: Number(row.totalResolved ?? row.TotalResolved ?? 0),
    };
  });
}

export function DashboardPageClient() {
  const { data: me } = useCurrentUser();
  const role = me?.roleName ?? '';
  const isEngineer  = role === 'ENGINEER';
  const isTeamLead  = role === 'TEAM_LEAD';

  const summaryQ      = useDashboardSummary({ staleTime: 25_000, refetchInterval: 30_000 });
  const queueQ        = useDashboardQueueHealth({ staleTime: 25_000, refetchInterval: 30_000 });
  const analyticsQ    = useDashboardTicketAnalytics(7, { staleTime: 60_000, refetchInterval: 120_000 });
  const engPerfQ      = useDashboardEngineerPerf({ staleTime: 60_000 });
  const teamWorkloadQ = useDashboardTeamWorkload({ staleTime: 30_000, refetchInterval: 60_000 });
  const canSeeSlaWarnings = ['IT_MANAGER', 'ADMIN', 'SUPERADMIN', 'TEAM_LEAD'].includes(role);
  const slaWarningsQ = useSlaWarnings({
    staleTime: 60_000,
    refetchInterval: 120_000,
    enabled: canSeeSlaWarnings,
  });

  const summaryLoading = summaryQ.isLoading && !summaryQ.isFetched;
  const queueLoading = queueQ.isLoading && !queueQ.isFetched;

  const openTickets  = statVal(summaryQ.data?.openTickets as number | undefined, summaryLoading);
  const slaBreached  = statVal(summaryQ.data?.slaBreached as number | undefined, summaryLoading);
  const resolvedMTD  = statVal(
    (summaryQ.data?.resolvedMtd ?? summaryQ.data?.resolvedMTD) as number | undefined,
    summaryLoading,
  );
  const kpiScoreRaw  = summaryQ.data?.kpiScore as number | undefined;
  const kpiScore     = summaryLoading && kpiScoreRaw == null ? '—' : `${Math.round(kpiScoreRaw ?? 0)}%`;

  const unassigned   = statVal(queueQ.data?.unassigned as number | undefined, queueLoading);
  const atRisk       = statVal(queueQ.data?.atRisk as number | undefined, queueLoading);
  const autoAssigned = statVal(queueQ.data?.autoAssignedToday as number | undefined, queueLoading);

  const liveAgents = engPerfQ.data as { name?: string; team?: string; tickets?: number; score?: number }[] | undefined;
  const agents = (liveAgents ?? []).map(a => ({
    name: a.name ?? '–',
    team: a.team ?? '–',
    tickets: a.tickets ?? 0,
    score: a.score ?? 0,
  }));

  const liveTeams = teamWorkloadQ.data as { id?: string; name?: string; tag?: string; queued?: number; pct?: number }[] | undefined;
  const teams = (liveTeams ?? []).map(t => ({
    id: t.id ?? '',
    name: t.tag ?? t.name ?? '–',
    queued: t.queued ?? 0,
    pct: t.pct ?? 0,
  }));

  const trend = parseTicketTrend(analyticsQ.data as Record<string, unknown> | undefined);
  const trendMax = trend.length > 0 ? Math.max(...trend.map(t => Math.max(t.opened, t.resolved)), 1) : 1;

  const slaWarnings = slaWarningsQ.data ?? [];
  const redCount = slaWarnings.filter(w => w.warningLevel === 'RED').length;
  const amberCount = slaWarnings.filter(w => w.warningLevel === 'AMBER').length;

  return (
    <div>
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
            <Clock size={12} /> Last 7 days
          </button>
          <a href="/reports" className="v2-btn v2-btn-primary v2-btn-sm">
            <ArrowUpRight size={12} /> Full Report
          </a>
        </div>
      </div>

      <div className="v2-stats-grid">
        <StatCard color="indigo" icon={<Ticket size={15} />}       value={openTickets} label={isEngineer ? 'My Open Tickets' : isTeamLead ? 'Team Open Tickets' : 'Open Tickets'} />
        <StatCard color="red"    icon={<AlertTriangle size={15} />} value={slaBreached} label={isEngineer ? 'My SLA Breached' : 'SLA Breached'} />
        <StatCard color="green"  icon={<CheckCircle2 size={15} />} value={resolvedMTD} label={isEngineer ? 'I Resolved MTD' : isTeamLead ? 'Team Resolved MTD' : 'Resolved MTD'} />
        <StatCard color="blue"   icon={<TrendingUp size={15} />}   value={kpiScore} label={isEngineer ? 'My KPI Score' : isTeamLead ? 'Team KPI Score' : 'KPI Score'} />
      </div>

      <div className="v2-grid-2">
        <div className="v2-card">
          <div className="v2-card-header">
            <div>
              <div className="v2-card-title">Ticket Volume</div>
              <div className="v2-card-subtitle">Opened vs Resolved · Last 7 days</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--indigo)', display: 'inline-block' }} /> Opened
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)', display: 'inline-block' }} /> Resolved
              </span>
            </div>
          </div>
          <div className="v2-card-body" style={{ paddingTop: 8 }}>
            {analyticsQ.isLoading && trend.length === 0 ? (
              <EmptyState title="Loading ticket trends…" />
            ) : trend.length === 0 ? (
              <EmptyState title="No ticket activity yet" message="Volume data will appear once tickets are created." />
            ) : (
              <>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 26, height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0 }}>
                    {[1, 0.67, 0.33, 0].map((frac) => (
                      <span key={frac} style={{ fontSize: 9, color: 'var(--text-light)', textAlign: 'right', lineHeight: 1 }}>
                        {frac > 0 ? Math.round(trendMax * frac) : ''}
                      </span>
                    ))}
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: 110, overflow: 'visible' }}>
                    {[0, 0.33, 0.67, 1].map((frac) => (
                      <div key={frac} style={{ position: 'absolute', top: `${frac * 100}%`, left: 0, right: 0, height: 1, background: 'var(--border)', zIndex: 0 }} />
                    ))}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'flex-end', gap: 4, zIndex: 1 }}>
                      {trend.map((t) => {
                        const oh = Math.max(2, Math.round((t.opened / trendMax) * 110));
                        const rh = Math.max(2, Math.round((t.resolved / trendMax) * 110));
                        return (
                          <div key={t.label} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                            <div style={{ flex: 1, height: oh, background: 'var(--indigo)', borderRadius: '3px 3px 0 0', opacity: 0.85, minHeight: 2 }} title={`Opened: ${t.opened}`} />
                            <div style={{ flex: 1, height: rh, background: 'var(--green)', borderRadius: '3px 3px 0 0', opacity: 0.75, minHeight: 2 }} title={`Resolved: ${t.resolved}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', marginLeft: 32, gap: 4, marginTop: 5 }}>
                  {trend.map(t => (
                    <div key={t.label} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{t.label}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">By Category</div>
            <span className="v2-card-subtitle">This month</span>
          </div>
          <div className="v2-card-body">
            <EmptyState
              title="Category breakdown coming soon"
              message="Ticket category analytics will appear here once category routing is enabled."
            />
          </div>
        </div>
      </div>

      <div className="v2-grid-2">
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Queue Health</div>
            <span className="v2-badge v2-badge-yellow"><Activity size={10} /> Live</span>
          </div>
          <div className="v2-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <QueueStat value={unassigned}   label="Unassigned"          color="var(--red)"    />
            <QueueStat value={atRisk}       label="Pickup SLA at risk"  color="var(--yellow)" />
            <QueueStat value="—"            label="Avg pickup time"     color="var(--blue)"   />
            <QueueStat value={autoAssigned} label="Auto-assigned today" color="var(--green)"  />
          </div>
        </div>

        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Team Workload</div>
            <span className="v2-card-subtitle">Active queues</span>
          </div>
          <div className="v2-card-body">
            {teamWorkloadQ.isLoading && teams.length === 0 ? (
              <EmptyState title="Loading team workload…" />
            ) : teams.length === 0 ? (
              <EmptyState title="No queued tickets" message="All teams are clear." />
            ) : (
              teams.map(t => (
                <div key={t.id || t.name} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{t.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t.queued} queued</span>
                  </div>
                  <div className="v2-progress-bg">
                    <div className="v2-progress-fill" style={{ width: `${t.pct}%`, background: 'var(--indigo)' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="v2-grid-2">
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title" style={{ color: 'var(--indigo)' }}>Top Engineers</div>
            <span className="v2-card-subtitle">This month</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {engPerfQ.isLoading && agents.length === 0 ? (
              <EmptyState title="Loading engineer performance…" />
            ) : agents.length === 0 ? (
              <EmptyState title="No performance data yet" message="Engineer rankings appear once tickets are resolved." />
            ) : (
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
                          <div className="v2-avatar-sm">{a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
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
            )}
          </div>
        </div>

        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Active Alerts</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {canSeeSlaWarnings && slaWarnings.length > 0 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {redCount > 0 && (
                    <a href="/tickets?slaWarning=red" className="v2-badge v2-badge-red" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                      🔴 {redCount} RED
                    </a>
                  )}
                  {amberCount > 0 && (
                    <a href="/tickets?slaWarning=amber" className="v2-badge v2-badge-yellow" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                      🟡 {amberCount} AMBER
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="v2-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {canSeeSlaWarnings && slaWarningsQ.isLoading && (
              <EmptyState title="Loading SLA warnings…" />
            )}
            {canSeeSlaWarnings && !slaWarningsQ.isLoading && slaWarnings.slice(0, 5).map((w) => (
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
            {canSeeSlaWarnings && !slaWarningsQ.isLoading && slaWarnings.length === 0 && (
              <EmptyState title="No active SLA warnings" message="All tickets are within SLA thresholds." />
            )}
            {!canSeeSlaWarnings && typeof slaBreached === 'number' && slaBreached > 0 && (
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
                borderRadius: 'var(--radius-sm)', background: 'var(--red-bg)', border: '1px solid #fca5a5',
              }}>
                <AlertTriangle size={14} style={{ color: 'var(--red)', marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  {slaBreached} ticket{slaBreached === 1 ? '' : 's'} currently in SLA breach.
                </span>
              </div>
            )}
            {!canSeeSlaWarnings && typeof slaBreached === 'number' && slaBreached === 0 && summaryQ.isFetched && (
              <EmptyState title="No active alerts" message="Your tickets are within SLA." />
            )}
          </div>
        </div>
      </div>

      {role === 'SUPERADMIN' && (
        <div className="v2-card" style={{ marginTop: 16, borderColor: 'var(--indigo)' }}>
          <div className="v2-card-header">
            <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} style={{ color: 'var(--indigo)' }} /> System Health
            </div>
            <a href="/ops" className="v2-btn v2-btn-ghost v2-btn-sm" style={{ fontSize: 11 }}>
              View live status →
            </a>
          </div>
          <div className="v2-card-body">
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
              Service health, queue depths, and incident history are available on the System Health page.
            </p>
          </div>
        </div>
      )}

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

function StatCard({
  color, icon, value, label,
}: {
  color: string;
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className={`v2-stat-card ${color}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className={`v2-stat-icon-box ${color}`}>{icon}</div>
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

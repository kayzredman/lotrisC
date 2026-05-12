'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Clock, Users, ArrowRight, CheckCircle, AlertTriangle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

const PRIORITY_LABEL: Record<number, string> = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };

const ELEVATED_ROLES = new Set(['ADMIN', 'SUPERADMIN', 'IT_MANAGER']);

const WORKLOAD_COLORS = [
  'var(--indigo)', 'var(--blue)', 'var(--green)', 'var(--purple)',
  'var(--yellow)', 'var(--red)', '#06b6d4', '#f97316',
];

function formatPickupSla(deadline: Date | string | null | undefined, breached: number | boolean | null | undefined): { text: string; color: 'red' | 'yellow' | 'green' } {
  if (!deadline) return { text: '–', color: 'green' };
  if (breached) {
    const diff = Date.now() - new Date(deadline).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return { text: h > 0 ? `−${h}h ${m}m` : `−${m}m`, color: 'red' };
  }
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { text: 'Breached', color: 'red' };
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (diff < 15 * 60_000) return { text: `${m}m left`, color: 'red' };
  if (diff < 60 * 60_000) return { text: `${m}m left`, color: 'yellow' };
  return { text: h > 0 ? `${h}h ${m}m left` : `${m}m left`, color: 'green' };
}

export default function QueueTable() {
  const [page, setPage] = useState(1);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<{ id: string; msg: string } | null>(null);

  const utils = trpc.useUtils();

  // Current user (for role-scoped workload)
  const { data: me } = trpc['users.me'].useQuery(undefined, { staleTime: 60_000 });
  const role = (me as { roleName?: string } | undefined)?.roleName ?? '';
  const myTeamId = (me as { teamId?: string | null } | undefined)?.teamId ?? null;
  const isElevated = ELEVATED_ROLES.has(role);

  // Live queue data
  const { data: liveQueue } = trpc['queue.list'].useQuery({ page, limit: 25 }, { staleTime: 20_000 });
  // Queue health stats
  const { data: health } = trpc['dashboard.queueHealth'].useQuery(undefined, { staleTime: 20_000 });
  // Team workload from backend (all teams)
  const { data: teamWorkload } = trpc['dashboard.teamWorkload'].useQuery(undefined, { staleTime: 30_000 });

  const claimMutation = trpc['queue.claim'].useMutation({
    onMutate: (vars) => {
      setClaimingId(vars.ticketId);
      setClaimError(null);
    },
    onSuccess: () => {
      void utils['queue.list'].invalidate();
      void utils['dashboard.queueHealth'].invalidate();
    },
    onError: (err: { message?: string }, vars) => {
      setClaimError({ id: vars.ticketId, msg: err?.message ?? 'Failed to claim ticket' });
    },
    onSettled: () => {
      setClaimingId(null);
    },
  });

  // Map live rows → display format
  const liveRows = liveQueue?.map((t) => {
    const sla = formatPickupSla(t.slaPickupDeadline, t.slaPickupBreached);
    return {
      rawId: t.id,
      id: `TKT-${t.id.slice(-4).toUpperCase()}`,
      title: t.title,
      priority: PRIORITY_LABEL[t.priority as 1|2|3|4] ?? 'Medium',
      team: t.teamName ?? t.teamId ?? '',
      sla: sla.text,
      slaColor: sla.color,
      created: new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', ''),
    };
  });

  // Use live data only; never silently fall back to DEMO (DEMO buttons are disabled)
  const isLoading = liveQueue === undefined;
  const rows = liveRows ?? [];

  // Build role-scoped team workload sidebar
  const allTeamStats = (teamWorkload ?? []).map((t: { id: string; name: string; tag: string; queued: number; pct: number }, i: number) => ({
    ...t,
    color: WORKLOAD_COLORS[i % WORKLOAD_COLORS.length],
  }));
  // TEAM_LEAD / ENGINEER → only their own team; elevated → all teams
  const teamStats = isElevated
    ? allTeamStats
    : myTeamId
      ? allTeamStats.filter((t: { id: string }) => t.id === myTeamId)
      : allTeamStats;
  const totalQueued = teamStats.reduce((s: number, t: { queued: number }) => s + t.queued, 0) || 1;

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>Team Queue</h1>
          <p>Unassigned tickets ordered by priority and SLA deadline</p>
        </div>
        <div className="v2-page-header-actions">
          <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm"><Zap size={12} /> Auto-Assign</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { icon: <Clock size={13} />,        value: health?.unassigned ?? rows.length,        label: 'Unassigned',        color: 'var(--red)'    },
          { icon: <AlertTriangle size={13} />, value: health?.atRisk ?? 4,                      label: 'Pickup SLA at risk',color: 'var(--yellow)' },
          { icon: <Clock size={13} />,         value: '1.8m',                                   label: 'Avg pickup time',   color: 'var(--blue)'   },
          { icon: <CheckCircle size={13} />,   value: health?.autoAssignedToday ?? 3,           label: 'Auto-assigned today',color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} className="v2-card" style={{ flex: '1 1 100px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Queue table + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 14, alignItems: 'start' }}>
        {/* Main queue */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Unassigned Tickets</div>
            <span className="v2-badge v2-badge-red">{rows.length} pending</span>
          </div>
          <div className="v2-table-wrap">
            {isLoading ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Loading queue…
              </div>
            ) : rows.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No unassigned tickets in the queue right now.
              </div>
            ) : (
            <table className="v2-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Priority</th>
                  <th>Team Queue</th>
                  <th>Pickup SLA</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <tr key={t.rawId || t.id}>
                    <td>
                      <div>
                        <span className="v2-ticket-id">{t.id}</span>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', marginTop: 1 }}>{t.title}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className={`v2-dot v2-dot-${t.priority.toLowerCase()}`} />
                        {t.priority}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Users size={11} style={{ color: 'var(--text-light)' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.team}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: t.slaColor === 'red' ? 'var(--red)' : t.slaColor === 'yellow' ? 'var(--yellow)' : 'var(--green)',
                      }}>{t.sla}</span>
                    </td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.created}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        <button
                          className="v2-btn v2-btn-primary v2-btn-sm"
                          type="button"
                          disabled={claimingId === t.rawId}
                          onClick={() => {
                            setClaimError(null);
                            claimMutation.mutate({ ticketId: t.rawId });
                          }}
                        >
                          {claimingId === t.rawId ? 'Claiming…' : <><ArrowRight size={11} /> Claim</>}
                        </button>
                        {claimError?.id === t.rawId && claimError && (
                          <span style={{ fontSize: 10.5, color: 'var(--red)', maxWidth: 140, lineHeight: 1.3 }}>
                            {claimError.msg}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing 1–{rows.length} of {health?.unassigned ?? rows.length} unassigned</span>
            <div className="v2-pagination">
              <button type="button" className="v2-pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft size={12} /></button>
              <button type="button" className="v2-pg-btn active">{page}</button>
              <button type="button" className="v2-pg-btn" onClick={() => setPage(p => p + 1)}><ChevronRight size={12} /></button>
            </div>
          </div>
        </div>

        {/* Sidebar: team workload — role-scoped */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">{isElevated ? 'All Teams Workload' : 'My Team Workload'}</div>
          </div>
          <div className="v2-card-body">
            {teamStats.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No workload data</div>
            ) : teamStats.map((t: { id: string; name: string; queued: number; pct: number; color: string }) => {
              const pct = Math.round((t.queued / totalQueued) * 100);
              return (
                <div key={t.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{t.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t.queued} active</span>
                  </div>
                  <div className="v2-progress-bg">
                    <div className="v2-progress-fill" style={{ width: `${pct}%`, background: t.color }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-light)', marginTop: 3 }}>{pct}% of total</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

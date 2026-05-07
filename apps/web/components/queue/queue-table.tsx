'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Clock, Users, ArrowRight, CheckCircle, AlertTriangle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Marketing demo data (fallback) ──────────────────────────────────────────
const DEMO_QUEUE = [
  { rawId: '', id: 'TKT-0491', title: 'Network outage – Finance floor',   priority: 'Critical', team: 'Network Ops',  sla: '−2h 40m',    slaColor: 'red',    created: '2 May 09:12' },
  { rawId: '', id: 'TKT-0488', title: 'VPN access refused – 5 users',    priority: 'High',     team: 'IT Support',   sla: '1h 20m left', slaColor: 'yellow', created: '3 May 14:05' },
  { rawId: '', id: 'TKT-0487', title: 'Exchange mailbox quota exceeded',  priority: 'Medium',   team: 'IT Support',   sla: '4h 00m left', slaColor: 'green',  created: '3 May 16:30' },
  { rawId: '', id: 'TKT-0485', title: 'Azure AD group sync failure',      priority: 'High',     team: 'Network Ops',  sla: '2h 15m left', slaColor: 'yellow', created: '4 May 08:00' },
  { rawId: '', id: 'TKT-0483', title: 'WiFi dead spots – Building B',     priority: 'Medium',   team: 'Network Ops',  sla: '6h 30m left', slaColor: 'green',  created: '4 May 13:10' },
  { rawId: '', id: 'TKT-0481', title: 'Backup job failed – server02',     priority: 'Critical', team: 'DB Team',      sla: '45m left',    slaColor: 'yellow', created: '5 May 06:00' },
  { rawId: '', id: 'TKT-0480', title: 'LDAP auth timeout – Web Portal',  priority: 'High',     team: 'DB Team',      sla: '3h 00m left', slaColor: 'green',  created: '5 May 07:30' },
  { rawId: '', id: 'TKT-0478', title: 'Monitor flickering – Workstation', priority: 'Low',      team: 'IT Support',   sla: '9h 00m left', slaColor: 'green',  created: '4 May 17:00' },
  { rawId: '', id: 'TKT-0477', title: 'USB drive not recognised',         priority: 'Low',      team: 'IT Support',   sla: '1d 2h left',  slaColor: 'green',  created: '4 May 15:20' },
];

const PRIORITY_LABEL: Record<number, string> = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };

const TEAM_NAME: Record<string, string> = {
  '20000001-0000-0000-0000-000000000001': 'IT Support',
  '20000001-0000-0000-0000-000000000002': 'Network Ops',
  '20000001-0000-0000-0000-000000000003': 'DB Team',
};

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

  const utils = trpc.useUtils();

  // Live queue data
  const { data: liveQueue } = trpc['queue.list'].useQuery({ page, limit: 25 }, { staleTime: 20_000 });
  // Queue health stats
  const { data: health } = trpc['dashboard.queueHealth'].useQuery(undefined, { staleTime: 20_000 });

  const claimMutation = trpc['queue.claim'].useMutation({
    onMutate: (vars) => setClaimingId(vars.ticketId),
    onSettled: () => {
      setClaimingId(null);
      void utils['queue.list'].invalidate();
      void utils['dashboard.queueHealth'].invalidate();
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
      team: t.teamId ? (TEAM_NAME[t.teamId] ?? 'IT Support') : 'IT Support',
      sla: sla.text,
      slaColor: sla.color,
      created: new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', ''),
    };
  });

  const rows = (liveRows && liveRows.length > 0) ? liveRows : DEMO_QUEUE;

  // Team workload counts from live data
  const teamCounts = rows.reduce<Record<string, number>>((acc, t) => {
    acc[t.team] = (acc[t.team] ?? 0) + 1;
    return acc;
  }, {});
  const totalQueued = rows.length || 1;
  const teamStats = [
    { team: 'IT Support',  queued: teamCounts['IT Support'] ?? 5,  color: 'var(--indigo)' },
    { team: 'Network Ops', queued: teamCounts['Network Ops'] ?? 2, color: 'var(--blue)'   },
    { team: 'DB Team',     queued: teamCounts['DB Team'] ?? 2,     color: 'var(--green)'  },
  ];

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
                      <button
                        className="v2-btn v2-btn-primary v2-btn-sm"
                        type="button"
                        onClick={() => t.rawId && claimMutation.mutate({ ticketId: t.rawId })}
                      >
                        {claimingId === t.rawId ? 'Claiming…' : <><ArrowRight size={11} /> Claim</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

        {/* Sidebar: team workload */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Team Workload</div>
          </div>
          <div className="v2-card-body">
            {teamStats.map(t => {
              const pct = Math.round((t.queued / totalQueued) * 100);
              return (
                <div key={t.team} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{t.team}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t.queued} queued</span>
                  </div>
                  <div className="v2-progress-bg">
                    <div className="v2-progress-fill" style={{ width: `${pct}%`, background: t.color }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-light)', marginTop: 3 }}>{pct}% of queue</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

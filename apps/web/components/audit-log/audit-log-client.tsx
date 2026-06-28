'use client';

import { useState } from 'react';
import { useAuditLogsList } from '@/lib/api/hooks/useAuditLogs';
import { Search, Shield } from 'lucide-react';

// ── Demo data matching the v2 design ────────────────────────────────────────
const DEMO_LOGS = [
  { id: 1,  action: 'USER_CREATED',      entity: 'User',   entityId: 'u-082', actor: 'A. Okonkwo',   details: 'Invited kweku@lotris.app',             time: '08:47 AM',  date: 'Today'    },
  { id: 2,  action: 'ROLE_ASSIGNED',     entity: 'User',   entityId: 'u-082', actor: 'A. Okonkwo',   details: 'Role → AGENT',                         time: '08:48 AM',  date: 'Today'    },
  { id: 3,  action: 'TICKET_ESCALATED',  entity: 'Ticket', entityId: 'TKT-0491', actor: 'F. Mohammed', details: 'Priority raised from High → Critical', time: '09:12 AM',  date: 'Today'    },
  { id: 4,  action: 'SLA_BREACHED',      entity: 'Ticket', entityId: 'TKT-0488', actor: 'System',      details: 'SLA deadline exceeded — 1st response',  time: '09:34 AM',  date: 'Today'    },
  { id: 5,  action: 'TEAM_UPDATED',      entity: 'Team',   entityId: 'tm-03', actor: 'A. Okonkwo',   details: 'Name → "DB Administration"',           time: '10:01 AM',  date: 'Today'    },
  { id: 6,  action: 'TICKET_CLOSED',     entity: 'Ticket', entityId: 'TKT-0483', actor: 'N. Kamara',   details: 'Resolution: Password reset complete',  time: '10:22 AM',  date: 'Today'    },
  { id: 7,  action: 'USER_DEACTIVATED',  entity: 'User',   entityId: 'u-041', actor: 'A. Okonkwo',   details: 'Offboarded: access revoked',            time: '11:05 AM',  date: 'Today'    },
  { id: 8,  action: 'TICKET_CREATED',    entity: 'Ticket', entityId: 'TKT-0491', actor: 'D. Mensah',   details: 'Submitted via portal',                time: '11:30 AM',  date: 'Today'    },
  { id: 9,  action: 'TASK_UPDATED',      entity: 'Task',   entityId: 't-07',  actor: 'F. Mohammed',  details: 'Progress updated to 100%',             time: '01:14 PM',  date: 'Today'    },
  { id: 10, action: 'TICKET_ASSIGNED',   entity: 'Ticket', entityId: 'TKT-0490', actor: 'System',      details: 'Auto-assigned via round-robin queue',  time: '01:45 PM',  date: 'Today'    },
  { id: 11, action: 'KPI_RECORDED',      entity: 'KPI',    entityId: 'kpi-2', actor: 'System',       details: 'SLA Compliance Rate → 92.4% (May)',    time: '02:00 PM',  date: 'Today'    },
  { id: 12, action: 'TICKET_REOPENED',   entity: 'Ticket', entityId: 'TKT-0481', actor: 'B. Ibrahim',  details: 'Customer reported issue persists',     time: '02:38 PM',  date: 'Today'    },
];

const ACTION_COLORS: Record<string, string> = {
  USER_CREATED:     'v2-badge-green',
  ROLE_ASSIGNED:    'v2-badge-indigo',
  TICKET_ESCALATED: 'v2-badge-orange',
  SLA_BREACHED:     'v2-badge-red',
  TEAM_UPDATED:     'v2-badge-blue',
  TICKET_CLOSED:    'v2-badge-green',
  USER_DEACTIVATED: 'v2-badge-red',
  TICKET_CREATED:   'v2-badge-blue',
  TASK_UPDATED:     'v2-badge-indigo',
  TICKET_ASSIGNED:  'v2-badge-gray',
  KPI_RECORDED:     'v2-badge-indigo',
  TICKET_REOPENED:  'v2-badge-yellow',
};

const ALL_ACTIONS = ['All', 'USER_CREATED', 'ROLE_ASSIGNED', 'TICKET_ESCALATED', 'SLA_BREACHED', 'TEAM_UPDATED', 'TICKET_CLOSED', 'USER_DEACTIVATED', 'KPI_RECORDED'];

export default function AuditLogClient() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  // Live data — overlay on top of demo when available
  const { data: liveData } = useAuditLogsList({ limit: 50 }, { staleTime: 30_000 });

  const rows = liveData && liveData.length > 0
    ? liveData.map((r: any, i: number) => ({
        id: r.id,
        action: r.action,
        entity: r.entityType ?? '—',
        entityId: r.entityId ?? '—',
        actor: r.userId?.slice(0, 8) ?? 'System',
        details: r.details ? JSON.stringify(r.details).slice(0, 60) : '—',
        time: new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'Today',
      }))
    : DEMO_LOGS;

  const filtered = rows.filter((r: typeof DEMO_LOGS[0]) => {
    const matchSearch = !search || r.action.includes(search.toUpperCase()) || r.entityId.toLowerCase().includes(search.toLowerCase()) || r.actor.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'All' || r.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>Audit Log</h1>
          <p>Immutable record of all system actions and admin changes</p>
        </div>
        <div className="v2-page-header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)', background: 'var(--green-bg)', padding: '4px 10px', borderRadius: 20, fontWeight: 500 }}>
            <Shield size={11} /> Tamper-proof
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="v2-filter-bar" style={{ marginBottom: 16 }}>
        <div className="v2-search-bar" style={{ width: 240, background: 'white' }}>
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search action or actor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', flex: 1 }}
          />
        </div>
        <select className="v2-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          {ALL_ACTIONS.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      {/* Audit log table */}
      <div className="v2-card">
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Actor</th>
                <th>Details</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: typeof DEMO_LOGS[0]) => (
                <tr key={r.id}>
                  <td><span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.id}</span></td>
                  <td><span className={`v2-badge ${ACTION_COLORS[r.action] ?? 'v2-badge-gray'}`} style={{ fontSize: 10.5 }}>{r.action}</span></td>
                  <td><span style={{ fontSize: 12.5 }}>{r.entity}</span></td>
                  <td><span className="v2-ticket-id">{r.entityId}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="v2-avatar-sm" style={{ width: 20, height: 20, fontSize: 9, background: 'var(--indigo-bg)' }}>
                        {r.actor === 'System' ? 'SY' : r.actor.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span style={{ fontSize: 12 }}>{r.actor}</span>
                    </div>
                  </td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 260, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.details}</span></td>
                  <td><span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.date} · {r.time}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {rows.length} entries
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useAuditLogsList } from '@/lib/api/hooks/useAuditLogs';
import { EmptyState } from '@/components/ui/empty-state';
import { Search, Shield } from 'lucide-react';

type AuditRow = {
  id: string | number;
  action: string;
  entity: string;
  entityId: string;
  actor: string;
  details: string;
  time: string;
  date: string;
};

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

  const { data: liveData, isLoading } = useAuditLogsList({ limit: 50 }, { staleTime: 30_000 });

  const rows: AuditRow[] = (liveData ?? []).map((r: Record<string, unknown>, i: number) => {
    const createdAt = r.createdAt ? new Date(String(r.createdAt)) : new Date();
    const isToday = createdAt.toDateString() === new Date().toDateString();
    return {
      id: String(r.id ?? i),
      action: String(r.action ?? '—'),
      entity: String(r.entityType ?? '—'),
      entityId: String(r.entityId ?? '—'),
      actor: r.userName ? String(r.userName) : r.userId ? String(r.userId).slice(0, 8) : 'System',
      details: r.details ? JSON.stringify(r.details).slice(0, 60) : '—',
      time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: isToday ? 'Today' : createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    };
  });

  const filtered = rows.filter((r) => {
    const matchSearch = !search || r.action.includes(search.toUpperCase()) || r.entityId.toLowerCase().includes(search.toLowerCase()) || r.actor.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'All' || r.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div>
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
              {isLoading && (
                <tr><td colSpan={7}><EmptyState title="Loading audit log…" /></td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7}><EmptyState title="No audit entries" message="System actions will appear here as they occur." /></td></tr>
              )}
              {filtered.map((r) => (
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

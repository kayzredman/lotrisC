'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import { useDashboardSummary, useDashboardQueueHealth } from '@/lib/api/hooks/useDashboard';
import { useTicketsList } from '@/lib/api/hooks/useTickets';
import { CreateTicketModal } from './create-ticket-modal';
import { TicketDrawer } from './ticket-drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Demo user ID → short name map (matches seed.ts fixed UUIDs) ──────────────
const USER_SHORT: Record<string, string> = {
  '30000001-0000-0000-0000-000000000005': 'A. Okonkwo',
  '30000001-0000-0000-0000-000000000006': 'F. Mohammed',
  '30000001-0000-0000-0000-000000000007': 'C. Boateng',
  '30000001-0000-0000-0000-000000000008': 'N. Kamara',
  '30000001-0000-0000-0000-000000000009': 'D. Mensah',
  '30000001-0000-0000-0000-000000000010': 'B. Ibrahim',
  '30000001-0000-0000-0000-000000000003': 'K. Boateng (Lead)',
  '30000001-0000-0000-0000-000000000004': 'A. Darko (Lead)',
};

const PRIORITY_LABEL: Record<number, string> = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };

const STATUS_LABEL: Record<string, string> = {
  NEW: 'New', TEAM_ASSIGNED: 'Unassigned', ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress', ESCALATED: 'Escalated', RESOLVED: 'Resolved', CLOSED: 'Closed',
};

function formatSla(deadline: Date | string | null | undefined, breached: number | boolean | null | undefined): { text: string; color: 'red' | 'yellow' | 'green' } {
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
  if (diff < 30 * 60_000) return { text: `${m}m left`, color: 'red' };
  if (diff < 2 * 3_600_000) return { text: `${h}h ${m}m left`, color: 'yellow' };
  return { text: h > 0 ? `${h}h ${m}m left` : `${m}m left`, color: 'green' };
}

// ── Tab → status filter map ───────────────────────────────────────────────────
const TAB_STATUS: Record<string, string | undefined> = {
  All: undefined, New: 'NEW', Unassigned: 'TEAM_ASSIGNED',
  Assigned: 'ASSIGNED', 'In Progress': 'IN_PROGRESS',
  Escalated: 'ESCALATED', Resolved: 'RESOLVED',
};

const STATUS_BADGE: Record<string, string> = {
  'SLA Breach':     'v2-badge-red',
  'In Progress':    'v2-badge-blue',
  'Open':           'v2-badge-indigo',
  'Pending Review': 'v2-badge-yellow',
  'Resolved':       'v2-badge-green',
  'Escalated':      'v2-badge-orange',
  'New':            'v2-badge-gray',
  'Assigned':       'v2-badge-indigo',
};

const SOURCE_BADGE: Record<string, React.ReactNode> = {
  INTERNAL:     null,
  SELF_SERVICE: <span className="v2-badge v2-badge-indigo">Web Form</span>,
  EMAIL:        <span className="v2-badge v2-badge-blue">Email</span>,
  API:          <span className="v2-badge v2-badge-orange">API</span>,
};

const MINI_STAT_BG: Record<string, string> = {
  indigo: 'var(--indigo-dim)',  red: 'var(--red-bg)', blue: 'var(--blue-bg)',
  orange: 'var(--orange-bg)',   green: 'var(--green-bg)', yellow: 'var(--yellow-bg)',
};
const MINI_STAT_CLR: Record<string, string> = {
  indigo: 'var(--indigo)', red: 'var(--red)', blue: 'var(--blue)',
  orange: 'var(--orange)', green: 'var(--green)', yellow: 'var(--yellow)',
};

export function TicketsTable() {
  const [activeTab, setActiveTab] = useState('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priority, setPriority] = useState<number | undefined>(undefined);

  // Debounce search so we don't fire on every keystroke
  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimeout[0]) clearTimeout(searchTimeout[0]);
    searchTimeout[1](setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350));
  }

  const queryClient = useQueryClient();

  // Role-awareness
  const { data: me } = useCurrentUser({ staleTime: 60_000 });
  const role = (me as { roleName?: string } | undefined)?.roleName ?? '';
  const isEngineer = role === 'ENGINEER';
  const isTeamLead = role === 'TEAM_LEAD';

  const statusFilter = TAB_STATUS[activeTab];

  // Read slaWarning URL param (deep-link from dashboard SLA card)
  const searchParams = useSearchParams();
  const slaWarningParam = searchParams.get('slaWarning') as 'amber' | 'red' | null;

  // Live data from MSSQL
  const { data: liveData, isLoading } = useTicketsList(
    { status: statusFilter, priority, search: debouncedSearch || undefined, page, limit: 25, slaWarning: slaWarningParam ?? undefined },
    { staleTime: 15_000 },
  );
  const ticketRows = ((liveData?.items ?? (liveData as { rows?: unknown[] } | undefined)?.rows ?? []) as Array<Record<string, unknown>>);
  const totalTickets = liveData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalTickets / 25));

  const { data: summaryData } = useDashboardSummary({ staleTime: 30_000 });
  const { data: queueData } = useDashboardQueueHealth({ staleTime: 30_000 });

  const liveRows = ticketRows.map((t) => {
    const id = String(t.id ?? '');
    const sla = (t.status === 'RESOLVED' || t.status === 'CLOSED')
      ? { text: 'SLA met', color: 'green' as const }
      : formatSla(t.slaResolutionDeadline as string | null, t.slaResolutionBreached as number | null);
    return {
      id: `TKT-${id.slice(-4).toUpperCase()}`,
      rawId: id,
      title: String(t.title ?? ''),
      priority: PRIORITY_LABEL[t.priority as 1|2|3|4] ?? 'Medium',
      status: STATUS_LABEL[String(t.status)] ?? String(t.status),
      assignee: t.assigneeId ? (USER_SHORT[String(t.assigneeId)] ?? 'Engineer') : 'Team Queue',
      team: String(t.teamName ?? '–'),
      source: String(t.source ?? 'INTERNAL'),
      sla: sla.text,
      slaColor: sla.color,
      slaWarningLevel: (t as { slaWarningLevel?: string }).slaWarningLevel ?? 'NONE',
      date: new Date(String(t.createdAt)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', ''),
    };
  });

  const rows = liveRows;

  const dash = (v: unknown): string | number => {
    if (v == null) return '—';
    if (typeof v === 'number' || typeof v === 'string') return v;
    return String(v);
  };

  const miniStats = [
    { label: 'Open',         value: dash(summaryData?.openTickets), color: 'indigo' },
    { label: 'Unassigned',   value: dash(queueData?.unassigned),    color: 'red'    },
    { label: 'Resolved MTD', value: dash(summaryData?.resolvedMtd ?? summaryData?.resolvedMTD), color: 'green' },
    { label: 'SLA Breach',   value: dash(summaryData?.slaBreached), color: 'yellow' },
  ];

  const FILTER_TABS = [
    { label: 'All',          count: totalTickets || rows.length },
    { label: 'New',          count: rows.filter(r => r.status === 'New').length },
    { label: 'Unassigned',   count: rows.filter(r => r.status === 'Unassigned').length || (queueData?.unassigned ?? 0) },
    { label: 'Assigned',     count: rows.filter(r => r.status === 'Assigned').length },
    { label: 'In Progress',  count: rows.filter(r => r.status === 'In Progress').length },
    { label: 'Escalated',    count: rows.filter(r => r.status === 'Escalated').length },
    { label: 'Resolved',     count: rows.filter(r => r.status === 'Resolved' || r.status === 'Closed').length },
  ];

  function handleCreated() {
    void queryClient.invalidateQueries({ queryKey: ['tickets', 'list'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'queue-health'] });
    setCreateOpen(false);
    setPage(1);
  }

  return (
    <div>
      {/* Role context banner */}
      {(isEngineer || isTeamLead) && (
        <div style={{
          background: isEngineer ? 'rgba(99,102,241,0.07)' : 'rgba(16,185,129,0.07)',
          border: `1px solid ${isEngineer ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '8px 14px',
          fontSize: 12.5,
          color: isEngineer ? 'var(--indigo)' : 'var(--green)',
          marginBottom: 14,
          fontWeight: 500,
        }}>
          {isEngineer ? '👤 Showing tickets assigned to you' : '👥 Showing all tickets for your team'}
        </div>
      )}

      {/* Mini stat bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {miniStats.map(s => (
          <div
            key={s.label}
            style={{
              background: MINI_STAT_BG[s.color], borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', minWidth: 90, flex: '1 1 80px',
              border: `1px solid ${MINI_STAT_CLR[s.color]}22`,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: MINI_STAT_CLR[s.color], letterSpacing: -0.5 }}>{s.value}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="v2-filter-bar">
        <div className="v2-filter-tabs">
          {FILTER_TABS.map(tab => (
            <button
              type="button"
              key={tab.label}
              className={`v2-filter-tab${activeTab === tab.label ? ' active' : ''}`}
              onClick={() => { setActiveTab(tab.label); setPage(1); }}
            >
              {tab.label}
              <span style={{ marginLeft: 4, fontSize: 10.5, color: 'var(--text-light)' }}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div className="v2-search-bar" style={{ width: 180 }}>
            <Search size={12} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
            <input type="text" placeholder="Search tickets…" value={search} onChange={e => handleSearchChange(e.target.value)} />
          </div>
          <select
            className="v2-select"
            value={priority ?? ''}
            onChange={e => { setPriority(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          >
            <option value="">All Priorities</option>
            <option value="1">Critical</option>
            <option value="2">High</option>
            <option value="3">Medium</option>
            <option value="4">Low</option>
          </select>
          <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setCreateOpen(true)}>
            <Plus size={12} /> New Ticket
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="v2-card">
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Source</th>
                <th>Assigned To</th>
                <th>Team</th>
                <th>SLA</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && rows.length === 0 && (
                <tr><td colSpan={10}><EmptyState title="Loading tickets…" /></td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={10}><EmptyState title="No tickets found" message="Create a ticket or adjust your filters." /></td></tr>
              )}
              {rows.map(t => (
                <tr key={t.rawId ?? t.id} onClick={() => setSelectedTicketId(t.rawId ?? t.id)} style={{
                  cursor: 'pointer',
                  background:
                    (t as { slaWarningLevel?: string }).slaWarningLevel === 'RED'   ? '#fee2e2' :
                    (t as { slaWarningLevel?: string }).slaWarningLevel === 'AMBER' ? '#fef3c7' :
                    undefined,
                }}>
                  <td><span className="v2-ticket-id">{t.id}</span></td>
                  <td>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 12.5 }}>{t.title}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span className={`v2-dot v2-dot-${t.priority.toLowerCase()}`} />
                      <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{t.priority}</span>
                    </div>
                  </td>
                  <td><span className={`v2-badge ${STATUS_BADGE[t.status] ?? 'v2-badge-gray'}`}>{t.status}</span></td>
                  <td>{SOURCE_BADGE[t.source ?? 'INTERNAL']}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="v2-avatar-sm">{t.assignee.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
                      <span style={{ fontSize: 12.5 }}>{t.assignee}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--indigo)', background: 'var(--indigo-dim)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                      {t.team}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 12, fontWeight: 600,
                        color: t.slaColor === 'red' ? 'var(--red)' : t.slaColor === 'yellow' ? 'var(--yellow)' : 'var(--green)',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}
                    >
                      {(t as { slaWarningLevel?: string }).slaWarningLevel === 'RED' && (
                        <span title="System-predicted SLA breach" style={{ fontSize: 11 }}>⚠</span>
                      )}
                      {t.sla}
                    </span>
                  </td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.date}</span></td>
                  <td>
                    <div className="v2-row-actions">
                      <button type="button" className="v2-row-action-btn" title="View">→</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination footer */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {totalTickets > 0
              ? `Showing ${(page - 1) * 25 + 1}–${Math.min(page * 25, totalTickets)} of ${totalTickets} tickets`
              : `${rows.length} tickets`
            }
          </span>
          <div className="v2-pagination">
            <button type="button" className="v2-pg-btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft size={12} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show pages around current
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const n = start + i;
              return n <= totalPages ? (
                <button type="button" key={n} className={`v2-pg-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ) : null;
            })}
            <button type="button" className="v2-pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight size={12} /></button>
          </div>
        </div>
      </div>

      {/* Modals / Drawers */}
      <CreateTicketModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      {selectedTicketId && (
        <TicketDrawer ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
      )}
    </div>
  );
}

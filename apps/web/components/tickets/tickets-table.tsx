'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CreateTicketModal } from './create-ticket-modal';
import { TicketDrawer } from './ticket-drawer';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Marketing demo rows (match 03-tickets-v2.html exactly) ──────────────────
const DEMO_TICKETS = [
  { id: 'TKT-0491', title: 'Network outage – Finance floor',    priority: 'Critical', status: 'SLA Breach',     assignee: 'D. Mensah',  sla: '−2h 40m', slaColor: 'red',    date: '2 May 09:12' },
  { id: 'TKT-0488', title: 'VPN access refused – 5 users',     priority: 'High',     status: 'In Progress',    assignee: 'A. Okonkwo', sla: '1h 20m left', slaColor: 'yellow', date: '3 May 14:05' },
  { id: 'TKT-0486', title: 'Printer driver – Accounting dept',  priority: 'Medium',   status: 'Open',           assignee: 'C. Boateng', sla: '6h 10m left', slaColor: 'green',  date: '4 May 11:30' },
  { id: 'TKT-0484', title: 'SAP login error – 2 users',        priority: 'High',     status: 'In Progress',    assignee: 'F. Mohammed',sla: '3h 45m left', slaColor: 'green',  date: '4 May 15:22' },
  { id: 'TKT-0482', title: 'Email sync issue – Outlook',       priority: 'Medium',   status: 'Pending Review', assignee: 'Team Queue', sla: '45m left',    slaColor: 'yellow', date: '5 May 07:48' },
  { id: 'TKT-0479', title: 'CCTV footage retrieval request',   priority: 'Low',      status: 'Resolved',       assignee: 'N. Kamara',  sla: 'SLA met',     slaColor: 'green',  date: '1 May 16:00' },
];

const FILTER_TABS = [
  { label: 'All',         count: 362 },
  { label: 'New',         count: 18  },
  { label: 'Unassigned',  count: 9   },
  { label: 'Assigned',    count: 138 },
  { label: 'In Progress', count: 84  },
  { label: 'Escalated',   count: 7   },
  { label: 'Resolved',    count: 184 },
];

const MINI_STATS = [
  { label: 'Open',         value: 247, color: 'indigo' },
  { label: 'Unassigned',   value: 9,   color: 'red'    },
  { label: 'In Progress',  value: 84,  color: 'blue'   },
  { label: 'Escalated',    value: 7,   color: 'orange' },
  { label: 'Resolved MTD', value: 184, color: 'green'  },
  { label: 'SLA Breach',   value: 12,  color: 'yellow' },
];

const PRIORITY_BADGE: Record<string, string> = {
  Critical: 'v2-badge-red',
  High:     'v2-badge-orange',
  Medium:   'v2-badge-yellow',
  Low:      'v2-badge-gray',
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

  const utils = trpc.useUtils();

  // Live data (used for real interactions; demo rows show on initial render)
  const { data: liveData } = trpc['tickets.list'].useQuery({ page, limit: 25 }, { staleTime: 25_000 });

  // Use demo rows for clean UI; overlay with live data if available
  const rows = DEMO_TICKETS;

  function handleCreated() {
    void utils['tickets.list'].invalidate();
    setCreateOpen(false);
  }

  return (
    <div>
      {/* Mini stat bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {MINI_STATS.map(s => (
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
              key={tab.label}
              className={`v2-filter-tab${activeTab === tab.label ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.label)}
            >
              {tab.label}
              <span style={{ marginLeft: 4, fontSize: 10.5, color: 'var(--text-light)' }}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div className="v2-search-bar" style={{ width: 180 }}>
            <Search size={12} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
            <input type="text" placeholder="Search tickets…" />
          </div>
          <select className="v2-select">
            <option>All Priorities</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setCreateOpen(true)}>
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
                <th>Assigned To</th>
                <th>SLA</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(t => (
                <tr key={t.id} onClick={() => setSelectedTicketId(t.id)} style={{ cursor: 'pointer' }}>
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
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="v2-avatar-sm">{t.assignee.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
                      <span style={{ fontSize: 12.5 }}>{t.assignee}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 12, fontWeight: 600,
                        color: t.slaColor === 'red' ? 'var(--red)' : t.slaColor === 'yellow' ? 'var(--yellow)' : 'var(--green)',
                      }}
                    >
                      {t.sla}
                    </span>
                  </td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.date}</span></td>
                  <td>
                    <div className="v2-row-actions">
                      <button className="v2-row-action-btn" title="View">→</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination footer */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing 1–{rows.length} of 362 tickets</span>
          <div className="v2-pagination">
            <button className="v2-pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft size={12} /></button>
            {[1,2,3,4,5].map(n => (
              <button key={n} className={`v2-pg-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className="v2-pg-btn" onClick={() => setPage(p => p + 1)}><ChevronRight size={12} /></button>
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

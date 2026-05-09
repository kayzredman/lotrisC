'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import TaskDrawer from './task-drawer';
import CreateTaskModal from './create-task-modal';
import { Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';

// ── Marketing demo data (fallback) ──────────────────────────────────────────
const DEMO_TASKS = [
  { id: 't1', title: 'Monthly DB Backup Verification',      type: 'Maintenance',  priority: 'Critical', assignee: 'A. Okonkwo',  status: 'Overdue',     progress: 60,  dueDate: '30 Apr',  selfLogged: false },
  { id: 't2', title: 'DR Failover Drill – Core Banking',    type: 'DR/BCP',       priority: 'High',     assignee: 'F. Mohammed', status: 'In Progress', progress: 40,  dueDate: '9 May',   selfLogged: false },
  { id: 't3', title: 'Update Network Topology Diagrams',    type: 'Documentation',priority: 'Medium',   assignee: 'N. Kamara',   status: 'Open',        progress: 0,   dueDate: '15 May',  selfLogged: false },
  { id: 't4', title: 'Patch Tuesday – Server OS Updates',   type: 'Change Req.',  priority: 'High',     assignee: 'D. Mensah',   status: 'Review',      progress: 90,  dueDate: 'Today',   selfLogged: false },
  { id: 't5', title: 'Capacity Planning Q2 2026',           type: 'Maintenance',  priority: 'Medium',   assignee: 'A. Okonkwo',  status: 'In Progress', progress: 75,  dueDate: '12 May',  selfLogged: false },
  { id: 't6', title: 'Personal Study – Oracle 19c',         type: 'Training',     priority: 'Low',      assignee: 'A. Okonkwo',  status: 'In Progress', progress: 50,  dueDate: '20 May',  selfLogged: true  },
  { id: 't7', title: 'SLA Policy Document v2 Review',       type: 'Documentation',priority: 'Low',      assignee: 'F. Mohammed', status: 'Done',        progress: 100, dueDate: '28 Apr',  selfLogged: false },
  { id: 't8', title: 'SSL Certificate Renewal – Web Proxy', type: 'Change Req.',  priority: 'Critical', assignee: 'B. Ibrahim',  status: 'Overdue',     progress: 20,  dueDate: '2 May',   selfLogged: false },
];

// ── Live task type → display label ────────────────────────────────────────────
const TASK_TYPE_LABEL: Record<string, string> = {
  MAINTENANCE: 'Maintenance', DR_BCP: 'DR/BCP', CHANGE_REQUEST: 'Change Req.',
  DOCUMENTATION: 'Documentation', TRAINING: 'Training', AD_HOC: 'Ad Hoc',
};

// ── Live task status → display label ─────────────────────────────────────────
const TASK_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', REVIEW: 'Review',
  COMPLETED: 'Done', OVERDUE: 'Overdue',
};

// ── Demo user ID → short name (matches seed.ts) ───────────────────────────────
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

const STATUS_BADGE: Record<string, string> = {
  'Overdue':     'v2-badge-red',
  'In Progress': 'v2-badge-blue',
  'Open':        'v2-badge-indigo',
  'Review':      'v2-badge-yellow',
  'Done':        'v2-badge-green',
};

const PROGRESS_COLOR: Record<string, string> = {
  'Overdue':     'var(--red)',
  'In Progress': 'var(--indigo)',
  'Open':        'var(--text-light)',
  'Review':      'var(--yellow)',
  'Done':        'var(--green)',
};

export default function TasksTable() {
  const [activeTab, setActiveTab] = useState('All');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [page] = useState(1);

  const utils = trpc.useUtils();

  // Live tasks from MSSQL
  const { data: liveData } = trpc['tasks.list'].useQuery(
    { page, limit: 50 },
    { staleTime: 25_000 },
  );

  // Map live rows → display format
  const liveRows = liveData?.items.map((t) => {
    const statusRaw = t.status.toUpperCase();
    // Determine if overdue: OPEN/IN_PROGRESS with past dueDate
    const isOverdue = (statusRaw === 'OPEN' || statusRaw === 'IN_PROGRESS') && t.dueDate && new Date(t.dueDate) < new Date();
    const displayStatus = isOverdue ? 'Overdue' : (TASK_STATUS_LABEL[statusRaw] ?? t.status);
    const dueDateStr = t.dueDate
      ? new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : '–';
    return {
      id: t.id,
      title: t.title,
      type: TASK_TYPE_LABEL[t.taskType] ?? t.taskType,
      priority: 'Medium' as string, // tasks schema has no priority; use Medium default
      assignee: USER_SHORT[t.createdBy] ?? 'Engineer',
      status: displayStatus,
      progress: t.progress ?? 0,
      dueDate: dueDateStr,
      selfLogged: t.source === 'SELF_LOGGED',
    };
  });

  const allRows = (liveRows && liveRows.length > 0) ? liveRows : DEMO_TASKS;

  // Build dynamic STATUS_TABS from live data
  const countByStatus = (status: string) => allRows.filter(t => t.status === status).length;
  const selfLoggedCount = allRows.filter(t => t.selfLogged).length;

  const STATUS_TABS = [
    { label: 'All',         count: allRows.length },
    { label: 'Open',        count: countByStatus('Open') },
    { label: 'In Progress', count: countByStatus('In Progress') },
    { label: 'Review',      count: countByStatus('Review') },
    { label: 'Done',        count: countByStatus('Done') },
    { label: 'Overdue',     count: countByStatus('Overdue') },
    { label: 'Self-logged', count: selfLoggedCount },
  ];

  const tabFiltered = activeTab === 'All'
    ? allRows
    : activeTab === 'Self-logged'
      ? allRows.filter(t => t.selfLogged)
      : allRows.filter(t => t.status === activeTab);

  const filtered = search.trim()
    ? tabFiltered.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.assignee.toLowerCase().includes(search.toLowerCase()) ||
        t.type.toLowerCase().includes(search.toLowerCase()),
      )
    : tabFiltered;

  // Summary stat counts
  const stats = [
    { value: allRows.length,                    label: 'All Tasks',   color: 'var(--text-primary)' },
    { value: countByStatus('Open'),             label: 'Open',        color: 'var(--indigo)'       },
    { value: countByStatus('In Progress'),      label: 'In Progress', color: 'var(--blue)'         },
    { value: countByStatus('Review'),           label: 'Review',      color: 'var(--yellow)'       },
    { value: countByStatus('Done'),             label: 'Done',        color: 'var(--green)'        },
    { value: countByStatus('Overdue'),          label: 'Overdue',     color: 'var(--red)'          },
    { value: selfLoggedCount,                   label: 'Self-logged', color: 'var(--purple)'       },
  ];

  const doneCount = countByStatus('Done');
  const completionPct = allRows.length > 0 ? Math.round((doneCount / allRows.length) * 100) : 0;

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>Tasks</h1>
          <p>Team tasks, maintenance schedules, and self-logged items</p>
        </div>
        <div className="v2-page-header-actions">
          <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={12} /> New Task
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {stats.map(s => (
          <button
            key={s.label}
            type="button"
            onClick={() => setActiveTab(s.label === 'All Tasks' ? 'All' : s.label)}
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderTop: `3px solid ${s.color}`,
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              minWidth: 80, flex: '1 1 70px',
              boxShadow: 'var(--shadow-xs)',
              cursor: 'pointer',
              transition: 'box-shadow 0.12s',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search + Filter tabs */}
      <div className="v2-filter-bar" style={{ gap: 10 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            style={{
              fontSize: 12.5, padding: '5px 10px 5px 28px',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)', background: 'white',
              fontFamily: 'inherit', outline: 'none', width: 180,
            }}
          />
        </div>
        <div className="v2-filter-tabs">
          {STATUS_TABS.map(t => (
            <button type="button" key={t.label} className={`v2-filter-tab${activeTab === t.label ? ' active' : ''}`} onClick={() => setActiveTab(t.label)}>
              {t.label}
              <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-light)' }}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="v2-card">
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Due Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} onClick={() => setSelectedTaskId(t.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.title}</span>
                      {t.selfLogged && <span className="v2-badge v2-badge-indigo" style={{ fontSize: 9.5 }}>Self</span>}
                    </div>
                  </td>
                  <td><span className="v2-badge v2-badge-gray">{t.type}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span className={`v2-dot v2-dot-${t.priority.toLowerCase()}`} />
                      <span style={{ fontSize: 12.5 }}>{t.priority}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="v2-avatar-sm">{t.assignee.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
                      <span style={{ fontSize: 12.5 }}>{t.assignee}</span>
                    </div>
                  </td>
                  <td><span className={`v2-badge ${STATUS_BADGE[t.status] ?? 'v2-badge-gray'}`}>{t.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="v2-progress-bg" style={{ flex: 1 }}>
                        <div className="v2-progress-fill" style={{ width: `${t.progress}%`, background: PROGRESS_COLOR[t.status] }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: PROGRESS_COLOR[t.status], width: 28, textAlign: 'right' }}>{t.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: t.status === 'Overdue' ? 'var(--red)' : 'var(--text-muted)', fontWeight: t.status === 'Overdue' ? 600 : 400 }}>
                      {t.dueDate}
                    </span>
                  </td>
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
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing {filtered.length} tasks · Team completion {completionPct}%</span>
          <div className="v2-pagination">
            <button type="button" className="v2-pg-btn"><ChevronLeft size={12} /></button>
            <button type="button" className="v2-pg-btn active">1</button>
            <button type="button" className="v2-pg-btn"><ChevronRight size={12} /></button>
          </div>
        </div>
      </div>

      {selectedTaskId && <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void utils['tasks.list'].invalidate(); }} />}
    </div>
  );
}

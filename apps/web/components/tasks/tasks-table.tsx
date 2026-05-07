'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import TaskDrawer from './task-drawer';
import CreateTaskModal from './create-task-modal';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Marketing demo data (match 09-tasks-v2.html exactly) ────────────────────
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

const STATUS_TABS = [
  { label: 'All',         count: 11 },
  { label: 'Open',        count: 3  },
  { label: 'In Progress', count: 5  },
  { label: 'Review',      count: 1  },
  { label: 'Done',        count: 2  },
  { label: 'Overdue',     count: 2  },
  { label: 'Self-logged', count: 3  },
];

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
  const [page, setPage] = useState(1);

  const utils = trpc.useUtils();

  const filtered = activeTab === 'All'
    ? DEMO_TASKS
    : activeTab === 'Self-logged'
      ? DEMO_TASKS.filter(t => t.selfLogged)
      : DEMO_TASKS.filter(t => t.status === activeTab);

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>Tasks</h1>
          <p>Team tasks, maintenance schedules, and self-logged items</p>
        </div>
        <div className="v2-page-header-actions">
          <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={12} /> New Task
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { value: 11, label: 'All Tasks',       color: 'var(--text-primary)' },
          { value: 3,  label: 'Open',             color: 'var(--indigo)'       },
          { value: 5,  label: 'In Progress',      color: 'var(--blue)'         },
          { value: 1,  label: 'Review',            color: 'var(--yellow)'       },
          { value: 2,  label: 'Done',              color: 'var(--green)'        },
          { value: 2,  label: 'Overdue',           color: 'var(--red)'          },
          { value: 3,  label: 'Self-logged',       color: 'var(--purple)'       },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', minWidth: 80, flex: '1 1 70px', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="v2-filter-bar">
        <div className="v2-filter-tabs">
          {STATUS_TABS.map(t => (
            <button key={t.label} className={`v2-filter-tab${activeTab === t.label ? ' active' : ''}`} onClick={() => setActiveTab(t.label)}>
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
                      <button className="v2-row-action-btn" title="View">→</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing {filtered.length} tasks · Team completion 63%</span>
          <div className="v2-pagination">
            <button className="v2-pg-btn"><ChevronLeft size={12} /></button>
            <button className="v2-pg-btn active">1</button>
            <button className="v2-pg-btn"><ChevronRight size={12} /></button>
          </div>
        </div>
      </div>

      {selectedTaskId && <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void utils['tasks.list'].invalidate(); }} />
    </div>
  );
}

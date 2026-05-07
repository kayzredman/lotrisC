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


type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type TaskSource = 'LEAD_ASSIGNED' | 'SELF_LOGGED' | undefined;

const STATUS_VARIANTS: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  OPEN: 'outline',
  IN_PROGRESS: 'secondary',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
};

const TYPE_LABELS: Record<string, string> = {
  MAINTENANCE: 'Maintenance',
  DR_BCP: 'DR/BCP',
  CHANGE_REQUEST: 'Change Req.',
  DOCUMENTATION: 'Docs',
  TRAINING: 'Training',
  AD_HOC: 'Ad Hoc',
};

const PAGE_SIZE = 25;

export default function TasksTable() {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | undefined>(undefined);
  const [filterSource, setFilterSource] = useState<TaskSource>(undefined);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const utils = trpc.useUtils();

  const { data, isLoading, isError } = trpc['tasks.list'].useQuery(
    { page, limit: PAGE_SIZE, status: filterStatus, source: filterSource },
    { refetchInterval: 60_000 },
  );

  const STATUS_TABS: { label: string; value: TaskStatus | undefined }[] = [
    { label: 'All', value: undefined },
    { label: 'Open', value: 'OPEN' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => { setFilterStatus(tab.value); setPage(1); }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterStatus === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Source filter */}
          <select
            value={filterSource ?? ''}
            onChange={(e) => { setFilterSource((e.target.value as TaskSource) || undefined); setPage(1); }}
            className="text-sm border rounded-md px-2 py-1.5 bg-background text-foreground"
          >
            <option value="">All sources</option>
            <option value="LEAD_ASSIGNED">Lead assigned</option>
            <option value="SELF_LOGGED">Self logged</option>
          </select>

          <Button size="sm" onClick={() => setShowCreate(true)}>
            + New Task
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading tasks…</div>
        ) : isError ? (
          <div className="flex items-center justify-center h-40 text-destructive text-sm">Failed to load tasks.</div>
        ) : !data?.items?.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-1">
            <span>No tasks found.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Task</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Progress</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Source</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((task: {
                id: string;
                title: string;
                taskType: string;
                status: TaskStatus;
                source: string;
                progress: number;
                dueDate: string | null;
                checklistItems: unknown[];
              }) => (
                <tr
                  key={task.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{task.title}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {TYPE_LABELS[task.taskType] ?? task.taskType}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[task.status]}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            task.progress === 100 ? 'bg-green-500' : task.progress > 50 ? 'bg-blue-500' : 'bg-orange-400'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">{task.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={task.source === 'LEAD_ASSIGNED' ? 'secondary' : 'outline'}>
                      {task.source === 'LEAD_ASSIGNED' ? 'Assigned' : 'Self'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * PAGE_SIZE >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          onClose={() => {
            setSelectedTaskId(null);
            void utils['tasks.list'].invalidate();
          }}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void utils['tasks.list'].invalidate();
          }}
        />
      )}
    </div>
  );
}

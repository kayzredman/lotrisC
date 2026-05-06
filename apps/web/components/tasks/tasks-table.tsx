'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Badge } from '@lotris/ui';
import { Button } from '@lotris/ui';
import TaskDrawer from './task-drawer';
import CreateTaskModal from './create-task-modal';

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

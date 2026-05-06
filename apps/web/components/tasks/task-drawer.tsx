'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Badge } from '@lotris/ui';
import { Button } from '@lotris/ui';

interface TaskDrawerProps {
  taskId: string;
  onClose: () => void;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  OPEN: 'outline',
  IN_PROGRESS: 'secondary',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
};

const TYPE_LABELS: Record<string, string> = {
  MAINTENANCE: 'Maintenance',
  DR_BCP: 'DR/BCP',
  CHANGE_REQUEST: 'Change Request',
  DOCUMENTATION: 'Documentation',
  TRAINING: 'Training',
  AD_HOC: 'Ad Hoc',
};

export default function TaskDrawer({ taskId, onClose }: TaskDrawerProps) {
  const utils = trpc.useUtils();
  const [newItemLabel, setNewItemLabel] = useState('');

  const { data: task, isLoading } = trpc['tasks.get'].useQuery({ id: taskId });

  const toggleItem = trpc['tasks.toggleChecklistItem'].useMutation({
    onSuccess: () => utils['tasks.get'].invalidate({ id: taskId }),
  });

  const addItem = trpc['tasks.addChecklistItem'].useMutation({
    onSuccess: () => {
      setNewItemLabel('');
      void utils['tasks.get'].invalidate({ id: taskId });
    },
  });

  const updateStatus = trpc['tasks.update'].useMutation({
    onSuccess: () => utils['tasks.get'].invalidate({ id: taskId }),
  });

  const markComplete = trpc['tasks.complete'].useMutation({
    onSuccess: () => utils['tasks.get'].invalidate({ id: taskId }),
  });

  if (isLoading || !task) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="ml-auto w-full max-w-xl h-full bg-background border-l shadow-xl flex items-center justify-center text-muted-foreground text-sm">
          Loading task…
        </div>
        <div className="flex-1 bg-black/20" onClick={onClose} />
      </div>
    );
  }

  const checklistItems = task.checklistItems as Array<{
    id: string;
    label: string;
    isCompleted: boolean | number;
    sortOrder: number;
  }>;

  const assignments = task.assignments as Array<{
    id: string;
    assigneeId: string;
    isCompleted: boolean | number;
  }>;

  const canMarkComplete = task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/20" onClick={onClose} />

      {/* Drawer panel */}
      <div className="ml-auto w-full max-w-xl h-full bg-background border-l shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={STATUS_VARIANTS[task.status as string] ?? 'outline'}>
                {(task.status as string).replace('_', ' ')}
              </Badge>
              <Badge variant={task.source === 'LEAD_ASSIGNED' ? 'secondary' : 'outline'}>
                {task.source === 'LEAD_ASSIGNED' ? 'Assigned' : 'Self-logged'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {TYPE_LABELS[task.taskType as string] ?? task.taskType as string}
              </span>
            </div>
            <h2 className="text-lg font-semibold leading-tight">{task.title as string}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{task.description as string}</p>
            </div>
          )}

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</p>
              <span className="text-sm font-semibold">{task.progress as number}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (task.progress as number) === 100 ? 'bg-green-500' : (task.progress as number) > 50 ? 'bg-blue-500' : 'bg-orange-400'
                }`}
                style={{ width: `${task.progress as number}%` }}
              />
            </div>
          </div>

          {/* Due date */}
          {task.dueDate && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Due</p>
              <p className="text-sm">{new Date(task.dueDate as string).toLocaleDateString()}</p>
            </div>
          )}

          {/* Checklist */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Checklist {checklistItems.length > 0 && `(${checklistItems.filter((i) => i.isCompleted).length}/${checklistItems.length})`}
            </p>
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!item.isCompleted}
                    onChange={() => toggleItem.mutate({ taskId, itemId: item.id })}
                    className="mt-0.5 h-4 w-4 rounded border accent-primary"
                    disabled={toggleItem.isPending}
                  />
                  <span className={`text-sm ${item.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {item.label}
                  </span>
                </label>
              ))}

              {/* Add new item */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newItemLabel.trim()) {
                      addItem.mutate({ taskId, label: newItemLabel.trim() });
                    }
                  }}
                  placeholder="Add checklist item…"
                  className="flex-1 text-sm border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!newItemLabel.trim() || addItem.isPending}
                  onClick={() => addItem.mutate({ taskId, label: newItemLabel.trim() })}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Assignees */}
          {assignments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Assignees ({assignments.length})
              </p>
              <div className="space-y-1.5">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-mono text-xs">{(a.assigneeId as string).slice(0, 12)}…</span>
                    <Badge variant={a.isCompleted ? 'default' : 'outline'}>
                      {a.isCompleted ? 'Done' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {canMarkComplete && (
          <div className="p-4 border-t flex gap-2">
            {task.status === 'OPEN' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateStatus.mutate({ id: taskId, status: 'IN_PROGRESS' })}
                disabled={updateStatus.isPending}
              >
                Start
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => markComplete.mutate({ taskId })}
              disabled={markComplete.isPending}
            >
              {markComplete.isPending ? 'Completing…' : 'Mark Complete'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => updateStatus.mutate({ id: taskId, status: 'CANCELLED' })}
              disabled={updateStatus.isPending}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

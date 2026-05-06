'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@lotris/ui';

interface CreateTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const TASK_TYPES = [
  { value: 'AD_HOC', label: 'Ad Hoc' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'DR_BCP', label: 'DR / BCP' },
  { value: 'CHANGE_REQUEST', label: 'Change Request' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'TRAINING', label: 'Training' },
] as const;

type TaskTypeValue = (typeof TASK_TYPES)[number]['value'];

export default function CreateTaskModal({ onClose, onCreated }: CreateTaskModalProps) {
  const [mode, setMode] = useState<'self' | 'assign'>('self');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskTypeValue>('AD_HOC');
  const [dueDate, setDueDate] = useState('');
  // For lead-assign mode
  const [assigneeInput, setAssigneeInput] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  const createMutation = trpc['tasks.create'].useMutation({
    onSuccess: onCreated,
  });

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const addAssignee = () => {
    const id = assigneeInput.trim();
    if (!uuidRegex.test(id)) return;
    if (!assigneeIds.includes(id)) {
      setAssigneeIds((prev) => [...prev, id]);
    }
    setAssigneeInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      taskType,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      assigneeIds: mode === 'assign' && assigneeIds.length > 0 ? assigneeIds : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-lg border">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">New Task</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setMode('self')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${mode === 'self' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
              >
                Self-log
              </button>
              <button
                type="button"
                onClick={() => setMode('assign')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${mode === 'assign' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
              >
                Assign to engineers
              </button>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="task-title">Title</label>
              <input
                id="task-title"
                type="text"
                required
                maxLength={500}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full text-sm border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                rows={3}
                maxLength={4000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details…"
                className="w-full text-sm border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            {/* Type + Due date row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="task-type">Type</label>
                <select
                  id="task-type"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as TaskTypeValue)}
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background text-foreground"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="task-due">Due date</label>
                <input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background text-foreground"
                />
              </div>
            </div>

            {/* Assignees — only in assign mode */}
            {mode === 'assign' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Assignees</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assigneeInput}
                    onChange={(e) => setAssigneeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAssignee(); } }}
                    placeholder="Paste engineer UUID…"
                    className="flex-1 text-sm border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground font-mono"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addAssignee}>Add</Button>
                </div>
                {assigneeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {assigneeIds.map((id) => (
                      <span key={id} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs font-mono">
                        {id.slice(0, 8)}…
                        <button
                          type="button"
                          onClick={() => setAssigneeIds((prev) => prev.filter((x) => x !== id))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {mode === 'assign' && assigneeIds.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add at least one engineer to assign this task.</p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-5 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                !title.trim() ||
                createMutation.isPending ||
                (mode === 'assign' && assigneeIds.length === 0)
              }
            >
              {createMutation.isPending ? 'Creating…' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

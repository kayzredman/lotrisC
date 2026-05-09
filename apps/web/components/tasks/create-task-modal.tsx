'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { UserCheck, User, X } from 'lucide-react';

interface CreateTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const TASK_TYPES = [
  { value: 'AD_HOC',          label: 'Ad Hoc' },
  { value: 'MAINTENANCE',     label: 'Maintenance' },
  { value: 'DR_BCP',          label: 'DR / BCP' },
  { value: 'CHANGE_REQUEST',  label: 'Change Request' },
  { value: 'DOCUMENTATION',   label: 'Documentation' },
  { value: 'TRAINING',        label: 'Training' },
] as const;

type TaskTypeValue = (typeof TASK_TYPES)[number]['value'];

// ── Inline styles (matches v2 design system from mockup 09-tasks-v2.html) ───

const S = {
  sectionTitle: {
    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: 0.5, color: 'var(--text-light)', margin: '18px 0 8px',
  },
  field: { marginBottom: 14 },
  label: {
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    display: 'block', marginBottom: 5,
    textTransform: 'uppercase' as const, letterSpacing: 0.4,
  },
  input: {
    width: '100%', boxSizing: 'border-box' as const,
    fontSize: 13, padding: '8px 10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', background: 'white',
    fontFamily: 'inherit', outline: 'none',
  },
  textarea: {
    width: '100%', boxSizing: 'border-box' as const,
    fontSize: 13, padding: '8px 10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', background: 'white',
    fontFamily: 'inherit', outline: 'none',
    resize: 'vertical' as const, minHeight: 72, lineHeight: 1.55,
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
};

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: '#e0e7ff', color: '#4338ca' },
  { bg: '#fef3c7', color: '#92400e' },
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#f3e8ff', color: '#7c3aed' },
  { bg: '#fee2e2', color: '#dc2626' },
];

export default function CreateTaskModal({ onClose, onCreated }: CreateTaskModalProps) {
  const [mode, setMode] = useState<'self' | 'assign'>('self');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskTypeValue>('AD_HOC');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: users = [] } = trpc['users.list'].useQuery();
  const meQuery = trpc['users.me'].useQuery();
  const me = meQuery.data;

  const createMutation = trpc['tasks.create'].useMutation({
    onSuccess: onCreated,
    onError: (err: { message?: string }) => {
      setSubmitError(err?.message ?? 'Failed to create task');
    },
  });

  const toggleAssignee = (id: string) => {
    setAssigneeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitError(null);

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      taskType,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      assigneeIds: mode === 'assign' && assigneeIds.length > 0 ? assigneeIds : undefined,
    });
  };

  return (
    <>
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close drawer"
        className="v2-drawer-overlay open"
        style={{ border: 'none', padding: 0, cursor: 'default' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="v2-drawer open">
        {/* Header */}
        <div className="v2-drawer-header">
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>New Task</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
              {mode === 'self' ? 'Self-logged task' : 'Assign to engineer(s)'}
            </div>
          </div>
          <button
            type="button"
            className="v2-btn v2-btn-ghost v2-btn-sm"
            onClick={onClose}
            style={{ padding: '4px 6px' }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="v2-drawer-body">

            {/* ── Source toggle ── */}
            <div style={{ ...S.sectionTitle, marginTop: 0 }}>Task Source</div>
            <div style={{
              display: 'flex', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 16,
            }}>
              {[
                { key: 'assign', icon: <UserCheck size={12} />, label: 'Lead assigns to engineer' },
                { key: 'self',   icon: <User size={12} />,      label: 'Engineer logs own task' },
              ].map((btn, i) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => { setMode(btn.key as 'self' | 'assign'); setAssigneeIds([]); }}
                  style={{
                    flex: 1, padding: '8px 12px',
                    fontSize: 12, fontWeight: 600,
                    border: 'none',
                    borderRight: i === 0 ? '1px solid var(--border)' : 'none',
                    background: mode === btn.key ? 'var(--indigo)' : 'var(--bg-subtle)',
                    color: mode === btn.key ? 'white' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.12s',
                  }}
                >
                  {btn.icon} {btn.label}
                </button>
              ))}
            </div>

            {/* ── Self-assign notice ── */}
            {mode === 'self' && me && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', marginBottom: 14,
                background: 'var(--green-bg)', border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12, fontWeight: 700, color: '#166534',
              }}>
                <User size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <div>
                  <div>Assigned to: {me.fullName ?? 'You'}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, marginTop: 1 }}>
                    Self-logged tasks count towards your KPI metrics.
                  </div>
                </div>
              </div>
            )}

            {/* ── Task Details ── */}
            <div style={S.sectionTitle}>Task Details</div>

            <div style={S.field}>
              <label style={S.label} htmlFor="task-title">Task Title</label>
              <input
                id="task-title"
                type="text"
                required
                maxLength={500}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monthly DB Backup Verification"
                style={S.input}
              />
            </div>

            <div style={S.field}>
              <label style={S.label} htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                maxLength={4000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What needs to be done? Include scope, expected output, and any dependencies."
                style={S.textarea}
              />
            </div>

            <div style={{ ...S.row, ...S.field }}>
              <div>
                <label style={S.label} htmlFor="task-type">Task Type</label>
                <select
                  id="task-type"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as TaskTypeValue)}
                  style={S.input}
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label} htmlFor="task-due">Due Date</label>
                <input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={S.input}
                />
              </div>
            </div>

            {/* ── Assignee section ── */}
            {mode === 'assign' && (
              <>
                <div style={S.sectionTitle}>Assignee</div>
                {users.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {users.map((u, idx) => {
                        const selected = assigneeIds.includes(u.id);
                        const col = AVATAR_COLORS[idx % AVATAR_COLORS.length] ?? { bg: '#e0e7ff', color: '#4338ca' };
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => toggleAssignee(u.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7,
                              padding: '5px 10px 5px 6px',
                              border: `1px solid ${selected ? 'var(--indigo)' : 'var(--border)'}`,
                              borderRadius: 99,
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: selected ? 'var(--indigo-dim)' : 'white',
                              color: selected ? 'var(--indigo)' : 'var(--text-primary)',
                              transition: 'all 0.12s',
                            }}
                          >
                            <div
                              className="v2-avatar-sm"
                              style={{ background: col.bg, color: col.color, flexShrink: 0 }}
                            >
                              {initials(u.fullName ?? u.email ?? '?')}
                            </div>
                            {(u.fullName ?? u.email ?? '').split(' ').map(n => n[0]).join('. ').slice(0, 5) || u.email?.split('@')[0]}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 6 }}>
                      Select one or more engineers. Tasks with multiple assignees track completion per person.
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                    Loading engineers…
                  </div>
                )}
                {assigneeIds.length === 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 6 }}>
                    Select at least one engineer to assign this task.
                  </div>
                )}
              </>
            )}

            {/* Submit error */}
            {submitError && (
              <div style={{
                marginTop: 12, padding: '8px 11px',
                background: 'var(--red-bg)', border: '1px solid var(--red)',
                borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: 'var(--red)',
              }}>
                {submitError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="v2-drawer-footer">
            <button type="button" className="v2-btn v2-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="v2-btn v2-btn-primary"
              disabled={
                !title.trim() ||
                createMutation.isPending ||
                (mode === 'assign' && assigneeIds.length === 0)
              }
            >
              {createMutation.isPending ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

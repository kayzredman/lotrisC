'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { X, CheckCircle2, Circle, Plus, CalendarDays, Tag, User2 } from 'lucide-react';

interface TaskDrawerProps {
  taskId: string;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  MAINTENANCE: 'Maintenance', DR_BCP: 'DR/BCP', CHANGE_REQUEST: 'Change Request',
  DOCUMENTATION: 'Documentation', TRAINING: 'Training', AD_HOC: 'Ad Hoc',
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'v2-badge-indigo', IN_PROGRESS: 'v2-badge-blue',
  REVIEW: 'v2-badge-yellow', COMPLETED: 'v2-badge-green',
  CANCELLED: 'v2-badge-gray', OVERDUE: 'v2-badge-red',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', REVIEW: 'Review',
  COMPLETED: 'Done', CANCELLED: 'Cancelled',
};

const PROGRESS_COLOR: Record<string, string> = {
  OPEN: 'var(--text-light)', IN_PROGRESS: 'var(--indigo)',
  REVIEW: 'var(--yellow)', COMPLETED: 'var(--green)', OVERDUE: 'var(--red)',
};

const AVATAR_COLORS = [
  { bg: '#e0e7ff', color: '#4338ca' }, { bg: '#fef3c7', color: '#92400e' },
  { bg: '#dbeafe', color: '#1d4ed8' }, { bg: '#dcfce7', color: '#15803d' },
  { bg: '#f3e8ff', color: '#7c3aed' }, { bg: '#fee2e2', color: '#dc2626' },
];

function getAvatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length] ?? { bg: '#e0e7ff', color: '#4338ca' };
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const S = {
  sectionLabel: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: 0.6, color: 'var(--text-light)', marginBottom: 8,
    display: 'flex', alignItems: 'center', gap: 5,
  },
  section: { marginBottom: 22 },
  divider: { borderTop: '1px solid var(--border)', margin: '0 0 22px' },
  metaGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22,
  },
  metaCard: {
    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '10px 12px',
  },
  metaLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 },
  metaValue: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  checklistRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 0', borderBottom: '1px solid var(--border)',
  },
  assigneeRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 0', borderBottom: '1px solid var(--border)',
  },
};

export default function TaskDrawer({ taskId, onClose }: TaskDrawerProps) {
  const utils = trpc.useUtils();
  const [newItemLabel, setNewItemLabel] = useState('');

  const { data: task, isLoading } = trpc['tasks.get'].useQuery({ id: taskId });
  const { data: allUsers = [] } = trpc['users.list'].useQuery();

  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

  const toggleItem = trpc['tasks.toggleChecklistItem'].useMutation({
    onSuccess: () => void utils['tasks.get'].invalidate({ id: taskId }),
  });
  const addItem = trpc['tasks.addChecklistItem'].useMutation({
    onSuccess: () => { setNewItemLabel(''); void utils['tasks.get'].invalidate({ id: taskId }); },
  });
  const updateStatus = trpc['tasks.update'].useMutation({
    onSuccess: () => void utils['tasks.get'].invalidate({ id: taskId }),
  });
  const markComplete = trpc['tasks.complete'].useMutation({
    onSuccess: () => void utils['tasks.get'].invalidate({ id: taskId }),
  });

  if (isLoading || !task) {
    return (
      <>
        <button type="button" aria-label="Close" className="v2-drawer-overlay open" style={{ border: 'none', padding: 0, cursor: 'default' }} onClick={onClose} />
        <div className="v2-drawer open">
          <div className="v2-drawer-header">
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading task…</span>
          </div>
        </div>
      </>
    );
  }

  const checklistItems = task.checklistItems as Array<{ id: string; label: string; isCompleted: boolean | number; sortOrder: number }>;
  const assignments = task.assignments as Array<{ id: string; assigneeId: string; isCompleted: boolean | number }>;
  const status = task.status as string;
  const progress = task.progress as number;
  const progressColor = PROGRESS_COLOR[status] ?? 'var(--text-light)';
  const checkedCount = checklistItems.filter(i => i.isCompleted).length;
  const canMarkComplete = status !== 'COMPLETED' && status !== 'CANCELLED';

  const dueStr = task.dueDate
    ? new Date(task.dueDate as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const isOverdue = dueStr && status !== 'COMPLETED' && status !== 'CANCELLED'
    && new Date(task.dueDate as string) < new Date();

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
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              <span className={`v2-badge ${STATUS_BADGE[status] ?? 'v2-badge-gray'}`}>
                {STATUS_LABEL[status] ?? status}
              </span>
              <span className={`v2-badge ${task.source === 'LEAD_ASSIGNED' ? 'v2-badge-blue' : 'v2-badge-indigo'}`}>
                {task.source === 'LEAD_ASSIGNED' ? 'Assigned' : 'Self-logged'}
              </span>
              <span className="v2-badge v2-badge-gray">
                <Tag size={9} />
                {TYPE_LABELS[task.taskType as string] ?? task.taskType as string}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {task.title as string}
            </div>
          </div>
          <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={onClose} style={{ padding: '4px 6px', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="v2-drawer-body">

          {/* Description */}
          {task.description && (
            <div style={S.section}>
              <div style={S.sectionLabel}>Description</div>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                {task.description as string}
              </p>
            </div>
          )}

          {/* Meta grid */}
          <div style={S.metaGrid}>
            <div style={S.metaCard}>
              <div style={S.metaLabel}>Progress</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: progressColor, borderRadius: 99, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: progressColor, minWidth: 28, textAlign: 'right' }}>{progress}%</span>
              </div>
            </div>
            <div style={S.metaCard}>
              <div style={S.metaLabel}><CalendarDays size={10} style={{ display: 'inline', marginRight: 3 }} />Due Date</div>
              <div style={{ ...S.metaValue, color: isOverdue ? 'var(--red)' : 'var(--text-primary)' }}>
                {dueStr ?? <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>Not set</span>}
                {isOverdue && <span style={{ fontSize: 10, marginLeft: 5, color: 'var(--red)', fontWeight: 600 }}>OVERDUE</span>}
              </div>
            </div>
          </div>

          <div style={S.divider} />

          {/* Checklist */}
          <div style={S.section}>
            <div style={S.sectionLabel}>
              Checklist
              {checklistItems.length > 0 && (
                <span style={{ marginLeft: 4, fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {checkedCount}/{checklistItems.length}
                </span>
              )}
              {checklistItems.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 10, color: checkedCount === checklistItems.length ? 'var(--green)' : 'var(--text-light)' }}>
                  {Math.round((checkedCount / checklistItems.length) * 100)}% done
                </span>
              )}
            </div>
            <div>
              {checklistItems.length === 0 && (
                <p style={{ fontSize: 12.5, color: 'var(--text-light)', margin: '0 0 10px', fontStyle: 'italic' }}>No checklist items yet.</p>
              )}
              {checklistItems.map((item) => (
                <div key={item.id} style={S.checklistRow}>
                  <button
                    type="button"
                    onClick={() => toggleItem.mutate({ taskId, itemId: item.id })}
                    disabled={toggleItem.isPending}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: item.isCompleted ? 'var(--green)' : 'var(--border)', flexShrink: 0, display: 'flex' }}
                    aria-label={item.isCompleted ? 'Uncheck' : 'Check'}
                  >
                    {item.isCompleted
                      ? <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
                      : <Circle size={16} />}
                  </button>
                  <span style={{ fontSize: 13, color: item.isCompleted ? 'var(--text-light)' : 'var(--text-primary)', textDecoration: item.isCompleted ? 'line-through' : 'none', flex: 1 }}>
                    {item.label}
                  </span>
                </div>
              ))}

              {/* Add item */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="text"
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newItemLabel.trim()) addItem.mutate({ taskId, label: newItemLabel.trim() }); }}
                  placeholder="Add checklist item…"
                  style={{ flex: 1, fontSize: 12.5, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', background: 'white', fontFamily: 'inherit', outline: 'none' }}
                />
                <button
                  type="button"
                  className="v2-btn v2-btn-secondary v2-btn-sm"
                  disabled={!newItemLabel.trim() || addItem.isPending}
                  onClick={() => addItem.mutate({ taskId, label: newItemLabel.trim() })}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={11} /> Add
                </button>
              </div>
            </div>
          </div>

          <div style={S.divider} />

          {/* Assignees */}
          <div style={S.section}>
            <div style={S.sectionLabel}>
              <User2 size={10} />
              Assignees
              {assignments.length > 0 && (
                <span style={{ marginLeft: 4, fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)' }}>
                  ({assignments.length})
                </span>
              )}
            </div>
            {assignments.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-light)', margin: 0, fontStyle: 'italic' }}>Self-logged — no assignees.</p>
            ) : (
              <div>
                {assignments.map((a) => {
                  const user = userMap[a.assigneeId];
                  const name = user?.fullName ?? user?.email ?? a.assigneeId.slice(0, 8);
                  const ac = getAvatarColor(a.assigneeId);
                  return (
                    <div key={a.id} style={S.assigneeRow}>
                      <div className="v2-avatar-sm" style={{ background: ac.bg, color: ac.color, borderRadius: 6 }}>
                        {initials(name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                        {user?.email && <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{user.email}</div>}
                      </div>
                      <span className={`v2-badge ${a.isCompleted ? 'v2-badge-green' : 'v2-badge-gray'}`}>
                        {a.isCompleted ? 'Done' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        {canMarkComplete && (
          <div className="v2-drawer-footer" style={{ justifyContent: 'flex-start' }}>
            {status === 'OPEN' && (
              <button
                type="button"
                className="v2-btn v2-btn-secondary v2-btn-sm"
                onClick={() => updateStatus.mutate({ id: taskId, status: 'IN_PROGRESS' })}
                disabled={updateStatus.isPending}
              >
                Start
              </button>
            )}
            {status === 'IN_PROGRESS' && (
              <button
                type="button"
                className="v2-btn v2-btn-secondary v2-btn-sm"
                onClick={() => updateStatus.mutate({ id: taskId, status: 'REVIEW' })}
                disabled={updateStatus.isPending}
              >
                Submit for Review
              </button>
            )}
            <button
              type="button"
              className="v2-btn v2-btn-primary v2-btn-sm"
              onClick={() => markComplete.mutate({ taskId })}
              disabled={markComplete.isPending}
            >
              {markComplete.isPending ? 'Completing…' : 'Mark Complete'}
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              style={{ marginLeft: 'auto', color: 'var(--red)' }}
              onClick={() => updateStatus.mutate({ id: taskId, status: 'CANCELLED' })}
              disabled={updateStatus.isPending}
            >
              Cancel Task
            </button>
          </div>
        )}

        {!canMarkComplete && (
          <div className="v2-drawer-footer" style={{ justifyContent: 'flex-start' }}>
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
              {status === 'COMPLETED' ? '✓ This task is complete.' : 'This task has been cancelled.'}
            </span>
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button>
          </div>
        )}

      </div>
    </>
  );
}

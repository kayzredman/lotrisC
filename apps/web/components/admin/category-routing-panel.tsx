'use client';

import { useState } from 'react';
import {
  useCategoryRoutingList,
  useTeamsList,
  useUpsertCategoryRouting,
  useDeleteCategoryRouting,
} from '@/lib/api/hooks/useAdmin';

const PRIORITY_LABEL: Record<number, string> = {
  1: 'Critical',
  2: 'High',
  3: 'Medium',
  4: 'Low',
};

interface RoutingRow {
  id: string;
  category: string;
  teamId: string;
  defaultPriority: number;
}

interface TeamRow {
  id: string;
  name: string;
}

export function CategoryRoutingPanel() {
  const [editCategory, setEditCategory] = useState('');
  const [editTeamId, setEditTeamId]     = useState('');
  const [editPriority, setEditPriority] = useState(3);
  const [formError, setFormError]       = useState('');
  const [isAdding, setIsAdding]         = useState(false);

  const routingQuery = useCategoryRoutingList({ staleTime: 30_000 });
  const teamsQuery = useTeamsList({ staleTime: 60_000 });

  const upsertMutation = useUpsertCategoryRouting();
  const deleteMutation = useDeleteCategoryRouting();

  function resetForm() {
    setEditCategory('');
    setEditTeamId('');
    setEditPriority(3);
    setFormError('');
  }

  function startEdit(row: RoutingRow) {
    setEditCategory(row.category);
    setEditTeamId(row.teamId);
    setEditPriority(row.defaultPriority);
    setFormError('');
    setIsAdding(true);
  }

  function handleSave() {
    setFormError('');
    if (!editCategory.trim()) {
      setFormError('Category name is required.');
      return;
    }
    if (!editTeamId) {
      setFormError('Please select a team.');
      return;
    }
    upsertMutation.mutate(
      {
        category: editCategory.trim(),
        teamId: editTeamId,
        defaultPriority: editPriority,
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          resetForm();
          void routingQuery.refetch();
        },
        onError: (err) => setFormError(err.message),
      },
    );
  }

  const rows = (routingQuery.data ?? []) as RoutingRow[];
  const teams = (teamsQuery.data ?? []) as TeamRow[];

  return (
    <div>
      {/* Description */}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.55 }}>
        Configure which team handles each ticket category when submitted via the public web form or email.
        Unmatched categories fall back to the first available team.
      </p>

      {/* Add rule button */}
      {!isAdding && (
        <button
          type="button"
          onClick={() => { resetForm(); setIsAdding(true); }}
          style={{
            marginBottom: 20,
            padding: '7px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--indigo)',
            color: '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Routing Rule
        </button>
      )}

      {/* Inline form */}
      {isAdding && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--indigo-border)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: 560,
        }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {editCategory ? 'Edit Routing Rule' : 'New Routing Rule'}
          </h3>

          {/* Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Category <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="text"
              value={editCategory}
              onChange={e => setEditCategory(e.target.value)}
              placeholder="e.g. Hardware"
              maxLength={100}
              style={inputStyle}
            />
          </div>

          {/* Team */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Assigned Team <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <select
              value={editTeamId}
              onChange={e => setEditTeamId(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Select a team —</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Default Priority
            </label>
            <select
              value={editPriority}
              onChange={e => setEditPriority(Number(e.target.value))}
              style={inputStyle}
            >
              {[1, 2, 3, 4].map(p => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {formError && (
            <p style={{ fontSize: 12.5, color: 'var(--red)', margin: 0 }}>{formError}</p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              style={{
                padding: '7px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--indigo)',
                color: '#fff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: upsertMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: upsertMutation.isPending ? 0.7 : 1,
              }}
            >
              {upsertMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setIsAdding(false); resetForm(); }}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {routingQuery.isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading routing rules…</p>
      ) : rows.length === 0 ? (
        <div style={{
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '32px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}>
          No routing rules configured yet. Add one above to get started.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Category', 'Team', 'Default Priority', 'Actions'].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const teamName = teams.find(t => t.id === row.teamId)?.name ?? row.teamId.slice(0, 8);
                return (
                  <tr
                    key={row.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-subtle)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {row.category}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                      {teamName}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`v2-badge ${priorityBadgeClass(row.defaultPriority)}`}>
                        {PRIORITY_LABEL[row.defaultPriority] ?? row.defaultPriority}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          style={actionBtnStyle('edit')}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete routing rule for "${row.category}"?`)) {
                              deleteMutation.mutate(
                                { id: row.id },
                                { onSuccess: () => void routingQuery.refetch() },
                              );
                            }
                          }}
                          style={actionBtnStyle('delete')}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-strong)',
  background: '#fff',
  fontSize: 13,
  color: 'var(--text-primary)',
  width: '100%',
  fontFamily: 'inherit',
};

function priorityBadgeClass(p: number): string {
  if (p === 1) return 'v2-badge-red';
  if (p === 2) return 'v2-badge-orange';
  if (p === 3) return 'v2-badge-blue';
  return 'v2-badge-gray';
}

function actionBtnStyle(type: 'edit' | 'delete'): React.CSSProperties {
  return {
    padding: '4px 12px',
    borderRadius: 'var(--radius-xs)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid',
    background: 'transparent',
    color: type === 'delete' ? 'var(--red)' : 'var(--indigo)',
    borderColor: type === 'delete' ? 'var(--red-border)' : 'var(--indigo-border)',
  };
}

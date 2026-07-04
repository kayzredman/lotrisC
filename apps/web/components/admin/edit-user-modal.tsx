'use client';

import { useState } from 'react';
import { useAdminTeams, useUpdateAdminUser } from '@/lib/api/hooks/useAdmin';

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  teamId?: string | null;
  teamName?: string | null;
  isActive: boolean | number;
}

interface Props {
  user: UserRow;
  canChangeTeam: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '7px 10px', fontSize: 13,
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-subtle)', color: 'var(--text-primary)',
  outline: 'none', fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px',
};

export function EditUserModal({ user, canChangeTeam, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    fullName: user.fullName,
    teamId: user.teamId ?? '',
  });
  const [error, setError] = useState<string | null>(null);

  const teamsQ = useAdminTeams();
  const updateMutation = useUpdateAdminUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    updateMutation.mutate(
      {
        userId: user.id,
        fullName: form.fullName.trim(),
        ...(canChangeTeam
          ? { teamId: form.teamId || null }
          : {}),
      },
      {
        onSuccess,
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
    }}>
      <div className="v2-card" style={{ width: '100%', maxWidth: 440, padding: 0, boxShadow: 'var(--shadow-lg)' }}>
        <div className="v2-card-header" style={{ padding: '16px 20px' }}>
          <div className="v2-card-title">Edit User</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <span style={labelStyle}>Email</span>
            <input disabled style={{ ...inputStyle, opacity: 0.7 }} value={user.email} />
          </div>
          <div>
            <span style={labelStyle}>Full Name</span>
            <input
              required
              style={inputStyle}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <span style={labelStyle}>Role</span>
            <input disabled style={{ ...inputStyle, opacity: 0.7 }} value={user.roleName.replace('_', ' ')} />
          </div>
          {canChangeTeam ? (
            <div>
              <span style={labelStyle}>Team</span>
              <select
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                style={inputStyle}
                disabled={teamsQ.isLoading}
              >
                <option value="">— No team —</option>
                {(teamsQ.data ?? [])
                  .filter((t) => Number(t.isActive) === 1)
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <span style={labelStyle}>Team</span>
              <input disabled style={{ ...inputStyle, opacity: 0.7 }} value={user.teamName ?? '—'} />
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12.5, color: 'var(--red)', padding: '6px 10px', background: '#fef2f2', borderRadius: 'var(--radius-xs)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" style={{ flex: 1, justifyContent: 'center' }} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

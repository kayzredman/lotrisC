'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

const ROLES = [
  { id: 2, label: 'ADMIN' },
  { id: 3, label: 'IT_MANAGER' },
  { id: 4, label: 'TEAM_LEAD' },
  { id: 5, label: 'ENGINEER' },
  { id: 6, label: 'EXECUTIVE' },
];

interface Props {
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

export function InviteUserModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    clerkUserId: '',
    email: '',
    fullName: '',
    roleId: 5,
    teamId: '',
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc['admin.users.create'].useMutation({
    onSuccess,
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      clerkUserId: form.clerkUserId,
      email: form.email,
      fullName: form.fullName,
      roleId: form.roleId,
      ...(form.teamId ? { teamId: form.teamId } : {}),
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
    }}>
      <div className="v2-card" style={{ width: '100%', maxWidth: 440, padding: 0, boxShadow: 'var(--shadow-lg)' }}>
        <div className="v2-card-header" style={{ padding: '16px 20px' }}>
          <div className="v2-card-title">Invite User</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <span style={labelStyle}>Clerk User ID</span>
            <input
              required style={inputStyle}
              placeholder="user_..."
              value={form.clerkUserId}
              onChange={(e) => setForm({ ...form, clerkUserId: e.target.value })}
            />
          </div>
          <div>
            <span style={labelStyle}>Full Name</span>
            <input
              required style={inputStyle}
              placeholder="Jane Smith"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <span style={labelStyle}>Email</span>
            <input
              required type="email" style={inputStyle}
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <span style={labelStyle}>Role</span>
            <select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
              style={inputStyle}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Team ID <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></span>
            <input
              style={inputStyle}
              placeholder="Leave blank to assign later"
              value={form.teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value })}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12.5, color: 'var(--red)', padding: '6px 10px', background: '#fef2f2', borderRadius: 'var(--radius-xs)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" style={{ flex: 1, justifyContent: 'center' }} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Inviting…' : 'Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


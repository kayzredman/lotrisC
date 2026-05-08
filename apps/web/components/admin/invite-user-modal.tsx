'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';

const ROLES = [
  { id: 2, label: 'Admin' },
  { id: 3, label: 'IT Manager' },
  { id: 4, label: 'Team Lead' },
  { id: 5, label: 'Engineer' },
  { id: 6, label: 'Executive' },
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
  const [form, setForm] = useState({ email: '', fullName: '', roleId: 5, teamId: '' });
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const teamsQ = trpc['admin.teams.list'].useQuery();

  const inviteMutation = trpc['admin.users.create'].useMutation({
    onSuccess: () => {
      setSent(true);
      onSuccess();
    },
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    inviteMutation.mutate({
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

        {sent ? (
          /* ── Success state ── */
          <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
            <CheckCircle2 size={40} color="var(--green)" strokeWidth={1.5} />
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Invitation sent!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300 }}>
              An invite email was sent to <strong>{form.email}</strong>. Once they sign up, they'll appear in the users table with the assigned role and team.
            </div>
            <button
              type="button"
              className="v2-btn v2-btn-primary v2-btn-sm"
              style={{ marginTop: 8, minWidth: 120, justifyContent: 'center' }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              <span style={labelStyle}>Full Name</span>
              <input
                required style={inputStyle}
                placeholder="Jane Smith"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
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
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <span style={labelStyle}>Team <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></span>
              <select
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                style={inputStyle}
                disabled={teamsQ.isLoading}
              >
                <option value="">— Assign later —</option>
                {(teamsQ.data ?? [])
                  .filter((t) => Number(t.isActive) === 1)
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
              </select>
              {teamsQ.isLoading && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Loading teams…
                </div>
              )}
            </div>

            <div style={{ padding: '8px 12px', background: 'var(--blue-bg)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Mail size={14} color="var(--blue)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Clerk will email an invite link. Their account is created in the system automatically once they sign up.
              </span>
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
              <button
                type="submit"
                className="v2-btn v2-btn-primary v2-btn-sm"
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
                  : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


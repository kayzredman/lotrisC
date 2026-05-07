'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createTeam } from '@/lib/admin-api';

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

export function CreateTeamModal({ onClose, onSuccess }: Props) {
  const { getToken } = useAuth();
  const [form, setForm] = useState({
    name: '',
    maxTicketsPerEngineer: 5,
    pickupSlaMinutes: 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await createTeam(token, form);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
    }}>
      <div className="v2-card" style={{ width: '100%', maxWidth: 440, padding: 0, boxShadow: 'var(--shadow-lg)' }}>
        {/* Header */}
        <div className="v2-card-header" style={{ padding: '16px 20px' }}>
          <div className="v2-card-title">Create Team</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <span style={labelStyle}>Team Name</span>
            <input
              required
              style={inputStyle}
              placeholder="e.g. Infrastructure Team"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <span style={labelStyle}>Max Tickets per Engineer</span>
            <input
              type="number" min={1} max={50}
              style={inputStyle}
              value={form.maxTicketsPerEngineer}
              onChange={(e) => setForm({ ...form, maxTicketsPerEngineer: Number(e.target.value) })}
            />
          </div>
          <div>
            <span style={labelStyle}>Pickup SLA (minutes)</span>
            <input
              type="number" min={5}
              style={inputStyle}
              value={form.pickupSlaMinutes}
              onChange={(e) => setForm({ ...form, pickupSlaMinutes: Number(e.target.value) })}
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
            <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

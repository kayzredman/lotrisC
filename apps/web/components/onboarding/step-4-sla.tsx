'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function Step4Sla({ onBack, onNext }: Props) {
  const [pickup, setPickup] = useState('30');
  const [resolution, setResolution] = useState('240');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const saveSla = trpc['onboarding.saveSla'].useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(onNext, 600);
    },
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const p = parseInt(pickup, 10);
    const r = parseInt(resolution, 10);
    if (!Number.isInteger(p) || p < 1) return setError('First response must be a positive number of minutes.');
    if (!Number.isInteger(r) || r < 1) return setError('Resolution must be a positive number of minutes.');
    saveSla.mutate({ pickupSlaMinutes: p, resolutionSlaMinutes: r });
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={h1}>SLA &amp; queue defaults</h1>
      <p style={subtext}>
        Set tenant-wide SLA targets. These can be overridden per-team from the Admin panel after setup.
      </p>

      {/* Info callout */}
      <div
        style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 28,
          fontSize: 13,
          color: '#1E40AF',
        }}
      >
        <strong>ℹ️ Tenant-level defaults</strong> — these values apply to all teams unless a team has its own SLA configuration.
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 28,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              padding: '10px 16px',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              fontSize: 12,
              fontWeight: 600,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <span>Metric</span>
            <span>Value</span>
            <span>Unit</span>
          </div>

          {/* First response row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              padding: '14px 16px',
              borderBottom: '1px solid #F1F5F9',
              alignItems: 'center',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>First Response</p>
              <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>Time to first agent reply</p>
            </div>
            <input
              type="number"
              min={1}
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              style={{ ...inputStyle, width: 80 }}
            />
            <span style={{ fontSize: 13, color: '#64748B' }}>minutes</span>
          </div>

          {/* Resolution row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              padding: '14px 16px',
              alignItems: 'center',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Resolution</p>
              <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>Time to ticket close</p>
            </div>
            <input
              type="number"
              min={1}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              style={{ ...inputStyle, width: 80 }}
            />
            <span style={{ fontSize: 13, color: '#64748B' }}>minutes</span>
          </div>
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        {saved && <p style={{ color: '#22C55E', fontSize: 13, marginBottom: 12 }}>SLA defaults saved ✓</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" onClick={onBack} style={ghostBtnStyle}>← Back</button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onNext} style={ghostBtnStyle}>Skip</button>
            <button type="submit" disabled={saveSla.isPending} style={primaryBtnStyle}>
              {saveSla.isPending ? 'Saving…' : 'Save & Continue →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const h1: React.CSSProperties = { fontSize: 28, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' };
const subtext: React.CSSProperties = { color: '#64748B', margin: '0 0 24px', fontSize: 15 };
const inputStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#fff', boxSizing: 'border-box' };
const primaryBtnStyle: React.CSSProperties = { padding: '10px 28px', borderRadius: 8, background: '#4F46E5', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const ghostBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0' };

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

interface SentInvite {
  email: string;
  teamName: string;
}

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function Step3Invite({ onBack, onNext }: Props) {
  const [emailsRaw, setEmailsRaw] = useState('');
  const [teamId, setTeamId] = useState('');
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [error, setError] = useState('');

  const { data: teamsData } = trpc['admin.teams.list'].useQuery();
  const teamsRaw = (teamsData?.teams ?? []) as Array<{ id: string; name: string }>;

  const createUser = trpc['admin.users.create'].useMutation();

  function parseEmails(raw: string): string[] {
    return raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'));
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const emails = parseEmails(emailsRaw);
    if (emails.length === 0) return setError('Please enter at least one valid email address.');

    const teamName = teamsRaw.find((t) => t.id === teamId)?.name ?? '';

    const results = await Promise.allSettled(
      emails.map((email) =>
        createUser.mutateAsync({
          email,
          teamId: teamId || undefined,
          roleId: 'ENGINEER',
        }),
      ),
    );

    const succeeded = emails.filter((_, i) => results[i]?.status === 'fulfilled');
    if (succeeded.length > 0) {
      setSentInvites((prev) => [
        ...prev,
        ...succeeded.map((email) => ({ email, teamName })),
      ]);
      setEmailsRaw('');
    }

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) setError(`${failed} invite(s) failed. Others were sent.`);
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={h1}>Invite engineers</h1>
      <p style={subtext}>
        Invite your team members now, or skip — they can be added later from the Users page.
      </p>

      {/* Non-blocking callout */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 24,
          fontSize: 13,
          color: '#166534',
        }}
      >
        <span>⚡</span>
        <span>This step is optional — engineers can be invited at any time from the Admin panel.</span>
      </div>

      <form onSubmit={handleSend} style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email Addresses</label>
          <textarea
            value={emailsRaw}
            onChange={(e) => setEmailsRaw(e.target.value)}
            placeholder="alice@company.com, bob@company.com"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>Separate multiple emails with commas or newlines</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Assign to Team (optional)</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={selectStyle}>
            <option value="">No specific team</option>
            {teamsRaw.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{error}</p>}

        <button type="submit" disabled={createUser.isPending} style={{ ...primaryBtnStyle, width: '100%' }}>
          {createUser.isPending ? 'Sending…' : 'Send Invites'}
        </button>
      </form>

      {/* Sent invites list */}
      {sentInvites.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Sent</h3>
          {sentInvites.map((inv, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#F8FAFC',
                borderRadius: 6,
                marginBottom: 4,
                fontSize: 13,
              }}
            >
              <span>{inv.email} {inv.teamName && <span style={{ color: '#94A3B8' }}>· {inv.teamName}</span>}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: '#DCFCE7',
                  color: '#166534',
                  padding: '2px 8px',
                  borderRadius: 99,
                }}
              >
                Sent
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={ghostBtnStyle}>← Back</button>
        <button onClick={onNext} style={primaryBtnStyle}>
          {sentInvites.length > 0 ? 'Continue →' : 'Skip for now →'}
        </button>
      </div>
    </div>
  );
}

const h1: React.CSSProperties = { fontSize: 28, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' };
const subtext: React.CSSProperties = { color: '#64748B', margin: '0 0 24px', fontSize: 15 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#fff', boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
const primaryBtnStyle: React.CSSProperties = { padding: '10px 28px', borderRadius: 8, background: '#4F46E5', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const ghostBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0' };

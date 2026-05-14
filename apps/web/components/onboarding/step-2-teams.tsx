'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

interface User {
  id: string;
  fullName: string;
  roleName: string;
}

interface CreatedTeam {
  name: string;
  leadName: string;
}

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function Step2Teams({ onBack, onNext }: Props) {
  const [teamName, setTeamName] = useState('');
  const [leadId, setLeadId] = useState('');
  const [createdTeams, setCreatedTeams] = useState<CreatedTeam[]>([]);
  const [error, setError] = useState('');

  const { data: usersData } = trpc['admin.users.list'].useQuery();
  const usersRaw: User[] = (usersData?.users ?? []) as User[];

  const createTeam = trpc['admin.teams.create'].useMutation({
    onError: (e) => setError(e.message),
  });

  const updateRole = trpc['admin.users.updateRole'].useMutation();

  const selectedUser = usersRaw.find((u) => u.id === leadId);
  const isNonTL =
    selectedUser &&
    selectedUser.roleName !== 'TEAM_LEAD' &&
    selectedUser.roleName !== 'IT_MANAGER' &&
    selectedUser.roleName !== 'ADMIN' &&
    selectedUser.roleName !== 'SUPERADMIN';

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!teamName.trim()) return setError('Team name is required.');
    if (!leadId) return setError('Please select a Team Lead.');

    try {
      // If user is not a TL+, promote them
      if (isNonTL) {
        await updateRole.mutateAsync({ userId: leadId, roleId: 'TEAM_LEAD' });
      }
      await createTeam.mutateAsync({ name: teamName.trim(), leadId });
      setCreatedTeams((prev) => [...prev, { name: teamName.trim(), leadName: selectedUser?.fullName ?? '' }]);
      setTeamName('');
      setLeadId('');
    } catch {
      /* handled by onError */
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={h1}>Set up your teams</h1>
      <p style={subtext}>Create the IT support teams in your organisation. You can add more later.</p>

      {/* Created teams list */}
      {createdTeams.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {createdTeams.map((t) => (
            <div
              key={t.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{t.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                  TL: {t.leadName}
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  padding: '3px 10px',
                  borderRadius: 99,
                }}
              >
                Created
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add team form */}
      <form
        onSubmit={handleAddTeam}
        style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#0F172A' }}>
          + New Team
        </h3>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Team Name</label>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. IT Support"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Team Lead</label>
          <select
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select a user…</option>
            {usersRaw.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} · {u.roleName}
              </option>
            ))}
          </select>
        </div>

        {/* Role promotion notice */}
        {isNonTL && selectedUser && (
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 6,
              padding: '10px 14px',
              fontSize: 13,
              color: '#92400E',
              marginBottom: 14,
            }}
          >
            <strong>{selectedUser.fullName}</strong> will be promoted to{' '}
            <strong>Team Lead</strong> on activation.
          </div>
        )}

        {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{error}</p>}

        <button
          type="submit"
          disabled={createTeam.isPending || updateRole.isPending}
          style={{ ...primaryBtnStyle, width: '100%' }}
        >
          {createTeam.isPending ? 'Creating…' : 'Add Team'}
        </button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={ghostBtnStyle}>← Back</button>
        <button onClick={onNext} style={primaryBtnStyle}>
          Continue →
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

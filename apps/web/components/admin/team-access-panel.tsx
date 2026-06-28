'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAdminUsers,
  useAdminTeams,
  useTeamAccessList,
  useGrantTeamAccess,
  useRevokeTeamAccess,
} from '@/lib/api/hooks/useAdmin';
import { Shield, Plus, Trash2, UserCheck } from 'lucide-react';

export function TeamAccessPanel() {
  const [granteeUserId, setGranteeUserId] = useState('');
  const [targetTeamId, setTargetTeamId] = useState('');

  const queryClient = useQueryClient();

  const grantsQuery = useTeamAccessList();
  const usersQuery = useAdminUsers();
  const teamsQuery = useAdminTeams();

  const grantMutation = useGrantTeamAccess();
  const revokeMutation = useRevokeTeamAccess();

  // Only Team Leads can be grantees
  const teamLeads = (usersQuery.data ?? []).filter((u) => u.roleName === 'TEAM_LEAD' && u.isActive);
  const teams     = teamsQuery.data ?? [];
  const grants    = grantsQuery.data ?? [];

  function handleGrant() {
    if (!granteeUserId || !targetTeamId) return;
    grantMutation.mutate(
      { userId: granteeUserId, teamId: targetTeamId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['admin', 'team-access'] });
          setGranteeUserId('');
          setTargetTeamId('');
        },
      },
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="v2-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Cross-Team Access Grants</h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
            Grant a Team Lead visibility into another team's tickets. Revocable at any time.
          </p>
        </div>
      </div>

      {/* Grant form */}
      <div className="v2-card" style={{ marginBottom: 20 }}>
        <div className="v2-card-header">
          <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> New Grant
          </div>
        </div>
        <div className="v2-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
                Team Lead
              </label>
              <select
                value={granteeUserId}
                onChange={(e) => setGranteeUserId(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', background: 'var(--bg)', color: 'var(--text-primary)',
                }}
              >
                <option value="">— select Team Lead —</option>
                {teamLeads.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.teamName ?? 'no team'})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
                Target Team (read access)
              </label>
              <select
                value={targetTeamId}
                onChange={(e) => setTargetTeamId(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', background: 'var(--bg)', color: 'var(--text-primary)',
                }}
              >
                <option value="">— select Team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <button
              className="v2-btn v2-btn-primary v2-btn-sm"
              onClick={handleGrant}
              disabled={!granteeUserId || !targetTeamId || grantMutation.isPending}
              style={{ whiteSpace: 'nowrap' }}
            >
              <UserCheck size={12} /> Grant Access
            </button>
          </div>
          {grantMutation.isError && (
            <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>
              {grantMutation.error.message}
            </p>
          )}
        </div>
      </div>

      {/* Active grants table */}
      <div className="v2-card">
        <div className="v2-card-header">
          <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={14} /> Active Grants
          </div>
        </div>
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>Team Lead</th>
                <th>Can View Team</th>
                <th>Granted By</th>
                <th>Granted At</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {grants.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                    No cross-team access grants yet.
                  </td>
                </tr>
              )}
              {grants.map((g) => (
                <tr key={g.id}>
                  <td style={{ fontWeight: 600 }}>{g.granteeName}</td>
                  <td>
                    <span className="v2-badge v2-badge-blue">{g.targetTeamName}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{g.grantedByName}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(g.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="v2-btn v2-btn-ghost v2-btn-sm"
                      style={{ color: 'var(--red)', padding: '4px 8px' }}
                      onClick={() => revokeMutation.mutate(
                        { grantId: g.id as string },
                        { onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'team-access'] }) },
                      )}
                      disabled={revokeMutation.isPending}
                      title="Revoke access"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

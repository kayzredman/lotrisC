'use client';

import { useState } from 'react';
import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import { useAdminTeams, useUpdateAdminTeam } from '@/lib/api/hooks/useAdmin';
import { CreateTeamModal } from './create-team-modal';
import { EditTeamModal, type TeamRow } from './edit-team-modal';

function canCreateTeams(role: string) {
  return role === 'SUPERADMIN' || role === 'ADMIN' || role === 'IT_MANAGER';
}

function canDeactivateTeams(role: string) {
  return role === 'SUPERADMIN' || role === 'ADMIN' || role === 'IT_MANAGER';
}

function canEditTeam(role: string, teamId: string, myTeamId?: string | null) {
  if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'IT_MANAGER') return true;
  if (role === 'TEAM_LEAD') return Boolean(myTeamId && myTeamId === teamId);
  return false;
}

export function TeamsTable() {
  const { data: me } = useCurrentUser({ staleTime: 60_000 });
  const role = me?.roleName ?? '';
  const myTeamId = me?.teamId ?? null;

  const [showCreate, setShowCreate] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: teams = [], isLoading, error, refetch } = useAdminTeams();
  const updateTeamMutation = useUpdateAdminTeam();

  const handleToggleActive = async (team: TeamRow) => {
    setUpdatingId(team.id);
    try {
      await updateTeamMutation.mutateAsync({ teamId: team.id, isActive: !team.isActive });
      void refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          {teams.length} team{teams.length !== 1 ? 's' : ''}
          {role === 'TEAM_LEAD' && myTeamId ? ' · you can edit your assigned team' : ''}
        </span>
        {canCreateTeams(role) && (
          <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowCreate(true)}>
            + Create Team
          </button>
        )}
      </div>

      <div className="v2-card">
        {isLoading && (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading teams…
          </div>
        )}
        {error && (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>
            {error.message}
          </div>
        )}
        {!isLoading && !error && (
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Members</th>
                  <th>Max Tickets / Eng</th>
                  <th>Pickup SLA</th>
                  <th>Status</th>
                  <th style={{ width: 160 }} />
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => {
                  const row = team as TeamRow & { memberCount: number };
                  const editable = canEditTeam(role, row.id, myTeamId);
                  const deactivatable = canDeactivateTeams(role);
                  return (
                    <tr key={row.id} style={{ opacity: updatingId === row.id ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{row.memberCount}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{row.maxTicketsPerEngineer}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{row.pickupSlaMinutes} min</td>
                      <td>
                        <span
                          className={row.isActive ? 'v2-badge v2-badge-green' : 'v2-badge'}
                          style={{ fontSize: 10.5 }}
                        >
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {editable && (
                            <button
                              type="button"
                              className="v2-btn v2-btn-ghost v2-btn-sm"
                              style={{ fontSize: 11 }}
                              onClick={() => setEditingTeam(row)}
                            >
                              Edit
                            </button>
                          )}
                          {deactivatable && (
                            <button
                              type="button"
                              className="v2-btn v2-btn-ghost v2-btn-sm"
                              style={{ fontSize: 11 }}
                              disabled={updatingId === row.id}
                              onClick={() => void handleToggleActive(row)}
                            >
                              {row.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {teams.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No teams found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTeamModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); void refetch(); }}
        />
      )}

      {editingTeam && (
        <EditTeamModal
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSuccess={() => { setEditingTeam(null); void refetch(); }}
        />
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { useAdminTeams, useUpdateAdminTeam } from '@/lib/api/hooks/useAdmin';
import { CreateTeamModal } from './create-team-modal';

export function TeamsTable() {
  const [showCreate, setShowCreate] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: teams = [], isLoading, error, refetch } = useAdminTeams();

  const updateTeamMutation = useUpdateAdminTeam();

  const handleToggleActive = async (teamId: string, isActive: boolean) => {
    setUpdatingId(teamId);
    try {
      await updateTeamMutation.mutateAsync({ teamId, isActive: !isActive });
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
        </span>
        <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowCreate(true)}>
          + Create Team
        </button>
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
                  <th style={{ width: 100 }} />
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} style={{ opacity: updatingId === team.id ? 0.6 : 1 }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{team.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{team.memberCount}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{team.maxTicketsPerEngineer}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{team.pickupSlaMinutes} min</td>
                    <td>
                      <span
                        className={team.isActive ? 'v2-badge v2-badge-green' : 'v2-badge'}
                        style={{ fontSize: 10.5 }}
                      >
                        {team.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        style={{ fontSize: 11 }}
                        disabled={updatingId === team.id}
                        onClick={() => void handleToggleActive(team.id, team.isActive)}
                      >
                        {team.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
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
    </>
  );
}


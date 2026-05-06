'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Badge, Button, Card } from '@lotris/ui';
import type { AdminTeam } from '@/lib/admin-api';
import { listTeams, updateTeam } from '@/lib/admin-api';
import { CreateTeamModal } from './create-team-modal';

export function TeamsTable() {
  const { getToken } = useAuth();
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      setTeams(await listTeams(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  const handleToggleActive = async (team: AdminTeam) => {
    const token = await getToken();
    if (!token) return;
    setUpdatingId(team.id);
    try {
      const updated = await updateTeam(token, team.id, { isActive: !team.isActive });
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, isActive: updated.isActive } : t)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setShowCreate(true)}>Create Team</Button>
      </div>

      <Card className="overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-slate-400 text-sm">Loading teams…</div>
        )}
        {error && (
          <div className="p-8 text-center text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="px-4 py-3 text-slate-400 font-medium">Team Name</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Members</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Max Tickets</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Pickup SLA</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-100 font-medium">{team.name}</td>
                    <td className="px-4 py-3 text-slate-300">{team.memberCount}</td>
                    <td className="px-4 py-3 text-slate-300">{team.maxTicketsPerEngineer}</td>
                    <td className="px-4 py-3 text-slate-300">{team.pickupSlaMinutes} min</td>
                    <td className="px-4 py-3">
                      <Badge variant={team.isActive ? 'success' : 'secondary'}>
                        {team.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingId === team.id}
                        onClick={() => void handleToggleActive(team)}
                      >
                        {team.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No teams found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreate && (
        <CreateTeamModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); void load(); }}
        />
      )}
    </>
  );
}

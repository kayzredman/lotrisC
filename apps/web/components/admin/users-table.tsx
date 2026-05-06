'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Badge, Button, Card } from '@lotris/ui';
import type { AdminUser } from '@/lib/admin-api';
import { listUsers, assignRole, deactivateUser } from '@/lib/admin-api';
import { InviteUserModal } from './invite-user-modal';
import type { UserRole } from '@lotris/types';
import { UserRole as UserRoleEnum } from '@lotris/types';

const ROLE_COLORS: Record<UserRole, string> = {
  SUPERADMIN: 'destructive',
  ADMIN: 'warning',
  IT_MANAGER: 'secondary',
  TEAM_LEAD: 'default',
  ENGINEER: 'outline',
  EXECUTIVE: 'success',
} as const;

const ROLE_IDS: Record<UserRole, number> = {
  SUPERADMIN: 1,
  ADMIN: 2,
  IT_MANAGER: 3,
  TEAM_LEAD: 4,
  ENGINEER: 5,
  EXECUTIVE: 6,
};

export function UsersTable() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      setUsers(await listUsers(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const token = await getToken();
    if (!token) return;
    setUpdatingId(userId);
    try {
      const updated = await assignRole(token, userId, ROLE_IDS[role]);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Role update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    const token = await getToken();
    if (!token) return;
    setUpdatingId(user.id);
    try {
      const updated = await deactivateUser(token, user.id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: updated.isActive } : u)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setShowInvite(true)}>Invite User</Button>
      </div>

      <Card className="overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-slate-400 text-sm">Loading users…</div>
        )}
        {error && (
          <div className="p-8 text-center text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="px-4 py-3 text-slate-400 font-medium">Name</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Email</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Role</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Team</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-100 font-medium">{user.fullName}</td>
                    <td className="px-4 py-3 text-slate-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={updatingId === user.id}
                        onChange={(e) => void handleRoleChange(user.id, e.target.value as UserRole)}
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {Object.values(UserRoleEnum).map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{user.teamName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? 'success' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingId === user.id}
                        onClick={() => void handleToggleActive(user)}
                      >
                        {user.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showInvite && (
        <InviteUserModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); void load(); }}
        />
      )}
    </>
  );
}

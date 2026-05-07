'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { AdminUser } from '@/lib/admin-api';
import { listUsers, assignRole, deactivateUser } from '@/lib/admin-api';
import { InviteUserModal } from './invite-user-modal';
import type { UserRole } from '@lotris/types';

const USER_ROLES: UserRole[] = ['SUPERADMIN', 'ADMIN', 'IT_MANAGER', 'TEAM_LEAD', 'ENGINEER'];

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  SUPERADMIN:  { bg: '#fef2f2', color: '#dc2626' },
  ADMIN:       { bg: '#fff7ed', color: '#ea580c' },
  IT_MANAGER:  { bg: '#eff6ff', color: '#2563eb' },
  TEAM_LEAD:   { bg: '#f0fdf4', color: '#16a34a' },
  ENGINEER:    { bg: '#f5f3ff', color: '#7c3aed' },
  EXECUTIVE:   { bg: '#f0fdf4', color: '#0891b2' },
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
    const roleIds: Record<UserRole, number> = { SUPERADMIN: 1, ADMIN: 2, IT_MANAGER: 3, TEAM_LEAD: 4, ENGINEER: 5, EXECUTIVE: 6 };
    const token = await getToken();
    if (!token) return;
    setUpdatingId(userId);
    try {
      const updated = await assignRole(token, userId, roleIds[role]);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          {users.length} user{users.length !== 1 ? 's' : ''}
        </span>
        <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowInvite(true)}>
          + Invite User
        </button>
      </div>

      <div className="v2-card">
        {loading && (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading users…
          </div>
        )}
        {error && (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>
            {error}
          </div>
        )}
        {!loading && !error && (
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th style={{ width: 100 }} />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const rb = ROLE_BADGE[user.role] ?? { bg: '#f1f5f9', color: '#64748b' };
                  return (
                    <tr key={user.id} style={{ opacity: updatingId === user.id ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.fullName}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          disabled={updatingId === user.id}
                          onChange={(e) => void handleRoleChange(user.id, e.target.value as UserRole)}
                          style={{
                            fontSize: 11.5, fontWeight: 700,
                            background: rb.bg, color: rb.color,
                            border: `1px solid ${rb.bg}`,
                            borderRadius: 'var(--radius-xs)',
                            padding: '3px 7px',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {USER_ROLES.map((r) => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{user.teamName ?? '—'}</td>
                      <td>
                        <span
                          className={user.isActive ? 'v2-badge v2-badge-green' : 'v2-badge'}
                          style={{ fontSize: 10.5 }}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="v2-btn v2-btn-ghost v2-btn-sm"
                          style={{ fontSize: 11 }}
                          disabled={updatingId === user.id}
                          onClick={() => void handleToggleActive(user)}
                        >
                          {user.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && (
        <InviteUserModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); void load(); }}
        />
      )}
    </>
  );
}

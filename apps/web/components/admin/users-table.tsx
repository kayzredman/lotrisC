'use client';

import { useState } from 'react';
import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import { useAdminUsers, useUpdateAdminUserRole, useSetAdminUserActive } from '@/lib/api/hooks/useAdmin';
import { InviteUserModal } from './invite-user-modal';
import { EditUserModal, type UserRow } from './edit-user-modal';
import type { UserRole } from '@lotris/types';

const ADMIN_ROLES: UserRole[] = ['SUPERADMIN', 'ADMIN', 'IT_MANAGER', 'TEAM_LEAD', 'ENGINEER'];

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  SUPERADMIN:  { bg: '#fef2f2', color: '#dc2626' },
  ADMIN:       { bg: '#fff7ed', color: '#ea580c' },
  IT_MANAGER:  { bg: '#eff6ff', color: '#2563eb' },
  TEAM_LEAD:   { bg: '#f0fdf4', color: '#16a34a' },
  ENGINEER:    { bg: '#f5f3ff', color: '#7c3aed' },
  EXECUTIVE:   { bg: '#f0fdf4', color: '#0891b2' },
};

function canInviteUsers(role: string) {
  return role === 'SUPERADMIN' || role === 'ADMIN' || role === 'IT_MANAGER' || role === 'TEAM_LEAD';
}

function canAssignRoles(role: string) {
  return role === 'SUPERADMIN' || role === 'ADMIN' || role === 'IT_MANAGER';
}

function canChangeTeam(role: string) {
  return role === 'SUPERADMIN' || role === 'ADMIN' || role === 'IT_MANAGER';
}

function canManageUser(actorRole: string, user: UserRow, actorId?: string) {
  if (actorRole === 'SUPERADMIN' || actorRole === 'ADMIN' || actorRole === 'IT_MANAGER') return true;
  if (actorRole === 'TEAM_LEAD') {
    return user.roleName === 'ENGINEER' || user.roleName === 'TEAM_LEAD';
  }
  return false;
}

function canDeactivateUser(actorRole: string, user: UserRow, actorId?: string) {
  if (user.id === actorId) return false;
  if (actorRole === 'SUPERADMIN' || actorRole === 'ADMIN' || actorRole === 'IT_MANAGER') return true;
  if (actorRole === 'TEAM_LEAD') return user.roleName === 'ENGINEER';
  return false;
}

export function UsersTable() {
  const { data: me } = useCurrentUser({ staleTime: 60_000 });
  const role = me?.roleName ?? '';

  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: users = [], isLoading, error, refetch } = useAdminUsers();
  const updateRoleMutation = useUpdateAdminUserRole();
  const setActiveMutation = useSetAdminUserActive();

  const handleRoleChange = async (userId: string, nextRole: UserRole) => {
    const roleIds: Record<UserRole, number> = { SUPERADMIN: 1, ADMIN: 2, IT_MANAGER: 3, TEAM_LEAD: 4, ENGINEER: 5, EXECUTIVE: 6 };
    setUpdatingId(userId);
    try {
      await updateRoleMutation.mutateAsync({ userId, roleId: roleIds[nextRole] });
      void refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Role update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    setUpdatingId(userId);
    try {
      await setActiveMutation.mutateAsync({ userId, isActive: !isActive });
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
          {users.length} user{users.length !== 1 ? 's' : ''}
          {role === 'TEAM_LEAD' ? ' · your team only' : ''}
        </span>
        {canInviteUsers(role) && (
          <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowInvite(true)}>
            + Add User
          </button>
        )}
      </div>

      <div className="v2-card">
        {isLoading && (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading users…
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th style={{ width: 180 }} />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const row = user as UserRow;
                  const userRole = (row.roleName ?? 'ENGINEER') as UserRole;
                  const rb = ROLE_BADGE[userRole] ?? { bg: '#f1f5f9', color: '#64748b' };
                  const isActive = Number(row.isActive) === 1;
                  const manageable = canManageUser(role, row, me?.id);
                  const deactivatable = canDeactivateUser(role, row, me?.id);
                  return (
                    <tr key={row.id} style={{ opacity: updatingId === row.id ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.fullName}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{row.email}</td>
                      <td>
                        {canAssignRoles(role) ? (
                          <select
                            value={userRole}
                            disabled={updatingId === row.id}
                            onChange={(e) => void handleRoleChange(row.id, e.target.value as UserRole)}
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
                            {ADMIN_ROLES.map((r) => (
                              <option key={r} value={r}>{r.replace('_', ' ')}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="v2-badge" style={{ fontSize: 10.5, background: rb.bg, color: rb.color }}>
                            {userRole.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{row.teamName ?? '—'}</td>
                      <td>
                        <span
                          className={isActive ? 'v2-badge v2-badge-green' : 'v2-badge'}
                          style={{ fontSize: 10.5 }}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {manageable && (
                            <button
                              type="button"
                              className="v2-btn v2-btn-ghost v2-btn-sm"
                              style={{ fontSize: 11 }}
                              onClick={() => setEditingUser(row)}
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
                              onClick={() => void handleToggleActive(row.id, isActive)}
                            >
                              {isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
                        </div>
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
          teamLeadMode={role === 'TEAM_LEAD'}
          defaultTeamId={me?.teamId ?? undefined}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); void refetch(); }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          canChangeTeam={canChangeTeam(role)}
          onClose={() => setEditingUser(null)}
          onSuccess={() => { setEditingUser(null); void refetch(); }}
        />
      )}
    </>
  );
}

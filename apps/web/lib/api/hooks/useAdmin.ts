import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useAdminUsers(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['admin', 'users'],
    '/api/v1/admin/users',
    options,
  );
}

export function useAdminTeams(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['admin', 'teams'],
    '/api/v1/admin/teams',
    options,
  );
}

/** Alias for components that previously used teams.list */
export function useTeamsList(options?: QueryHookOptions) {
  return useAdminTeams(options);
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { email: string; fullName: string; roleId: number; teamId?: string; temporaryPassword?: string }
  >(
    (token, body) => apiFetch('/api/v1/admin/users', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }) },
  );
}

export function useUpdateAdminUserRole() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    void,
    { userId: string; roleId: number }
  >(
    (token, { userId, roleId }) =>
      apiFetch(`/api/v1/admin/users/${userId}/role`, { method: 'PATCH', token, body: { roleId } }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }) },
  );
}

export function useSetAdminUserActive() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    void,
    { userId: string; isActive: boolean }
  >(
    (token, { userId, isActive }) => {
      if (!isActive) {
        return apiFetch(`/api/v1/admin/users/${userId}`, { method: 'DELETE', token });
      }
      return apiFetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        token,
        body: { isActive: true },
      });
    },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }) },
  );
}

export function useCreateAdminTeam() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { name: string; maxTicketsPerEngineer?: number; pickupSlaMinutes?: number }
  >(
    (token, body) => apiFetch('/api/v1/admin/teams', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'teams'] }) },
  );
}

export function useUpdateAdminTeam() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    void,
    { teamId: string; name?: string; maxTicketsPerEngineer?: number; pickupSlaMinutes?: number; isActive?: boolean }
  >(
    (token, { teamId, ...body }) =>
      apiFetch(`/api/v1/admin/teams/${teamId}`, { method: 'PATCH', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'teams'] }) },
  );
}

// Stubs — no C# endpoints yet
export function useTeamAccessList() {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['admin', 'team-access'],
    '/api/v1/admin/team-access',
    { enabled: false, initialData: [] },
  );
}

export function useGrantTeamAccess() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, { userId: string; teamId: string }>(
    async () => undefined,
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'team-access'] }) },
  );
}

export function useRevokeTeamAccess() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, { grantId: string }>(
    async () => undefined,
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'team-access'] }) },
  );
}

export function useCategoryRoutingList(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['admin', 'category-routing'],
    '/api/v1/admin/category-routing',
    { enabled: false, initialData: [], staleTime: options?.staleTime },
  );
}

export function useUpsertCategoryRouting() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, ApiRecord>(
    async () => undefined,
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'category-routing'] }) },
  );
}

export function useDeleteCategoryRouting() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, { id: string }>(
    async () => undefined,
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'category-routing'] }) },
  );
}

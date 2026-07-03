import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useRcaSettings(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['rca-settings'],
    '/api/v1/admin/rca-settings',
    options,
  );
}

export function useUpdateRcaSettings() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, ApiRecord>(
    (token, body) => apiFetch('/api/v1/admin/rca-settings', { method: 'PUT', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['rca-settings'] }) },
  );
}

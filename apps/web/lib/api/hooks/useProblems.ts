import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useProblemsList(filter?: string, options?: QueryHookOptions) {
  const q = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  return useAuthenticatedQuery<ApiRecord[]>(
    ['problems', 'list', filter],
    `/api/v1/problems${q}`,
    options,
  );
}

export function useProblemStats(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['problems', 'stats'],
    '/api/v1/problems/stats',
    options,
  );
}

export function useCreateProblem() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { title: string; ticketId?: string; technicalOwnerId?: string; processOwnerId?: string }
  >(
    (token, body) => apiFetch('/api/v1/problems', { method: 'POST', token, body }),
    {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['problems'] });
      },
    },
  );
}

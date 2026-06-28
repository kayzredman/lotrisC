import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export interface QueueListParams {
  page?: number;
  limit?: number;
  teamId?: string;
}

function buildQuery(params?: QueueListParams) {
  if (!params) return '';
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.teamId) q.set('teamId', params.teamId);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function useQueueList(params?: QueueListParams, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['queue', 'list', params],
    `/api/v1/queue${buildQuery(params)}`,
    options,
  );
}

export function useQueueHealth(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['queue', 'health'],
    '/api/v1/queue/health',
    options,
  );
}

export function useClaimTicket() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, { ticketId: string }>(
    (token, { ticketId }) =>
      apiFetch(`/api/v1/queue/claim/${ticketId}`, { method: 'POST', token }),
    {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['queue'] });
        void qc.invalidateQueries({ queryKey: ['tickets', 'list'] });
        void qc.invalidateQueries({ queryKey: ['dashboard', 'queue-health'] });
      },
    },
  );
}

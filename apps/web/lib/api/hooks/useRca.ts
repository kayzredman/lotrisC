import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useRca(id: string, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['rca', id],
    `/api/v1/rca/${id}`,
    { enabled: !!id && (options?.enabled ?? true), ...options },
  );
}

export function useTicketRcaSummary(ticketId: string, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['tickets', ticketId, 'rca-summary'],
    `/api/v1/tickets/${ticketId}/rca-summary`,
    { enabled: !!ticketId && (options?.enabled ?? true), ...options },
  );
}

export function useUpdateRca() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, { id: string } & ApiRecord>(
    (token, { id, ...body }) => apiFetch(`/api/v1/rca/${id}`, { method: 'PATCH', token, body }),
    {
      onSuccess: (_, { id }) => {
        void qc.invalidateQueries({ queryKey: ['rca', id] });
        void qc.invalidateQueries({ queryKey: ['problems'] });
      },
    },
  );
}

export function useSubmitRca() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, { id: string }>(
    (token, { id }) => apiFetch(`/api/v1/rca/${id}/submit`, { method: 'POST', token }),
    { onSuccess: (_, { id }) => void qc.invalidateQueries({ queryKey: ['rca', id] }) },
  );
}

export function usePublishRca() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, { id: string }>(
    (token, { id }) => apiFetch(`/api/v1/rca/${id}/publish`, { method: 'POST', token }),
    {
      onSuccess: (_, { id }) => {
        void qc.invalidateQueries({ queryKey: ['rca', id] });
        void qc.invalidateQueries({ queryKey: ['problems'] });
        void qc.invalidateQueries({ queryKey: ['knowledge'] });
      },
    },
  );
}

export function useDelegateRca() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, { id: string; delegateId: string }>(
    (token, { id, delegateId }) =>
      apiFetch(`/api/v1/rca/${id}/delegate`, { method: 'POST', token, body: { delegateId } }),
    { onSuccess: (_, { id }) => void qc.invalidateQueries({ queryKey: ['rca', id] }) },
  );
}

export function useAddRcaAction() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { rcaId: string; actionType: string; description: string; ownerId: string; dueAt?: string }
  >(
    (token, { rcaId, ...body }) =>
      apiFetch(`/api/v1/rca/${rcaId}/actions`, { method: 'POST', token, body }),
    { onSuccess: (_, { rcaId }) => void qc.invalidateQueries({ queryKey: ['rca', rcaId] }) },
  );
}

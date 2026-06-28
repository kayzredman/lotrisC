import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export interface TicketListParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: number;
  assigneeId?: string;
  teamId?: string;
  search?: string;
  slaWarning?: string;
}

function buildQuery(params?: TicketListParams) {
  if (!params) return '';
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status) q.set('status', params.status);
  if (params.priority) q.set('priority', String(params.priority));
  if (params.assigneeId) q.set('assigneeId', params.assigneeId);
  if (params.teamId) q.set('teamId', params.teamId);
  if (params.search) q.set('search', params.search);
  if (params.slaWarning) q.set('slaWarning', params.slaWarning);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function useTicketsList(params?: TicketListParams, options?: QueryHookOptions) {
  return useAuthenticatedQuery<{ items?: ApiRecord[]; total?: number }>(
    ['tickets', 'list', params],
    `/api/v1/tickets${buildQuery(params)}`,
    options,
  );
}

export function useTicket(id: string, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['tickets', id],
    `/api/v1/tickets/${id}`,
    { enabled: !!id && (options?.enabled ?? true) },
  );
}

export function useTicketComments(ticketId: string) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['tickets', ticketId, 'comments'],
    `/api/v1/tickets/${ticketId}/comments`,
    { enabled: !!ticketId },
  );
}

export function useTicketHistory(ticketId: string) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['tickets', ticketId, 'history'],
    `/api/v1/tickets/${ticketId}/history`,
    { enabled: !!ticketId },
  );
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, ApiRecord>(
    (token, body) => apiFetch('/api/v1/tickets', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['tickets', 'list'] }) },
  );
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { id: string; status: string; teamId?: string; assigneeId?: string }
  >(
    (token, { id, ...body }) =>
      apiFetch(`/api/v1/tickets/${id}/status`, { method: 'PATCH', token, body }),
    {
      onSuccess: (_, { id }) => {
        void qc.invalidateQueries({ queryKey: ['tickets', id] });
        void qc.invalidateQueries({ queryKey: ['tickets', 'list'] });
      },
    },
  );
}

export function useAssignTicket() {
  const mutation = useUpdateTicketStatus();
  return {
    ...mutation,
    mutate: (vars: { ticketId: string; assigneeId: string }, opts?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate({ id: vars.ticketId, status: 'ASSIGNED', assigneeId: vars.assigneeId }, opts),
    mutateAsync: (vars: { ticketId: string; assigneeId: string }) =>
      mutation.mutateAsync({ id: vars.ticketId, status: 'ASSIGNED', assigneeId: vars.assigneeId }),
  };
}

export function useAddTicketComment() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { ticketId: string; body: string; isInternal?: boolean }
  >(
    (token, { ticketId, body, isInternal }) =>
      apiFetch(`/api/v1/tickets/${ticketId}/comments`, {
        method: 'POST',
        token,
        body: { body, isInternal: isInternal ?? false },
      }),
    {
      onSuccess: (_, { ticketId }) => {
        void qc.invalidateQueries({ queryKey: ['tickets', ticketId, 'comments'] });
      },
    },
  );
}

export function useBatchReassignTickets() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    { reassigned: number },
    { reassignments: { ticketId: string; toEngineerId: string }[] }
  >(
    async (token, { reassignments }) => {
      let reassigned = 0;
      for (const item of reassignments) {
        await apiFetch(`/api/v1/tickets/${item.ticketId}/status`, {
          method: 'PATCH',
          token,
          body: { status: 'ASSIGNED', assigneeId: item.toEngineerId },
        });
        reassigned += 1;
      }
      return { reassigned };
    },
    {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['analytics', 'team-workload'] });
        void qc.invalidateQueries({ queryKey: ['tickets', 'list'] });
      },
    },
  );
}

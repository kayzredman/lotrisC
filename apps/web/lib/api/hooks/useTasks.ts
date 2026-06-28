import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export interface TaskListParams {
  page?: number;
  limit?: number;
  status?: string;
  assigneeId?: string;
}

function buildQuery(params?: TaskListParams) {
  if (!params) return '';
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status) q.set('status', params.status);
  if (params.assigneeId) q.set('assigneeId', params.assigneeId);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function useTasksList(params?: TaskListParams, options?: QueryHookOptions) {
  return useAuthenticatedQuery<{ items?: ApiRecord[]; tasks?: ApiRecord[] }>(
    ['tasks', 'list', params],
    `/api/v1/tasks${buildQuery(params)}`,
    options,
  );
}

export function useTask(id: string) {
  return useAuthenticatedQuery<ApiRecord>(
    ['tasks', id],
    `/api/v1/tasks/${id}`,
    { enabled: !!id },
  );
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, ApiRecord>(
    (token, body) => apiFetch('/api/v1/tasks', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['tasks', 'list'] }) },
  );
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { id: string } & ApiRecord
  >(
    (token, { id, ...body }) =>
      apiFetch(`/api/v1/tasks/${id}`, { method: 'PATCH', token, body }),
    {
      onSuccess: (_, { id }) => {
        void qc.invalidateQueries({ queryKey: ['tasks', id] });
        void qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
      },
    },
  );
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, { id: string }>(
    (token, { id }) => apiFetch(`/api/v1/tasks/${id}/complete`, { method: 'POST', token }),
    {
      onSuccess: (_, { id }) => {
        void qc.invalidateQueries({ queryKey: ['tasks', id] });
        void qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
      },
    },
  );
}

export function useAddChecklistItem() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { taskId: string; title: string }
  >(
    (token, { taskId, title }) =>
      apiFetch(`/api/v1/tasks/${taskId}/checklist`, { method: 'POST', token, body: { title } }),
    {
      onSuccess: (_, { taskId }) => void qc.invalidateQueries({ queryKey: ['tasks', taskId] }),
    },
  );
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { taskId: string; itemId: string }
  >(
    (token, { taskId, itemId }) =>
      apiFetch(`/api/v1/tasks/${taskId}/checklist/${itemId}/toggle`, { method: 'PATCH', token }),
    {
      onSuccess: (_, { taskId }) => void qc.invalidateQueries({ queryKey: ['tasks', taskId] }),
    },
  );
}

export function useAddTaskAssignees() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { taskId: string; userIds: string[] }
  >(
    (token, { taskId, userIds }) =>
      apiFetch(`/api/v1/tasks/${taskId}/assignees`, { method: 'POST', token, body: { userIds } }),
    {
      onSuccess: (_, { taskId }) => void qc.invalidateQueries({ queryKey: ['tasks', taskId] }),
    },
  );
}

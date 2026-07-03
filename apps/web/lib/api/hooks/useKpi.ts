import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

function buildQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function useKpiDefinitions(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['kpi', 'definitions'],
    '/api/v1/kpi/definitions',
    options,
  );
}

export function useKpiActuals(params?: { engineerId?: string; metricId?: string }, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['kpi', 'actuals', params],
    `/api/v1/kpi/actuals${buildQuery(params ?? {})}`,
    options,
  );
}

export function useKpiAssignments(
  params?: { engineerId?: string; periodKey?: string },
  options?: QueryHookOptions,
) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['kpi', 'assignments', params],
    `/api/v1/kpi/assignments${buildQuery(params ?? {})}`,
    options,
  );
}

export function useKpiAgreements(
  params?: { engineerId?: string; periodKey?: string },
  options?: QueryHookOptions,
) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['kpi', 'agreements', params],
    `/api/v1/kpi/agreements${buildQuery(params ?? {})}`,
    options,
  );
}

export function useKpiAgreement(id: string, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['kpi', 'agreements', id],
    `/api/v1/kpi/agreements/${id}`,
    { ...options, enabled: !!id && (options?.enabled ?? true) },
  );
}

export function useKpiResult(agreementId: string, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['kpi', 'agreements', agreementId, 'result'],
    `/api/v1/kpi/agreements/${agreementId}/result`,
    { ...options, enabled: !!agreementId && (options?.enabled ?? true) },
  );
}

export function useCreateKpiAgreement() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, ApiRecord>(
    (token, body) => apiFetch('/api/v1/kpi/agreements', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['kpi', 'agreements'] }) },
  );
}

export function useSetKpiAgreementAreas() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { id: string; areas: ApiRecord[] }
  >(
    (token, { id, areas }) =>
      apiFetch(`/api/v1/kpi/agreements/${id}/areas`, { method: 'PATCH', token, body: { areas } }),
    {
      onSuccess: (_, { id }) => {
        void qc.invalidateQueries({ queryKey: ['kpi', 'agreements', id] });
        void qc.invalidateQueries({ queryKey: ['kpi', 'agreements'] });
      },
    },
  );
}

export function useSubmitKpiAgreement() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, { id: string }>(
    (token, { id }) => apiFetch(`/api/v1/kpi/agreements/${id}/submit`, { method: 'POST', token }),
    {
      onSuccess: (_, { id }) => {
        void qc.invalidateQueries({ queryKey: ['kpi', 'agreements', id] });
        void qc.invalidateQueries({ queryKey: ['kpi', 'agreements'] });
      },
    },
  );
}

export function useAcceptKpiAgreement() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, { id: string }>(
    (token, { id }) => apiFetch(`/api/v1/kpi/agreements/${id}/accept`, { method: 'POST', token }),
    {
      onSuccess: (_, { id }) => {
        void qc.invalidateQueries({ queryKey: ['kpi', 'agreements', id] });
        void qc.invalidateQueries({ queryKey: ['kpi', 'agreements'] });
      },
    },
  );
}

export function useCreateKpiAssignment() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, ApiRecord>(
    (token, body) => apiFetch('/api/v1/kpi/assignments', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['kpi', 'assignments'] }) },
  );
}

export function useCreateKpiDefinition() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, ApiRecord>(
    (token, body) => apiFetch('/api/v1/kpi/definitions', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['kpi', 'definitions'] }) },
  );
}

export function useUpdateKpiDefinition() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    { id: string } & ApiRecord
  >(
    (token, { id, ...body }) =>
      apiFetch(`/api/v1/kpi/definitions/${id}`, { method: 'PATCH', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['kpi', 'definitions'] }) },
  );
}

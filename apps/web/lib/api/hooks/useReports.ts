import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useReportsList(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['reports', 'list'],
    '/api/v1/reports',
    options,
  );
}

export function useReportSchedules(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['reports', 'schedules'],
    '/api/v1/reports/schedules',
    options,
  );
}

export function useCreateReportSchedule() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, ApiRecord>(
    (token, body) => apiFetch('/api/v1/reports/schedules', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['reports', 'schedules'] }) },
  );
}

export function useDeleteReportSchedule() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, { id: string }>(
    (token, { id }) => apiFetch(`/api/v1/reports/schedules/${id}`, { method: 'DELETE', token }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['reports', 'schedules'] }) },
  );
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    ApiRecord,
    ApiRecord
  >(
    (token, body) => apiFetch('/api/v1/reports/generate', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['reports', 'list'] }) },
  );
}

/** Stub — report config endpoint not yet on C# API */
export function useReportConfig(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['reports', 'config'],
    '/api/v1/reports/config',
    { enabled: false, staleTime: options?.staleTime, initialData: {} },
  );
}

export function useUpdateReportConfig() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, ApiRecord>(
    async () => undefined,
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['reports', 'config'] }) },
  );
}

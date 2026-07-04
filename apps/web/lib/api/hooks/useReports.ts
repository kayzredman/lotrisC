import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, API_BASE } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useReportsList(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['reports', 'list'],
    '/api/v1/reports',
    options,
  );
}

export function useReportJobStatus(jobId: string | null, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['reports', 'status', jobId],
    `/api/v1/reports/${jobId}/status`,
    {
      enabled: !!jobId,
      refetchInterval: (query) => {
        const status = (query.state.data as ApiRecord | undefined)?.status;
        if (status === 'DONE' || status === 'FAILED') return false;
        return 2000;
      },
      ...options,
    },
  );
}

export async function downloadReportFile(jobId: string, token: string, format = 'PDF') {
  const res = await fetch(`${API_BASE}/api/v1/reports/${jobId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const ext = format === 'EXCEL' || format === 'XLSX' ? 'xlsx' : 'pdf';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lotris-report-${jobId}.${ext}`;
  anchor.click();
  URL.revokeObjectURL(url);
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

export function useReportConfig(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['reports', 'config'],
    '/api/v1/reports/config',
    options,
  );
}

export function useUpdateReportConfig() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, ApiRecord>(
    (token, body) => {
      const recipients = body.defaultRecipients;
      const parsedRecipients =
        typeof recipients === 'string'
          ? (JSON.parse(recipients) as string[])
          : Array.isArray(recipients)
            ? recipients
            : undefined;
      return apiFetch('/api/v1/reports/config', {
        method: 'PATCH',
        token,
        body: { ...body, defaultRecipients: parsedRecipients },
      });
    },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['reports', 'config'] }) },
  );
}

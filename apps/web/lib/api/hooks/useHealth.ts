import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';
import { API_BASE } from '@/lib/api/client';

/** System health — partial mapping to C# /health endpoints; advanced ops stubbed */
export function useHealthSnapshot(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['health', 'snapshot'],
    '/health/ready',
    options,
  );
}

export function useHealthIncidents(_params?: { limit?: number }, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['health', 'incidents'],
    '/health/incidents',
    { enabled: false, initialData: [], refetchInterval: options?.refetchInterval },
  );
}

export function useStoreHealth(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['health', 'store'],
    '/health/store',
    {
      enabled: false,
      initialData: { healthy: true, corruptedPackages: [], repairState: 'idle' },
      refetchInterval: typeof options?.refetchInterval === 'number' ? options.refetchInterval : false,
    },
  );
}

export function useRepairStore() {
  return useAuthenticatedMutation<void, void>(async () => undefined);
}

export function useRestartService() {
  return useAuthenticatedMutation<void, { serviceName: string }>(async () => undefined);
}

export function healthSseUrl() {
  return `${API_BASE}/api/v1/notifications/sse`;
}

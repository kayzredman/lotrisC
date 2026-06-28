import { useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useDashboardSummary(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['dashboard', 'summary'],
    '/api/v1/dashboard/summary',
    options,
  );
}

export function useDashboardQueueHealth(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['dashboard', 'queue-health'],
    '/api/v1/dashboard/queue-health',
    options,
  );
}

export function useDashboardEngineerPerf(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['dashboard', 'engineer-perf'],
    '/api/v1/dashboard/engineer-perf',
    options,
  );
}

export function useDashboardTeamWorkload(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['dashboard', 'team-workload'],
    '/api/v1/dashboard/team-workload',
    options,
  );
}

export function useDashboardTicketAnalytics(days = 7, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['dashboard', 'ticket-analytics', days],
    `/api/v1/dashboard/ticket-analytics?days=${days}`,
    options,
  );
}

export function useSlaWarnings(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['analytics', 'sla-warnings'],
    '/api/v1/analytics/sla-warnings',
    options,
  );
}

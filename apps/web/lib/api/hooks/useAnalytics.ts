import { useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useKpiTrends(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['analytics', 'kpi-trends'],
    '/api/v1/analytics/kpi-trends',
    options,
  );
}

export function useMyKpiTrends(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['analytics', 'my-kpi-trends'],
    '/api/v1/analytics/my-kpi-trends',
    options,
  );
}

/** Workload rebalancing — uses dashboard team workload until dedicated endpoint exists */
export function useAnalyticsTeamWorkload(
  params?: { teamId?: string },
  options?: QueryHookOptions,
) {
  return useAuthenticatedQuery<ApiRecord>(
    ['analytics', 'team-workload', params?.teamId],
    '/api/v1/dashboard/team-workload',
    options,
  );
}

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

/** Workload rebalancing with engineer loads and suggestions */
export function useAnalyticsTeamWorkload(
  params?: { teamId?: string },
  options?: QueryHookOptions,
) {
  const teamId = params?.teamId;
  return useAuthenticatedQuery<ApiRecord>(
    ['analytics', 'team-workload', teamId],
    teamId ? `/api/v1/analytics/team-workload?teamId=${teamId}` : '',
    { enabled: !!teamId && (options?.enabled ?? true), ...options },
  );
}

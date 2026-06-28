import { useDashboardQueueHealth, useDashboardSummary } from './useDashboard';
import type { QueryHookOptions } from './query-utils';

/** Public monitor wall — aggregates dashboard endpoints (no auth required on /monitor page uses MonitorProviders) */
export function useMonitorStats(options?: QueryHookOptions) {
  const summary = useDashboardSummary({ refetchInterval: options?.refetchInterval ?? 30_000 });
  const queue = useDashboardQueueHealth({ refetchInterval: options?.refetchInterval ?? 30_000 });

  const isLoading = summary.isLoading || queue.isLoading;
  const data = summary.data || queue.data
    ? {
        totalOpen: (summary.data as { openTickets?: number } | undefined)?.openTickets ?? 0,
        slaBreach: (summary.data as { slaBreached?: number } | undefined)?.slaBreached ?? 0,
        resolved24h: (summary.data as { resolved24h?: number } | undefined)?.resolved24h ?? 0,
        teams: (queue.data as { teams?: unknown[] } | undefined)?.teams ?? [],
        topTickets: (queue.data as { topTickets?: unknown[] } | undefined)?.topTickets ?? [],
      }
    : undefined;

  return {
    data,
    isLoading,
    refetch: () => {
      void summary.refetch();
      void queue.refetch();
    },
  };
}

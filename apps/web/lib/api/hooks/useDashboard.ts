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

type SlaWarningApiRow = {
  id: string;
  title: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  slaWarningLevel: string;
  minutesRemaining?: number | null;
};

export type SlaWarningItem = {
  ticketId: string;
  ticketRef: string;
  title: string;
  warningLevel: string;
  minutesRemaining: number;
  assigneeName?: string | null;
};

function toTicketRef(id: string): string {
  const segment = id.split('-')[0]?.toUpperCase();
  return `TKT-${segment && segment.length > 0 ? segment : id.slice(0, 8).toUpperCase()}`;
}

function mapSlaWarning(row: SlaWarningApiRow): SlaWarningItem {
  return {
    ticketId: row.id,
    ticketRef: toTicketRef(row.id),
    title: row.title,
    warningLevel: row.slaWarningLevel,
    minutesRemaining: row.minutesRemaining ?? 0,
    assigneeName: row.assigneeName ?? null,
  };
}

/** C# API returns `{ tickets: [...] }` — normalize to the shape dashboard expects. */
export function useSlaWarnings(options?: QueryHookOptions) {
  const result = useAuthenticatedQuery<{ tickets?: SlaWarningApiRow[] }>(
    ['analytics', 'sla-warnings'],
    '/api/v1/analytics/sla-warnings',
    options,
  );

  const rows = result.data?.tickets;
  return {
    ...result,
    data: Array.isArray(rows) ? rows.map(mapSlaWarning) : undefined,
  };
}

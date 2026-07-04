import { apiFetch } from '@/lib/api/client';
import {
  useAuthenticatedMutation,
  useAuthenticatedQuery,
  type ApiRecord,
  type QueryHookOptions,
} from './query-utils';

export type AnalyticsJobConfig = {
  id: string;
  tenantId: string | null;
  incrementalRollupEnabled: boolean;
  incrementalRollupIntervalMinutes: number;
  dailyBatchEnabled: boolean;
  dailyBatchTimesUtc: string[];
  kpiTrendScanEnabled: boolean;
  kpiTrendIntervalMinutes: number;
  slaPredictorEnabled: boolean;
  slaPredictorIntervalMinutes: number;
  dashboardCacheTtlSeconds: number;
  updatedAt: string;
  updatedBy: string | null;
};

export type AnalyticsJobStatusItem = {
  jobKey: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  nextRunAt: string | null;
  lastError: string | null;
};

function mapConfig(raw: ApiRecord): AnalyticsJobConfig {
  return {
    id: String(raw.id ?? raw.Id),
    tenantId: (raw.tenantId ?? raw.TenantId) != null ? String(raw.tenantId ?? raw.TenantId) : null,
    incrementalRollupEnabled: Boolean(raw.incrementalRollupEnabled ?? raw.IncrementalRollupEnabled),
    incrementalRollupIntervalMinutes: Number(raw.incrementalRollupIntervalMinutes ?? raw.IncrementalRollupIntervalMinutes ?? 5),
    dailyBatchEnabled: Boolean(raw.dailyBatchEnabled ?? raw.DailyBatchEnabled),
    dailyBatchTimesUtc: (raw.dailyBatchTimesUtc ?? raw.DailyBatchTimesUtc ?? []) as string[],
    kpiTrendScanEnabled: Boolean(raw.kpiTrendScanEnabled ?? raw.KpiTrendScanEnabled),
    kpiTrendIntervalMinutes: Number(raw.kpiTrendIntervalMinutes ?? raw.KpiTrendIntervalMinutes ?? 30),
    slaPredictorEnabled: Boolean(raw.slaPredictorEnabled ?? raw.SlaPredictorEnabled),
    slaPredictorIntervalMinutes: Number(raw.slaPredictorIntervalMinutes ?? raw.SlaPredictorIntervalMinutes ?? 5),
    dashboardCacheTtlSeconds: Number(raw.dashboardCacheTtlSeconds ?? raw.DashboardCacheTtlSeconds ?? 30),
    updatedAt: String(raw.updatedAt ?? raw.UpdatedAt ?? ''),
    updatedBy: (raw.updatedBy ?? raw.UpdatedBy) != null ? String(raw.updatedBy ?? raw.UpdatedBy) : null,
  };
}

function mapStatusItem(raw: ApiRecord): AnalyticsJobStatusItem {
  return {
    jobKey: String(raw.jobKey ?? raw.JobKey),
    enabled: Boolean(raw.enabled ?? raw.Enabled),
    lastRunAt: (raw.lastRunAt ?? raw.LastRunAt) ? String(raw.lastRunAt ?? raw.LastRunAt) : null,
    lastDurationMs: (raw.lastDurationMs ?? raw.LastDurationMs) != null
      ? Number(raw.lastDurationMs ?? raw.LastDurationMs)
      : null,
    nextRunAt: (raw.nextRunAt ?? raw.NextRunAt) ? String(raw.nextRunAt ?? raw.NextRunAt) : null,
    lastError: (raw.lastError ?? raw.LastError) ? String(raw.lastError ?? raw.LastError) : null,
  };
}

export function useAnalyticsJobConfig(options?: QueryHookOptions) {
  return useAuthenticatedQuery<AnalyticsJobConfig>(
    ['analytics-jobs', 'config'],
    '/api/v1/admin/analytics-jobs/config',
    {
      ...options,
      select: (data) => mapConfig(data as ApiRecord),
    },
  );
}

export function useAnalyticsJobStatus(options?: QueryHookOptions) {
  return useAuthenticatedQuery<AnalyticsJobStatusItem[]>(
    ['analytics-jobs', 'status'],
    '/api/v1/admin/analytics-jobs/status',
    {
      refetchInterval: 15_000,
      ...options,
      select: (data) => {
        const jobs = (data as ApiRecord)?.jobs ?? (data as ApiRecord)?.Jobs ?? [];
        return (jobs as ApiRecord[]).map(mapStatusItem);
      },
    },
  );
}

export type PatchAnalyticsJobConfigInput = {
  incrementalRollupEnabled?: boolean;
  incrementalRollupIntervalMinutes?: number;
  dailyBatchEnabled?: boolean;
  dailyBatchTimesUtc?: string[];
  kpiTrendScanEnabled?: boolean;
  kpiTrendIntervalMinutes?: number;
  slaPredictorEnabled?: boolean;
  slaPredictorIntervalMinutes?: number;
  dashboardCacheTtlSeconds?: number;
};

export function usePatchAnalyticsJobConfig() {
  return useAuthenticatedMutation<AnalyticsJobConfig, PatchAnalyticsJobConfigInput>(
    (token, body) =>
      apiFetch('/api/v1/admin/analytics-jobs/config', {
        method: 'PATCH',
        token,
        body: JSON.stringify(body),
      }).then((data) => mapConfig(data as ApiRecord)),
  );
}

export function useRunAnalyticsJob() {
  return useAuthenticatedMutation<{ jobKey: string; message: string }, string>(
    (token, jobKey) =>
      apiFetch(`/api/v1/admin/analytics-jobs/${encodeURIComponent(jobKey)}/run-now`, {
        method: 'POST',
        token,
      }) as Promise<{ jobKey: string; message: string }>,
  );
}

export const ANALYTICS_JOB_LABELS: Record<string, string> = {
  'incremental-rollup': 'Incremental rollup',
  'daily-batch': 'Daily batch',
  'kpi-trend-scan': 'KPI trend scan',
  'sla-predictor-scan': 'SLA predictor scan',
};

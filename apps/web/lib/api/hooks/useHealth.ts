import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, API_BASE } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';
import type { HealthSnapshot, ServiceHealthEntry, ServiceStatus } from '@lotris/types';

function mapDependencyStatus(status: string | undefined): ServiceStatus {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'healthy' || normalized === 'up') return 'UP';
  if (normalized === 'degraded') return 'DEGRADED';
  return 'DOWN';
}

function formatDependencyName(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toServiceEntry(
  id: string,
  dep: { status?: string; description?: string | null; durationMs?: number | null },
): ServiceHealthEntry {
  return {
    id,
    name: formatDependencyName(id),
    sub: dep.description ?? '—',
    status: mapDependencyStatus(dep.status),
    cpu: 0,
    memUsedMb: 0,
    memTotalMb: 0,
    uptimeSeconds: 0,
    lastPingMs: dep.durationMs ?? 0,
    checkedAt: new Date().toISOString(),
  };
}

function mapServiceRow(row: ApiRecord): ServiceHealthEntry {
  return {
    id: String(row.id ?? row.Id),
    name: String(row.name ?? row.Name ?? row.id ?? row.Id),
    sub: String(row.sub ?? row.Sub ?? '—'),
    status: (row.status ?? row.Status ?? 'DOWN') as ServiceStatus,
    cpu: Number(row.cpu ?? row.Cpu ?? 0),
    memUsedMb: Number(row.memUsedMb ?? row.MemUsedMb ?? 0),
    memTotalMb: Number(row.memTotalMb ?? row.MemTotalMb ?? 0),
    uptimeSeconds: Number(row.uptimeSeconds ?? row.UptimeSeconds ?? 0),
    lastPingMs: Number(row.lastPingMs ?? row.LastPingMs ?? 0),
    checkedAt: typeof (row.checkedAt ?? row.CheckedAt) === 'string'
      ? (row.checkedAt ?? row.CheckedAt)
      : new Date().toISOString(),
  };
}

function mapQueueRow(row: ApiRecord) {
  return {
    name: String(row.name ?? row.Name),
    sub: String(row.sub ?? row.Sub ?? ''),
    waiting: Number(row.waiting ?? row.Waiting ?? 0),
    active: Number(row.active ?? row.Active ?? 0),
    failed: Number(row.failed ?? row.Failed ?? 0),
    delayed: Number(row.delayed ?? row.Delayed ?? 0),
    completedLastHour: Number(row.completedLastHour ?? row.CompletedLastHour ?? 0),
  };
}

/** Normalize C# snapshot, readiness fallback, or legacy NestJS payload. */
export function mapToHealthSnapshot(raw: ApiRecord): HealthSnapshot {
  const serviceRows = raw?.services ?? raw?.Services;
  const queueRows = raw?.queues ?? raw?.Queues;
  const timestamp = raw?.timestamp ?? raw?.Timestamp;

  if (Array.isArray(serviceRows)) {
    return {
      services: serviceRows.map(mapServiceRow),
      queues: Array.isArray(queueRows) ? queueRows.map(mapQueueRow) : [],
      timestamp: typeof timestamp === 'string' ? timestamp : new Date().toISOString(),
    };
  }

  if (raw?.dependencies && typeof raw.dependencies === 'object') {
    const services = Object.entries(raw.dependencies as Record<string, ApiRecord>).map(
      ([key, dep]) => toServiceEntry(key, dep),
    );
    return {
      services,
      queues: [],
      timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
    };
  }

  return { services: [], queues: [], timestamp: new Date().toISOString() };
}

export function useHealthSnapshot(options?: QueryHookOptions) {
  const result = useAuthenticatedQuery<ApiRecord>(
    ['health', 'snapshot'],
    '/health/snapshot',
    options,
  );

  return {
    ...result,
    data: result.data ? mapToHealthSnapshot(result.data) : undefined,
  };
}

export function useHealthIncidents(params?: { limit?: number }, options?: QueryHookOptions) {
  const limit = params?.limit ?? 20;
  return useAuthenticatedQuery<ApiRecord[]>(
    ['health', 'incidents', limit],
    `/health/incidents?limit=${limit}`,
    { initialData: [], refetchInterval: options?.refetchInterval, ...options },
  );
}

export function useStoreHealth(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['health', 'store'],
    '/health/store',
    options,
  );
}

export function useRepairStore() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, void>(
    (token) => apiFetch('/health/store/repair', { method: 'POST', token }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['health', 'store'] }) },
  );
}

export function useRestartService() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<
    { queued: boolean; cooldownSeconds?: number | null; error?: string | null },
    { serviceName: string }
  >(
    (token, { serviceName }) =>
      apiFetch(`/health/restart/${encodeURIComponent(serviceName)}`, { method: 'POST', token }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['health', 'incidents'] }) },
  );
}

export function healthSseUrl() {
  return `${API_BASE}/health/sse`;
}

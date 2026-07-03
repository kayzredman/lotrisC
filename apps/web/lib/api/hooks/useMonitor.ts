import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { QueryHookOptions } from './query-utils';

export interface MonitorStats {
  totalOpen: number;
  slaBreach: number;
  resolved24h: number;
  totalActive?: number;
  teams: Array<{ teamName: string; open: number; inProgress: number; escalated: number }>;
  topTickets: Array<{ id: string; title: string; priority: number; teamName: string; status: string }>;
}

/** Public monitor wall — no auth required */
export function useMonitorStats(options?: QueryHookOptions) {
  return useQuery<MonitorStats>({
    queryKey: ['monitor', 'stats'],
    queryFn: () => apiFetch<MonitorStats>('/api/v1/monitor/stats'),
    refetchInterval: options?.refetchInterval ?? 30_000,
    ...options,
  } as Omit<UseQueryOptions<MonitorStats>, 'queryKey' | 'queryFn'>);
}

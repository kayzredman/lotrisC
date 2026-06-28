import { useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export interface AuditLogListParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: string;
}

function buildQuery(params?: AuditLogListParams) {
  if (!params) return '';
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.action) q.set('action', params.action);
  if (params.entityType) q.set('entityType', params.entityType);
  if (params.userId) q.set('userId', params.userId);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function useAuditLogsList(params?: AuditLogListParams, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[] | { items?: ApiRecord[] }>(
    ['audit-logs', 'list', params],
    `/api/v1/audit-logs${buildQuery(params)}`,
    options,
  );
}

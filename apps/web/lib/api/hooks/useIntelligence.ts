import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useIntelligenceConfig(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord>(
    ['intelligence', 'config'],
    '/api/v1/admin/intelligence',
    options,
  );
}

export function useAiProviders(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['intelligence', 'ai-providers'],
    '/api/v1/admin/intelligence/ai-providers',
    options,
  );
}

export function useUpdateIntelligenceConfig() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, ApiRecord>(
    (token, body) => apiFetch('/api/v1/admin/intelligence', { method: 'PUT', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['intelligence', 'config'] }) },
  );
}

export function useConnectAiProvider() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, { provider: string; username: string; password: string }>(
    (token, body) => apiFetch('/api/v1/admin/intelligence/connect-provider', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['intelligence', 'config'] }) },
  );
}

export function useTestAiConnection() {
  return useAuthenticatedMutation<ApiRecord, void>(
    (token) => apiFetch('/api/v1/admin/intelligence/test-connection', { method: 'POST', token }),
  );
}

export function useConnectEntra() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, { entraTenantId: string }>(
    (token, body) => apiFetch('/api/v1/admin/intelligence/connect-entra', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['intelligence', 'config'] }) },
  );
}

export function useConnectEntraDev() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<ApiRecord, void>(
    (token) => apiFetch('/api/v1/admin/intelligence/connect-entra/dev', { method: 'POST', token }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['intelligence', 'config'] }) },
  );
}

export function useKnowledgeQuery() {
  return useAuthenticatedMutation<ApiRecord, { query: string; topK?: number }>(
    (token, body) => apiFetch('/api/v1/intelligence/knowledge/query', { method: 'POST', token, body }),
  );
}

export function useKnowledgeSearch(q: string, options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['knowledge', 'search', q],
    `/api/v1/intelligence/knowledge/search?q=${encodeURIComponent(q)}`,
    { enabled: q.length >= 2 && (options?.enabled ?? true), ...options },
  );
}

export function useRcaSuggest() {
  return useAuthenticatedMutation<ApiRecord, { rcaId: string }>(
    (token, { rcaId }) => apiFetch(`/api/v1/rca/${rcaId}/suggest`, { method: 'POST', token }),
  );
}

import { useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useKnownErrors(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['knowledge', 'known-errors'],
    '/api/v1/knowledge/known-errors',
    options,
  );
}

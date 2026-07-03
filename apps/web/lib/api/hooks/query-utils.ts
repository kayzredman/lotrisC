import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiRecord = any;

export type QueryHookOptions = Omit<UseQueryOptions<ApiRecord>, 'queryKey' | 'queryFn'>;
export type MutationHookOptions<TData, TVariables> = UseMutationOptions<TData, Error, TVariables>;

export function useAuthenticatedQuery<T = ApiRecord>(
  queryKey: unknown[],
  path: string,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
  const { accessToken } = useAuth();
  return useQuery<T>({
    queryKey,
    queryFn: () => apiFetch<T>(path, { token: accessToken }),
    enabled: !!accessToken && (options?.enabled ?? true),
    ...options,
  });
}

export function useAuthenticatedMutation<TData, TVariables>(
  mutationFn: (token: string, variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  const { accessToken } = useAuth();
  return useMutation<TData, Error, TVariables>({
    ...options,
    mutationFn: (variables) => {
      if (!accessToken) throw new Error('Not authenticated');
      return mutationFn(accessToken, variables);
    },
  });
}

export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return (queryKey: unknown[]) => queryClient.invalidateQueries({ queryKey });
}

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuth, type CurrentUser, type RegisterPayload } from '@/lib/auth/auth-context';
import { useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export function useCurrentUser(options?: QueryHookOptions) {
  const { accessToken } = useAuth();
  return useAuthenticatedQuery<CurrentUser>(
    ['users', 'me'],
    '/api/v1/users/me',
    {
      staleTime: options?.staleTime ?? 60_000,
      enabled: options?.enabled,
    },
  );
}

export function useLogin() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
  });
}

export function useRegister() {
  const { register } = useAuth();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
  });
}

export function useUsersList(options?: QueryHookOptions) {
  return useAuthenticatedQuery<ApiRecord[]>(
    ['users', 'list'],
    '/api/v1/admin/users',
    {
      staleTime: options?.staleTime ?? 60_000,
      enabled: options?.enabled,
    },
  );
}

export function useLogout() {
  const { logout } = useAuth();
  return logout;
}

export async function fetchCurrentUser(token: string) {
  return apiFetch<CurrentUser>('/api/v1/users/me', { token });
}

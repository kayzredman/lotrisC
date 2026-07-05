import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from './lotris-api';
import type { AuthResponse, AuthSession, CurrentUser } from './types';

const TOKEN_KEY = 'lotris_access_token';

interface AuthContextValue {
  accessToken: string | null;
  session: AuthSession | null;
  user: CurrentUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (token?: string | null) => {
    const active = token ?? accessToken;
    if (!active) {
      setUser(null);
      return;
    }
    const profile = await apiFetch<CurrentUser>('/api/v1/users/me', { token: active });
    setUser(profile);
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await loadToken();
      if (cancelled) return;

      if (!stored) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await apiFetch<CurrentUser>('/api/v1/users/me', { token: stored });
        if (cancelled) return;
        setAccessToken(stored);
        setSession(decodeSession(stored));
        setUser(profile);
      } catch {
        await clearToken();
        if (!cancelled) {
          setAccessToken(null);
          setSession(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const auth = await apiFetch<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    await saveToken(auth.accessToken);
    setAccessToken(auth.accessToken);
    setSession(auth.session);
    await refreshUser(auth.accessToken);
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await clearToken();
    setAccessToken(null);
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      session,
      user,
      isLoading,
      login,
      logout,
      refreshUser: () => refreshUser(),
    }),
    [accessToken, session, user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

function decodeSession(token: string): AuthSession | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<
      string,
      string | undefined
    >;
    if (!json.sub) return null;
    const role =
      json.role ??
      json['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
      '';
    return {
      userId: json.sub,
      tenantId: json.tenant_id ?? '',
      role,
      email: json.email ?? '',
      fullName: json.full_name ?? '',
    };
  } catch {
    return null;
  }
}

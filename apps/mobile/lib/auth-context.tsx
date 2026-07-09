import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, API_BASE, setAuthRefreshHandler } from './lotris-api';
import type { AuthResponse, AuthSession, CurrentUser } from './types';

const ACCESS_TOKEN_KEY = 'lotris_access_token';
const REFRESH_TOKEN_KEY = 'lotris_refresh_token';

interface AuthContextValue {
  accessToken: string | null;
  session: AuthSession | null;
  user: CurrentUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function loadRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = useCallback(async () => {
    await clearTokens();
    setAccessToken(null);
    setSession(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (token?: string | null) => {
    const active = token ?? accessToken;
    if (!active) {
      setUser(null);
      return;
    }
    const profile = await apiFetch<CurrentUser>('/api/v1/users/me', { token: active });
    setUser(profile);
  }, [accessToken]);

  const applyAuth = useCallback(async (auth: AuthResponse) => {
    await Promise.all([saveToken(auth.accessToken), saveRefreshToken(auth.refreshToken)]);
    setAccessToken(auth.accessToken);
    setSession(auth.session ?? decodeSession(auth.accessToken));
    await refreshUser(auth.accessToken);
  }, [refreshUser]);

  const refreshSession = useCallback(async (tokenOverride?: string | null) => {
    const refreshToken = tokenOverride ?? await loadRefreshToken();
    if (!refreshToken) {
      await clearAuthState();
      return null;
    }

    try {
      const auth = await apiFetch<AuthResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        skipAuthRefresh: true,
      });
      await applyAuth(auth);
      return auth.accessToken;
    } catch {
      await clearAuthState();
      return null;
    }
  }, [applyAuth, clearAuthState]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await loadToken();
      const storedRefresh = await loadRefreshToken();
      if (cancelled) return;

      if (!stored && !storedRefresh) {
        setIsLoading(false);
        return;
      }

      try {
        if (!stored) {
          const nextAccessToken = await refreshSession(storedRefresh);
          if (cancelled) return;
          if (!nextAccessToken) {
            setIsLoading(false);
            return;
          }
        } else {
          const profile = await apiFetch<CurrentUser>('/api/v1/users/me', {
            token: stored,
            skipAuthRefresh: true,
          });
          if (cancelled) return;
          setAccessToken(stored);
          setSession(decodeSession(stored));
          setUser(profile);
        }
      } catch {
        if (storedRefresh) {
          const nextAccessToken = await refreshSession(storedRefresh);
          if (cancelled) return;
          if (!nextAccessToken && !cancelled) {
            await clearAuthState();
          }
        } else {
          await clearAuthState();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearAuthState, refreshSession]);

  useEffect(() => {
    setAuthRefreshHandler(() => refreshSession());
    return () => setAuthRefreshHandler(null);
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const auth = await apiFetch<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuthRefresh: true,
    });
    await applyAuth(auth);
  }, [applyAuth]);

  const loginWithMicrosoft = useCallback(async () => {
    const redirectUrl = Linking.createURL('/auth/callback');
    const authUrl = `${API_BASE}/api/v1/auth/microsoft/login?returnUrl=${encodeURIComponent(redirectUrl)}`;
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

    if (result.type !== 'success' || !result.url) {
      throw new Error(result.type === 'cancel' ? 'Microsoft sign-in cancelled.' : 'Microsoft sign-in did not complete.');
    }

    const query = Linking.parse(result.url).queryParams ?? {};
    const microsoftError = asSingleQueryValue(query.microsoft_error);
    if (microsoftError) {
      throw new Error(microsoftError);
    }

    const accessToken = asSingleQueryValue(query.access_token);
    const refreshToken = asSingleQueryValue(query.refresh_token);
    const expiresAt = asSingleQueryValue(query.expires_at);
    const session = accessToken ? decodeSession(accessToken) : null;

    if (!accessToken || !refreshToken || !expiresAt || !session) {
      throw new Error('Microsoft sign-in response was incomplete.');
    }

    await applyAuth({ accessToken, refreshToken, expiresAt, session });
  }, [applyAuth]);

  const logout = useCallback(async () => {
    const refreshToken = await loadRefreshToken();
    try {
      if (refreshToken) {
        await apiFetch('/api/v1/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          skipAuthRefresh: true,
        });
      }
    } finally {
      await clearAuthState();
    }
  }, [clearAuthState]);

  const value = useMemo(
    () => ({
      accessToken,
      session,
      user,
      isLoading,
      login,
      loginWithMicrosoft,
      logout,
      refreshUser: () => refreshUser(),
    }),
    [accessToken, session, user, isLoading, login, loginWithMicrosoft, logout, refreshUser],
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

function asSingleQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

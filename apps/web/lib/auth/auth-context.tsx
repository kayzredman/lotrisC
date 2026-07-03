'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from '@/lib/api/client';

export const TOKEN_KEY = 'lotris_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export interface AuthSession {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  fullName: string;
}

export interface CurrentUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  teamId: string | null;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  tenantName?: string;
  tenantSlug?: string;
  roleId?: number;
}

interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  session: {
    userId: string;
    tenantId: string;
    role: string;
    email: string;
    fullName: string;
  };
}

interface AuthContextValue {
  accessToken: string | null;
  session: AuthSession | null;
  user: CurrentUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function setTokenCookie(token: string) {
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearTokenCookie() {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

function decodeJwtSession(token: string): AuthSession | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, string>;
    const role =
      json['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      ?? json.role
      ?? '';
    return {
      userId: json.sub ?? '',
      tenantId: json.tenant_id ?? '',
      role,
      email: json.email ?? '',
      fullName: json.full_name ?? '',
    };
  } catch {
    return null;
  }
}

function mapSession(response: AuthResponse): AuthSession {
  return {
    userId: response.session.userId,
    tenantId: response.session.tenantId,
    role: String(response.session.role),
    email: response.session.email,
    fullName: response.session.fullName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = useCallback((token: string, authSession?: AuthSession) => {
    localStorage.setItem(TOKEN_KEY, token);
    setTokenCookie(token);
    setAccessToken(token);
    setSession(authSession ?? decodeJwtSession(token));
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    clearTokenCookie();
    setAccessToken(null);
    setSession(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      clearAuth();
      return;
    }

    try {
      const profile = await apiFetch<CurrentUser>('/api/v1/users/me', { token });
      setUser(profile);
      setAccessToken(token);
      setSession(decodeJwtSession(token));
    } catch {
      clearAuth();
    }
  }, [clearAuth]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    applyToken(token);
    void refreshUser().finally(() => setIsLoading(false));
  }, [applyToken, refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    applyToken(response.accessToken, mapSession(response));
    await refreshUser();
  }, [applyToken, refreshUser]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await apiFetch<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: {
        email: payload.email,
        password: payload.password,
        fullName: payload.fullName,
        tenantName: payload.tenantName,
        tenantSlug: payload.tenantSlug,
        role: payload.roleId ?? 5,
      },
    });
    applyToken(response.accessToken, mapSession(response));
    await refreshUser();
  }, [applyToken, refreshUser]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      session,
      user,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [accessToken, session, user, isLoading, login, register, logout, refreshUser],
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

import Constants from 'expo-constants';

const LAN_FALLBACK = 'http://192.168.100.51:5153';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  LAN_FALLBACK;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  skipAuthRefresh?: boolean;
  _retryWithFreshToken?: boolean;
}

let authRefreshHandler: (() => Promise<string | null>) | null = null;

export function setAuthRefreshHandler(handler: (() => Promise<string | null>) | null) {
  authRefreshHandler = handler;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { method = 'GET', body, token, skipAuthRefresh = false, _retryWithFreshToken = false } = options;
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (
    res.status === 401 &&
    token &&
    !skipAuthRefresh &&
    !_retryWithFreshToken &&
    authRefreshHandler
  ) {
    const freshToken = await authRefreshHandler();
    if (freshToken && freshToken !== token) {
      return apiFetch<T>(path, { ...options, token: freshToken, _retryWithFreshToken: true });
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let message = text || `Request failed: ${res.status}`;
    try {
      const json = JSON.parse(text) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      // keep raw text
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }

  return undefined as T;
}

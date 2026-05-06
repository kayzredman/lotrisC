'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

type SseStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseEventSourceOptions {
  /** Set to false to pause the connection */
  enabled?: boolean;
  /** Auto-reconnect delay in ms (default 3000) */
  reconnectDelay?: number;
}

interface UseEventSourceResult<T> {
  data: T | null;
  status: SseStatus;
  error: string | null;
  reconnect: () => void;
}

/**
 * useEventSource — subscribes to an SSE endpoint using fetch (to support
 * Authorization headers, which native EventSource doesn't allow).
 *
 * Sends the Clerk JWT as a Bearer token and parses each `data:` event line
 * as JSON of type T.
 *
 * Usage:
 *   const { data, status } = useEventSource<HealthSnapshot>('/health/sse');
 */
export function useEventSource<T>(
  url: string,
  options: UseEventSourceOptions = {},
): UseEventSourceResult<T> {
  const { enabled = true, reconnectDelay = 3000 } = options;
  const { getToken } = useAuth();

  const [data, setData]     = useState<T | null>(null);
  const [status, setStatus] = useState<SseStatus>('connecting');
  const [error, setError]   = useState<string | null>(null);

  const abortRef        = useRef<AbortController | null>(null);
  const reconnectTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef      = useRef(true);

  const connect = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    // Cancel previous connection
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStatus('connecting');
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setStatus('error');
        setError('Not authenticated');
        return;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const response = await fetch(`${apiBase}/${url.replace(/^\//, '')}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('SSE response has no body');
      }

      setStatus('connected');

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (mountedRef.current) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6)) as T;
              if (mountedRef.current) setData(parsed);
            } catch {
              // malformed JSON — skip
            }
          }
        }
      }

      if (mountedRef.current) {
        setStatus('disconnected');
        // Auto-reconnect
        reconnectTimer.current = setTimeout(connect, reconnectDelay);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error && err.name === 'AbortError'
        ? null
        : String(err);
      if (msg) {
        setError(msg);
        setStatus('error');
        reconnectTimer.current = setTimeout(connect, reconnectDelay);
      }
    }
  }, [url, enabled, reconnectDelay, getToken]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    connect();
  }, [connect]);

  return { data, status, error, reconnect };
}
